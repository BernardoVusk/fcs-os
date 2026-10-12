export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-fundo p-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] bg-[radial-gradient(60%_60%_at_50%_0%,rgb(0_216_255/0.10),transparent_70%)]"
      />
      <div className="relative w-full max-w-sm">{children}</div>
    </div>
  );
}
