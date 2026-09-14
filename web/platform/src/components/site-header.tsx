import Link from "next/link";
import { House, LogOut, Settings } from "lucide-react";

import { auth, authConfigured } from "@/auth";
import { SignOutButton } from "@/components/auth/sign-out-dialog";
import { NotificationBell } from "@/components/notifications/notification-bell";

const navItemClass =
  "inline-flex size-9 items-center justify-center rounded-full text-foreground/70 outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50";

export async function SiteHeader() {
  const session = authConfigured ? await auth() : null;

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-full w-full max-w-5xl items-center justify-between px-6">
        <Link
          href={session?.user ? "/dashboard" : "/"}
          className="text-base font-bold tracking-tight text-foreground"
        >
          RescuFood
        </Link>

        {session?.user ? (
          <nav className="flex items-center gap-1">
            <a
              href="/dashboard"
              className={navItemClass}
              aria-label="Home"
              title="Home"
            >
              <House className="size-[18px]" />
            </a>
            <NotificationBell />
            <a
              href="/settings"
              className={navItemClass}
              aria-label="Settings"
              title="Settings"
            >
              <Settings className="size-[18px]" />
            </a>
            <SignOutButton
              className={navItemClass}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="size-[18px]" />
            </SignOutButton>
          </nav>
        ) : (
          <Link
            href="/login"
            className="inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
