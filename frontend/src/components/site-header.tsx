import { auth, authConfigured } from "@/auth";
import { signOutAction } from "@/app/actions";
import { HeaderMenu } from "@/components/header-menu";
import { GITHUB_URL, GithubIcon } from "@/components/github-icon";

const navItemClass =
  "inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted";

export async function SiteHeader() {
  const session = authConfigured ? await auth() : null;

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-full w-full max-w-5xl items-center justify-between px-6">
        <a
          href="/"
          className="text-base font-bold tracking-tight text-foreground"
        >
          RescuFood
        </a>

        {session?.user ? (
          <>
            {/* Desktop: navigation rendered directly in the bar */}
            <nav className="hidden items-center gap-1 md:flex">
              <a href="/dashboard" className={navItemClass}>
                Home
              </a>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className={navItemClass}
              >
                <GithubIcon className="size-4" />
                GitHub
              </a>
              <span
                aria-disabled
                className="inline-flex h-9 items-center px-3 text-sm font-medium text-muted-foreground/60"
                title="Coming soon"
              >
                Settings
              </span>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  Sign out
                </button>
              </form>
            </nav>
            {/* Small screens: hamburger opens the drawer */}
            <div className="md:hidden">
              <HeaderMenu />
            </div>
          </>
        ) : (
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="View RescuFood on GitHub"
            className="inline-flex size-9 items-center justify-center rounded-full text-sm font-medium text-foreground transition-colors hover:bg-muted sm:w-auto sm:gap-2 sm:px-4"
          >
            <GithubIcon className="size-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        )}
      </div>
    </header>
  );
}
