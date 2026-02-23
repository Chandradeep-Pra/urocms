"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  deleteId: string | null;
  setDeleteId: (id: string | null) => void;
  onDeleted: () => void;
}

export default function DeleteVideoDialog({
  deleteId,
  setDeleteId,
  onDeleted,
}: Props) {
  const handleDelete = async () => {
    if (!deleteId) return;

    await fetch(`/api/videos/videoItem/${deleteId}`, {
      method: "DELETE",
    });

    setDeleteId(null);
    onDeleted();
    toast.success("Video deleted");
  };

  return (
    <AnimatePresence>
      {deleteId && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-lg">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold">
                Delete Video
              </h2>
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              This action cannot be undone. The video will be permanently removed.
            </p>

            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setDeleteId(null)}
              >
                Cancel
              </Button>

              <Button
                variant="destructive"
                onClick={handleDelete}
              >
                Delete
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}