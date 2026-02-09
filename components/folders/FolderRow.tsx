"use client";

import { useState } from "react";

type Folder = {
  id: string;
  name: string;
  parentId: string | null;
  itemCount: number;
};

type Props = {
  folder: Folder;
  allFolders: Folder[];
  level: number;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
};

export default function FolderRow({
  folder,
  allFolders,
  level,
  onRename,
  onDelete,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(folder.name);

  const children = allFolders.filter(
    f => f.parentId === folder.id
  );

  function submitRename() {
    if (name.trim() && name !== folder.name) {
      onRename(folder.id, name.trim());
    }
    setEditing(false);
  }

  return (
    <>
      <div
        className="flex items-center justify-between px-4 py-3 text-sm
                   hover:bg-white/5 transition"
        style={{ paddingLeft: `${level * 20 + 16}px` }}
      >
        <div className="flex items-center gap-2">
          📁
          {editing ? (
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={submitRename}
              onKeyDown={e => {
                if (e.key === "Enter") submitRename();
                if (e.key === "Escape") setEditing(false);
              }}
              className="rounded bg-black/40 border border-white/10
                         px-2 py-1 text-sm"
            />
          ) : (
            <>
              <span>{folder.name}</span>
              <span className="text-zinc-500">
                ({folder.itemCount})
              </span>
            </>
          )}
        </div>

        {!editing && (
          <div className="flex gap-3 text-zinc-400">
            <button
              onClick={() => setEditing(true)}
              className="hover:text-white"
            >
              Rename
            </button>
            <button
              onClick={() => onDelete(folder.id)}
              className="hover:text-red-400"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {children.map(child => (
        <FolderRow
          key={child.id}
          folder={child}
          allFolders={allFolders}
          level={level + 1}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}
