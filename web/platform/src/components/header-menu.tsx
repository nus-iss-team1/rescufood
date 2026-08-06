"use client";

import { useState } from "react";

import { SignOutConfirm } from "@/components/auth/sign-out-dialog";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@rescufood/ui/components/drawer";
import { cn } from "@/lib/utils";

// Quiet rows separated by hairlines, no fills: the weight comes from
// spacing rather than type.
const itemClass =
  "flex h-11 w-full items-center text-[15px] font-normal text-foreground/80 outline-none transition-colors hover:text-foreground focus-visible:text-foreground";

/**
 * Two hairlines that cross into a close mark, the way apple's mobile
 * menu behaves. Only transforms animate, so it stays smooth.
 */
function MenuGlyph({ open }: { open: boolean }) {
  const bar =
    "absolute left-0 h-px w-full rounded-full bg-current transition-transform duration-300 ease-out";
  return (
    <span aria-hidden className="relative block h-[9px] w-[17px]">
      <span
        className={cn(bar, "top-0", open && "translate-y-[4px] rotate-45")}
      />
      <span
        className={cn(bar, "bottom-0", open && "-translate-y-[4px] -rotate-45")}
      />
    </span>
  );
}

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
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="inline-flex size-10 items-center justify-center rounded-full text-foreground/70 outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <MenuGlyph open={menuOpen} />
            </button>
          }
        />
        <DrawerContent className="px-6 pt-20 pb-10">
          <DrawerTitle className="sr-only">Menu</DrawerTitle>
          <nav className="mx-auto flex w-full max-w-md flex-col divide-y divide-border">
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
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                setMenuOpen(false);
                setConfirmOpen(true);
              }}
            >
              Sign out
            </button>
          </nav>
        </DrawerContent>
      </Drawer>

      <SignOutConfirm open={confirmOpen} onOpenChange={setConfirmOpen} />
    </>
  );
}
