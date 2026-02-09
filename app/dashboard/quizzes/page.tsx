import FolderList from "@/components/folders/FolderList";

export default function QuizzesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Quiz Folders</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Organize quizzes into folders
        </p>
      </div>

      <FolderList />
    </div>
  );
}
