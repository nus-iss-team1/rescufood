"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import { SignOutConfirm } from "@/components/auth/sign-out-dialog";
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
  "w-full justify-start text-base font-semibold",
);

/**
 * Compact navigation for signed-in users on small screens. Desktop renders
 * the nav inline in the header instead (see SiteHeader).
 */
export function HeaderMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Drawer open={menuOpen} onOpenChange={setMenuOpen} swipeDirection="up">
        <DrawerTrigger
          render={
            <Button
              size="icon"
              variant="ghost"
              aria-label="Open menu"
              className="rounded-full text-muted-foreground hover:text-foreground"
            >
              <Menu className="size-[18px]" strokeWidth={1.5} />
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
            {/* Closes the drawer first: the dialog lives outside it. */}
            <Button
              variant="ghost"
              size="lg"
              className="w-full justify-start text-base font-semibold"
              onClick={() => {
                setMenuOpen(false);
                setConfirmOpen(true);
              }}
            >
              Sign out
            </Button>
          </nav>
        </DrawerContent>
      </Drawer>

      <SignOutConfirm open={confirmOpen} onOpenChange={setConfirmOpen} />
    </>
  );
}
