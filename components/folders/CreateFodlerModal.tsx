"use client";

import { useState } from "react";

type Folder = {
  id: string;
  name: string;
  parentId: string | null;
  itemCount: number;
};

type Props = {
  folders: Folder[];
  onClose: () => void;
  onCreate: (name: string, parentId: string | null) => void;
};

export default function CreateFolderModal({
  folders,
  onClose,
  onCreate,
}: Props) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    onCreate(name.trim(), parentId);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-xl bg-zinc-900 border border-white/10 p-5">
        <h2 className="text-lg font-semibold mb-4">
          Create Folder
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400">
              Folder name
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="mt-1 w-full rounded-lg bg-black/40
                         border border-white/10 px-3 py-2 text-sm"
              placeholder="e.g. Renal Anatomy"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400">
              Parent folder (optional)
            </label>
            <select
              value={parentId ?? ""}
              onChange={e =>
                setParentId(e.target.value || null)
              }
              className="mt-1 w-full rounded-lg bg-black/40
                         border border-white/10 px-3 py-2 text-sm"
            >
              <option value="">None (top-level)</option>
              {folders.map(folder => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-cyan-400 px-4 py-2
                         text-sm font-medium text-black"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
