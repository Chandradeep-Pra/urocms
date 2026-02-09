import Link from "next/link";

const actions = [
  { label: "Create Quiz", href: "/dashboard/quizzes" },
  { label: "Create Test", href: "/dashboard/tests" },
  { label: "Add Resource", href: "/dashboard/resources" },
  { label: "Create Viva", href: "/dashboard/viva" },
];

export default function QuickActions() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="text-sm font-medium mb-3">
        Quick Actions
      </h2>

      <div className="flex flex-wrap gap-3">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm
                       hover:bg-white/20 transition"
          >
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
