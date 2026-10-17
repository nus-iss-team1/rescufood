"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartColumn,
  House,
  Inbox,
  LogOut,
  Package,
  Plus,
  Search,
  Settings,
  type LucideIcon,
} from "lucide-react";

import type { Org } from "@/lib/profile";
import { SignOutButton } from "@/components/auth/sign-out-dialog";
import { Logo } from "@/components/logo";
import { SidebarOrg } from "@/components/sidebar-org";
import { NotificationBell } from "@/components/notifications/notification-bell";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const OVERVIEW: NavGroup = {
  label: "Overview",
  items: [
    { href: "/dashboard", label: "Dashboard", icon: House },
    { href: "/reports", label: "Reports", icon: ChartColumn },
  ],
};

const DONOR: NavGroup = {
  label: "Donate",
  items: [
    { href: "/listings", label: "Your listings", icon: Package },
    { href: "/listings/new", label: "New listing", icon: Plus },
    { href: "/requests", label: "Requests", icon: Inbox },
  ],
};

const RESCUE_PARTNER: NavGroup = {
  label: "Rescue",
  items: [
    { href: "/browse", label: "Find surplus food", icon: Search },
    { href: "/requests", label: "Your requests", icon: Inbox },
  ],
};

const ACCOUNT: NavGroup = {
  label: "Account",
  items: [{ href: "/settings", label: "Settings", icon: Settings }],
};

/** The role group is withheld until an administrator approves the org. */
function navGroups(org?: Org | null): NavGroup[] {
  if (org?.status !== "approved") return [OVERVIEW, ACCOUNT];
  return [
    OVERVIEW,
    org.type === "rescue_partner" ? RESCUE_PARTNER : DONOR,
    ACCOUNT,
  ];
}

/** The longest matching href wins. */
function activeHref(groups: NavGroup[], pathname: string): string | undefined {
  return groups
    .flatMap((group) => group.items.map((item) => item.href))
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

export function AppSidebar({
  org,
  memberCount = 0,
}: {
  org?: Org | null;
  memberCount?: number;
}) {
  const pathname = usePathname();
  const groups = navGroups(org);
  const active = activeHref(groups, pathname);

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="px-5 py-4">
        {/* The bell also sits in SiteHeader, which is mobile-only; without
            this copy there is no way to reach notifications on desktop. */}
        <div className="flex items-center justify-between gap-2">
          <Link href="/dashboard" className="text-sidebar-foreground">
            <Logo />
          </Link>
          <NotificationBell />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(({ href, label, icon: Icon }) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      isActive={href === active}
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
        ))}
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
