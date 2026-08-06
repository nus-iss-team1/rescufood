"use client";

import { Menu } from "lucide-react";

import { signOutAction } from "@/app/actions";
import { Button, buttonVariants } from "@rescufood/ui/components/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@rescufood/ui/components/drawer";
import { cn } from "@/lib/utils";

const itemClass = cn(
  buttonVariants({ variant: "ghost", size: "lg" }),
  "w-full justify-start text-base font-semibold"
);

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
        <nav className="mx-auto flex w-full max-w-md flex-col gap-1">
          <DrawerClose
            render={
              <a href="/dashboard" className={itemClass}>
                Home
              </a>
            }
          />
          <DrawerClose
            render={
              <a href="/settings" className={itemClass}>
                Settings
              </a>
            }
          />
          <form action={signOutAction}>
            <Button
              type="submit"
              variant="ghost"
              size="lg"
              className="w-full justify-start text-base font-semibold"
            >
              Sign out
            </Button>
          </form>
        </nav>
      </DrawerContent>
    </Drawer>
  );
}
