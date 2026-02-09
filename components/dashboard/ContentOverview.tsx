const stats = [
  { label: "Quizzes", value: 68 },
  { label: "Tests", value: 24 },
  { label: "Vivas", value: 12 },
  { label: "Resources", value: 80 },
];

export default function ContentOverview() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="text-sm font-medium mb-3">
        Content Overview
      </h2>

      <div className="space-y-2">
        {stats.map((item) => (
          <div
            key={item.label}
            className="flex justify-between text-sm"
          >
            <span className="text-zinc-400">{item.label}</span>
            <span className="font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
