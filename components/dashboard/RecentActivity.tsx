const activity = [
  "Quiz 'Renal Stones' published",
  "Test 'Mock Test 3' updated",
  "New user signed up",
  "Viva 'Prostate Case' added",
  "Resource 'CT Scan Guide' uploaded",
];

export default function RecentActivity() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="text-sm font-medium mb-3">
        Recent Activity
      </h2>

      <ul className="space-y-2 text-sm text-zinc-400">
        {activity.map((item, idx) => (
          <li key={idx}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}
