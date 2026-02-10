export default function Loader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border-2 border-slate-200/70"></div>
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--md-sys-color-primary)] border-r-[var(--md-sys-color-secondary)] animate-spin"></div>
      </div>
      <p className="text-sm text-slate-500">Loading your workspace...</p>
    </div>
  );
}
