import { Fragment } from "react";
import Link from "next/link";

import type { Me } from "@/lib/profile";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@rescufood/ui/components/breadcrumb";

/** One line of context under a page title: who you are acting as. */
export function describeOrg(me: Me | null): string | undefined {
  if (!me) return undefined;
  if (me.is_admin) return "Platform administrator";
  if (!me.org) return "No organisation";
  const type = me.org.type === "donor" ? "Food donor" : "Rescue partner";
  return `${me.org.name} · ${type}`;
}

export interface Crumb {
  label: string;
  /** Omit on the current page. */
  href?: string;
}

export function PageHeader({
  title,
  subtitle,
  action,
  crumbs,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  crumbs?: Crumb[];
}) {
  return (
    <div data-animate="field" className="grid gap-3">
      {crumbs && crumbs.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            {crumbs.map((crumb, i) => (
              // The separator is a sibling li: nesting one inside the
              // item would be invalid markup and break hydration.
              <Fragment key={crumb.label}>
                <BreadcrumbItem>
                  {crumb.href ? (
                    <BreadcrumbLink render={<Link href={crumb.href} />}>
                      {crumb.label}
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {i < crumbs.length - 1 && <BreadcrumbSeparator />}
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="grid gap-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
    </div>
  );
}
