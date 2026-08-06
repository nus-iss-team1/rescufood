import type { Me } from "@/lib/profile";

/** One line of context under a page title: who you are acting as. */
export function describeOrg(me: Me | null): string | undefined {
  if (!me) return undefined;
  if (me.is_admin) return "Platform administrator";
  if (!me.org) return "No organisation";
  const type = me.org.type === "donor" ? "Food donor" : "Rescue partner";
  return `${me.org.name} · ${type}`;
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      data-animate="field"
      className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2"
    >
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
