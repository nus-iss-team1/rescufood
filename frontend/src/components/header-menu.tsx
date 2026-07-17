"use client";

import { ArrowRight, Menu } from "lucide-react";

import { signOutAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { GITHUB_URL, GithubIcon } from "@/components/github-icon";

const itemClass =
  "flex items-center gap-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:text-muted-foreground";
const arrowClass = "size-4 shrink-0 text-muted-foreground";

/**
 * Compact navigation for signed-in users on small screens. Desktop renders
 * the nav inline in the header instead (see SiteHeader).
 */
export function HeaderMenu() {
  return (
    <Drawer swipeDirection="up">
      <DrawerTrigger
        render={
          <Button size="icon" variant="ghost" aria-label="Open menu">
            <Menu className="size-5" />
          </Button>
        }
      />
      <DrawerContent className="px-6 pt-20 pb-10">
        <DrawerTitle className="sr-only">Menu</DrawerTitle>
        <nav className="mx-auto flex w-full max-w-md flex-col">
          <p className="pb-2 text-sm text-muted-foreground">Menu</p>
          <DrawerClose
            render={
              <a href="/dashboard" className={itemClass}>
                <ArrowRight className={arrowClass} aria-hidden />
                Home
              </a>
            }
          />
          <DrawerClose
            render={
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                className={itemClass}
              >
                <ArrowRight className={arrowClass} aria-hidden />
                GitHub
              </a>
            }
          />
          <span
            aria-disabled
            className="flex items-center gap-3 py-2.5 text-sm font-medium text-muted-foreground/60"
          >
            <ArrowRight className={arrowClass} aria-hidden />
            Settings
          </span>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:text-destructive"
            >
              <ArrowRight className={arrowClass} aria-hidden />
              Sign out
            </button>
          </form>
        </nav>
      </DrawerContent>
    </Drawer>
  );
}
