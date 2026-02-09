"use client";

import { useState } from "react";
import FolderRow from "./FolderRow";
import CreateFolderModal from "./CreateFodlerModal";
import ConfirmDeleteModal from "./ConfirmDeleteModal";


const initialFolders = [
  { id: "1", name: "Urology Basics", parentId: null, itemCount: 12 },
  { id: "2", name: "Renal", parentId: null, itemCount: 8 },
  { id: "3", name: "Stones", parentId: "2", itemCount: 5 },
  { id: "4", name: "Prostate", parentId: null, itemCount: 9 },
];

export default function FolderList() {
  const [folders, setFolders] = useState(initialFolders);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const rootFolders = folders.filter(f => f.parentId === null);

  function handleCreate(name: string, parentId: string | null) {
    setFolders(prev => [
      ...prev,
      { id: crypto.randomUUID(), name, parentId, itemCount: 0 },
    ]);
    setShowCreate(false);
  }

  function handleRename(id: string, newName: string) {
    setFolders(prev =>
      prev.map(f =>
        f.id === id ? { ...f, name: newName } : f
      )
    );
  }

  function handleDelete(id: string) {
    const idsToDelete = new Set<string>();

    function collect(targetId: string) {
      idsToDelete.add(targetId);
      folders
        .filter(f => f.parentId === targetId)
        .forEach(child => collect(child.id));
    }

    collect(id);

    setFolders(prev => prev.filter(f => !idsToDelete.has(f.id)));
    setDeleteTarget(null);
  }

  return (
    <>
      <div className="rounded-xl border border-white/10 bg-white/5">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-sm font-medium">Folders</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="text-sm text-cyan-400 hover:underline"
          >
            + New Folder
          </button>
        </div>

        <div className="divide-y divide-white/5">
          {rootFolders.map(folder => (
            <FolderRow
              key={folder.id}
              folder={folder}
              allFolders={folders}
              level={0}
              onRename={handleRename}
              onDelete={id => setDeleteTarget(id)}
            />
          ))}
        </div>
      </div>

      {showCreate && (
        <CreateFolderModal
          folders={folders}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => handleDelete(deleteTarget)}
        />
      )}
    </>
  );
}
