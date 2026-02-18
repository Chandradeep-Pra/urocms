"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  Layers,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

/* ───────── TYPES ───────── */

type NodeType = "GROUP" | "TEST";

interface ChapterNode {
  id: string;
  title: string;
  nodeType: NodeType;
  parentId?: string | null;
  order: number;
  difficulty?: "easy" | "medium" | "hard";
  isPremium?: boolean;
  estimatedTimeMin?: number;
}

/* ───────── COMPONENT ───────── */

export default function ChaptersPage() {
  const [chapters, setChapters] = useState<ChapterNode[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editNode, setEditNode] = useState<ChapterNode | null>(null);

  const [form, setForm] = useState<ChapterNode>({
    id: "",
    title: "",
    nodeType: "TEST",
    parentId: null,
    order: 1,
    difficulty: "medium",
    isPremium: false,
    estimatedTimeMin: 30,
  });

  /* ───────── FETCH ───────── */

  const fetchChapters = async () => {
    setLoading(true);
    const res = await fetch("/api/chapters");
    const data = await res.json();
    setChapters(data.chapters || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchChapters();
  }, []);

  /* ───────── CREATE / UPDATE ───────── */

  const handleSave = async () => {
    if (!form.id || !form.title) {
      toast.error("ID & title required");
      return;
    }

    const method = editNode ? "PUT" : "POST";
    const url = editNode
      ? `/api/chapters/${editNode.id}`
      : "/api/chapters";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    toast.success(editNode ? "Updated" : "Created");

    setDialogOpen(false);
    setEditNode(null);
    fetchChapters();
  };

  /* ───────── DELETE ───────── */

  const handleDelete = async (id: string) => {
    await fetch(`/api/chapters/${id}`, { method: "DELETE" });
    toast.success("Deleted");
    fetchChapters();
  };

  /* ───────── TREE HELPERS ───────── */

  const rootNodes = chapters
    .filter((c) => !c.parentId)
    .sort((a, b) => a.order - b.order);

  const getChildren = (parentId: string) =>
    chapters
      .filter((c) => c.parentId === parentId)
      .sort((a, b) => a.order - b.order);

  /* ───────── UI ───────── */

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-10">
      <div className="max-w-6xl mx-auto space-y-4">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">
              Section 1 Structure
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Manage chapter hierarchy & structured tests
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-teal-600 hover:bg-teal-700 text-white"
                onClick={() => {
                  setEditNode(null);
                  setForm({
                    id: "",
                    title: "",
                    nodeType: "TEST",
                    parentId: null,
                    order: 1,
                    difficulty: "medium",
                    isPremium: false,
                    estimatedTimeMin: 30,
                  });
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Node
              </Button>
            </DialogTrigger>

            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editNode ? "Edit Node" : "Create Node"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <Input
                  placeholder="Unique ID (renal-cancer)"
                  value={form.id}
                  disabled={!!editNode}
                  onChange={(e) =>
                    setForm({ ...form, id: e.target.value })
                  }
                />

                <Input
                  placeholder="Title"
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                />

                <Select
                  value={form.nodeType}
                  onValueChange={(v: any) =>
                    setForm({ ...form, nodeType: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GROUP">Group</SelectItem>
                    <SelectItem value="TEST">Test</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={form.parentId || "none"}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      parentId: v === "none" ? null : v,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Parent (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Parent</SelectItem>
                    {chapters
                      .filter((c) => c.nodeType === "GROUP")
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                {form.nodeType === "TEST" && (
                  <>
                    <Select
                      value={form.difficulty}
                      onValueChange={(v: any) =>
                        setForm({ ...form, difficulty: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>

                    <Input
                      type="number"
                      placeholder="Estimated Time (min)"
                      value={form.estimatedTimeMin}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          estimatedTimeMin: Number(e.target.value),
                        })
                      }
                    />

                    <div className="flex items-center justify-between">
                      <span>Premium</span>
                      <Switch
                        checked={form.isPremium}
                        onCheckedChange={(v) =>
                          setForm({ ...form, isPremium: v })
                        }
                      />
                    </div>
                  </>
                )}

                <Button
                  onClick={handleSave}
                  className="w-full bg-teal-600 text-white"
                >
                  {editNode ? "Update" : "Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="text-center py-20 text-slate-400">
            Loading structure...
          </div>
        )}

        {/* TREE */}
        {!loading && rootNodes.map((node) => {
          const children = getChildren(node.id);
          const isOpen = expanded === node.id;

          if (node.nodeType === "TEST") {
            return (
              <TestCard
                key={node.id}
                node={node}
                onEdit={() => {
                  setEditNode(node);
                  setForm(node);
                  setDialogOpen(true);
                }}
                onDelete={() => handleDelete(node.id)}
              />
            );
          }

          return (
            <motion.div
              key={node.id}
              layout
              className="rounded-3xl border bg-white shadow-sm"
            >
              <button
                onClick={() =>
                  setExpanded(isOpen ? null : node.id)
                }
                className="w-full flex items-center justify-between p-6"
              >
                <div className="flex items-center gap-4">
                  <Layers className="h-5 w-5 text-indigo-600" />
                  <span className="font-semibold">
                    {node.title}
                  </span>
                </div>

                <motion.div
                  animate={{ rotate: isOpen ? 90 : 0 }}
                >
                  <ChevronRight />
                </motion.div>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-6 space-y-4"
                  >
                    {children.map((child) => (
                      <TestCard
                        key={child.id}
                        node={child}
                        onEdit={() => {
                          setEditNode(child);
                          setForm(child);
                          setDialogOpen(true);
                        }}
                        onDelete={() =>
                          handleDelete(child.id)
                        }
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────── TEST CARD COMPONENT ───────── */

function TestCard({
  node,
  onEdit,
  onDelete,
}: {
  node: ChapterNode;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md transition">
      <div>
        <h4 className="font-medium">{node.title}</h4>

        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
          {node.difficulty && (
            <Badge variant="outline">{node.difficulty}</Badge>
          )}

          {node.isPremium && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200">
              Premium
            </Badge>
          )}

          {node.estimatedTimeMin && (
            <span>{node.estimatedTimeMin} min</span>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="icon" variant="ghost" onClick={onEdit}>
          <Edit className="h-4 w-4" />
        </Button>

        <Button size="icon" variant="ghost" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
