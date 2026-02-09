"use client";

type Props = {
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDeleteModal({
  onCancel,
  onConfirm,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-xl bg-zinc-900
                      border border-white/10 p-5">
        <h2 className="text-lg font-semibold mb-2">
          Delete folder?
        </h2>
        <p className="text-sm text-zinc-400 mb-5">
          This will also delete all subfolders inside it.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="text-sm text-zinc-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-500 px-4 py-2
                       text-sm font-medium text-white"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
