"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartColumn, House, LogOut, Settings } from "lucide-react";

import type { Org } from "@/lib/profile";
import { SignOutButton } from "@/components/auth/sign-out-dialog";
import { SidebarOrg } from "@/components/sidebar-org";
import { NotificationBell } from "@/components/notifications/notification-bell";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: House },
  { href: "/reports", label: "Reports", icon: ChartColumn },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppSidebar({
  org,
  memberCount = 0,
}: {
  org?: Org | null;
  memberCount?: number;
}) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="px-5 py-4">
        {/* The bell also sits in SiteHeader, which is mobile-only; without
            this copy there is no way to reach notifications on desktop. */}
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/dashboard"
            className="text-base font-bold tracking-tight text-sidebar-foreground"
          >
            RescuFood
          </Link>
          <NotificationBell />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    // Nested routes keep their section marked, e.g.
                    // /listings/123 under /listings.
                    isActive={pathname === href || pathname.startsWith(`${href}/`)}
                    render={
                      <Link href={href}>
                        <Icon />
                        <span>{label}</span>
                      </Link>
                    }
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 pb-4">
        {org && <SidebarOrg org={org} memberCount={memberCount} />}
        <SidebarMenu>
          <SidebarMenuItem>
            <SignOutButton className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <LogOut className="size-4" />
              <span>Sign out</span>
            </SignOutButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
