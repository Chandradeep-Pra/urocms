"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import QuizBuilderPage from "@/components/dashboard/QuizBuilder";

interface Quiz {
  id: string;
  title: string;
  durationMinutes: number;
  bankIds: string[];
  createdAt?: any;
}

const MockTestsPage = () => {
  const [tests, setTests] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* ───────── LOAD QUIZZES ───────── */

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/quizzes");
      const data = await res.json();
      setTests(data.quizzes || []);
    } catch (err) {
      toast.error("Failed to load quizzes");
    } finally {
      setLoading(false);
    }
  };

  /* ───────── DELETE QUIZ ───────── */

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const res = await fetch(`/api/quizzes/${deleteId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error();

      setTests((prev) =>
        prev.filter((quiz) => quiz.id !== deleteId)
      );

      toast.success("Quiz deleted");
    } catch (err) {
      toast.error("Failed to delete quiz");
    } finally {
      setDeleteId(null);
    }
  };

  /* ───────── FORMAT DATE ───────── */

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "-";

    if (timestamp._seconds) {
      return new Date(timestamp._seconds * 1000)
        .toISOString()
        .split("T")[0];
    }

    return "-";
  };

  /* ───────── UI ───────── */

  return (
    <div className="space-y-8">

      {/* QUIZ BUILDER */}
      <QuizBuilderPage />

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          {tests.length} quizzes
        </p>
      </div>

      {/* LIST */}
      {loading ? (
        <p className="text-sm text-muted-foreground">
          Loading quizzes...
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {tests.map((test) => (
            <Card
              key={test.id}
              className="shadow-sm hover:shadow-md transition-shadow"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">
                      {test.title}
                    </h3>

                    <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {test.bankIds?.length || 0} banks
                      </span>

                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {test.durationMinutes} min
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">
                      Created: {formatDate(test.createdAt)}
                    </p>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteId(test.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* DELETE CONFIRM */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete Quiz
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MockTestsPage;
