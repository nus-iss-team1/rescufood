import { cn } from "@/lib/utils";

const widths = {
  /** Dashboard, listings, settings. */
  wide: "max-w-5xl",
  /** Single-column forms. */
  form: "max-w-lg",
  /** Sign-in and other single-card pages. */
  narrow: "max-w-md",
};

/**
 * Shared width and spacing for every page. The fixed header is already
 * cleared by the scroll wrapper's own top padding.
 */
export function PageShell({
  width = "wide",
  className,
  children,
}: {
  width?: keyof typeof widths;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <main className={cn("mx-auto w-full px-6 py-8", widths[width], className)}>
      {children}
    </main>
  );
}
