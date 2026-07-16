"use client";

import { LogOut, Menu, Settings, User } from "lucide-react";

import { signOutAction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

type MenuUser = {
  name?: string | null;
  email?: string | null;
  groups?: string[];
};

export function HeaderMenu({ user }: { user: MenuUser | null }) {
  return (
    <Drawer swipeDirection="up">
      <DrawerTrigger
        render={
          <Button size="icon" variant="ghost" aria-label="Open menu">
            <Menu className="size-5" />
          </Button>
        }
      />
      <DrawerContent className="p-6">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        {user ? (
          <>
            <DrawerHeader className="p-0">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {(user.name ?? user.email ?? "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <DrawerTitle className="truncate text-base">
                    {user.name ?? "Your account"}
                  </DrawerTitle>
                  <DrawerDescription className="truncate">
                    {user.email}
                  </DrawerDescription>
                </div>
              </div>
              {user.groups?.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {user.groups.map((group) => (
                    <Badge key={group} variant="secondary">
                      {group}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </DrawerHeader>

            <nav className="flex flex-col gap-1">
              <DrawerClose
                render={
                  <a
                    href="/dashboard"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    <User className="size-4" aria-hidden />
                    Profile
                  </a>
                }
              />
              <span
                aria-disabled
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground opacity-60"
              >
                <Settings className="size-4" aria-hidden />
                Settings
                <Badge variant="secondary" className="ml-auto">
                  Coming soon
                </Badge>
              </span>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="size-4" aria-hidden />
                  Sign out
                </button>
              </form>
            </nav>
          </>
        ) : (
          <>
            <DrawerHeader className="p-0">
              <DrawerTitle className="text-base">Welcome</DrawerTitle>
              <DrawerDescription>
                Sign in or create an organisation account to get started.
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex flex-col gap-3">
              <a href="/login" className={cn(buttonVariants({ size: "lg" }))}>
                Sign in
              </a>
              <a
                href="/signup"
                className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
              >
                Create account
              </a>
            </div>
          </>
        )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
