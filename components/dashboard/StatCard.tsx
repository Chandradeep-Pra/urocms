type Props = {
  title: string;
  value: string;
};

export default function StatCard({ title, value }: Props) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm text-zinc-400">{title}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
