import Link from "next/link";

import { auth, authConfigured } from "@/auth";
import { SignOutButton } from "@/components/auth/sign-out-dialog";
import { HeaderMenu } from "@/components/header-menu";

const navItemClass =
  "inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted";

export async function SiteHeader() {
  const session = authConfigured ? await auth() : null;

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-full w-full max-w-5xl items-center justify-between px-6">
        <Link
          href="/"
          className="text-base font-bold tracking-tight text-foreground"
        >
          RescuFood
        </Link>

        {session?.user ? (
          <>
            {/* Desktop: navigation rendered directly in the bar */}
            <nav className="hidden items-center gap-1 md:flex">
              <a href="/dashboard" className={navItemClass}>
                Home
              </a>
              <a href="/settings" className={navItemClass}>
                Settings
              </a>
              <SignOutButton className={navItemClass} />
            </nav>
            {/* Small screens: hamburger opens the drawer */}
            <div className="md:hidden">
              <HeaderMenu />
            </div>
          </>
        ) : (
          <Link href="/login" className={navItemClass}>
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
