export default function LoadingVideos() {
  return <div aria-busy="true" aria-label="Loading video library" className="min-h-screen space-y-6 bg-zinc-50 p-6">
    <div className="h-10 w-48 animate-pulse rounded bg-zinc-200 motion-reduce:animate-none" />
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map(item => <div key={item} aria-hidden="true" className="aspect-video animate-pulse rounded-lg bg-zinc-200 motion-reduce:animate-none" />)}
    </div>
  </div>;
}
