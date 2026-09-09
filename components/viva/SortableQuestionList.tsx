"use client";

import { useState } from "react";
import { closestCenter, DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VivaQuestionConfig } from "@/components/viva/types";

type QuestionItem = { question: VivaQuestionConfig; index: number };
interface Props {
  items: QuestionItem[];
  activeQuestionId?: string;
  disabled: boolean;
  onSelect: (index: number) => void;
  onMove: (id: string, targetIndex: number) => void;
  onDelete: (id: string) => void;
}

function QuestionSummary({ question, index }: QuestionItem) {
  return <>
    <p className="text-sm font-medium text-slate-800">Question {index + 1}</p>
    <p className="mt-2 text-xs text-slate-500">{question.linkedExhibitIds.length} exhibits linked, {question.answerKeywords.length} keywords</p>
    <p className="mt-2 line-clamp-2 text-xs text-slate-700">{question.question}</p>
  </>;
}

function SortableQuestion({ item, selected, disabled, onSelect, onDelete }: {
  item: QuestionItem; selected: boolean; disabled: boolean;
  onSelect: Props["onSelect"]; onDelete: Props["onDelete"];
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.question.id, disabled });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative rounded-2xl border p-3 ${isDragging ? "border-dashed border-teal-500 bg-teal-50 ring-2 ring-teal-200" : selected ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-slate-50"}`}
    >
      {isDragging && <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-teal-700">Place question here</div>}
      <div className={isDragging ? "pointer-events-none opacity-0" : ""}>
        <div className="mb-2 flex items-center justify-between">
          <Button
            ref={setActivatorNodeRef} type="button" variant="ghost" size="icon-sm"
            className="touch-none cursor-grab text-slate-500 active:cursor-grabbing"
            disabled={disabled} {...attributes} {...listeners}
            aria-label={`Reorder question ${item.index + 1}`}
            title="Drag to reorder, or press Space and use arrow keys"
          ><GripVertical className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" size="icon-sm" disabled={disabled}
            aria-label={`Delete question ${item.index + 1}`} title="Delete question"
            className="text-slate-500 hover:bg-red-50 hover:text-red-600"
            onClick={() => onDelete(item.question.id)}
          ><Trash2 className="h-4 w-4" /></Button>
        </div>
        <button type="button" className="w-full text-left" onClick={() => onSelect(item.index)}>
          <QuestionSummary {...item} />
        </button>
      </div>
    </div>
  );
}

export function SortableQuestionList({ items, activeQuestionId, disabled, onSelect, onMove, onDelete }: Props) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const draggedItem = items.find(item => item.question.id === draggedId);
  return (
    <DndContext
      sensors={sensors} collisionDetection={closestCenter}
      autoScroll={{ threshold: { x: 0, y: 0.2 }, acceleration: 10, canScroll: element => element !== document.scrollingElement }}
      onDragStart={({ active }) => setDraggedId(String(active.id))}
      onDragCancel={() => setDraggedId(null)}
      onDragEnd={({ active, over }) => {
        setDraggedId(null);
        if (disabled || !over || active.id === over.id) return;
        const target = items.find(item => item.question.id === over.id);
        if (target) onMove(String(active.id), target.index);
      }}
    >
      <SortableContext items={items.map(item => item.question.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 p-1">
          {items.map(item => <SortableQuestion key={item.question.id} item={item}
            selected={activeQuestionId === item.question.id} disabled={disabled}
            onSelect={onSelect} onDelete={onDelete} />)}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={{ duration: 180, easing: "ease-out" }}>
        {draggedItem ? <div className="cursor-grabbing rounded-2xl border border-teal-500 bg-white p-3 shadow-xl ring-2 ring-teal-200">
          <GripVertical className="mb-2 h-4 w-4 text-teal-600" />
          <QuestionSummary {...draggedItem} />
        </div> : null}
      </DragOverlay>
    </DndContext>
  );
}


