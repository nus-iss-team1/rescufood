import { Button } from "@rescufood/ui/components/button";

export function HeaderBar({
  user,
  onSignOut,
}: {
  user?: string;
  onSignOut?: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-full w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="text-base font-bold tracking-tight">RescuFood</span>
          <span className="truncate text-sm text-muted-foreground">
            Admin console
          </span>
        </div>

        {onSignOut && (
          <div className="flex min-w-0 items-center gap-3">
            {user && (
              <span className="hidden truncate text-sm text-muted-foreground sm:inline">
                {user}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={onSignOut}>
              Sign out
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
