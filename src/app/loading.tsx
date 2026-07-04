export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-mint border-t-transparent" />
        <p className="text-white/60">Loading...</p>
      </div>
    </div>
  );
}
