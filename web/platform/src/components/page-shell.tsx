/** Shared width and spacing for every signed-in page. */
export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 pt-24 pb-16">
      {children}
    </main>
  );
}
