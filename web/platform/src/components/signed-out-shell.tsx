"use client";

import { usePathname } from "next/navigation";
import type { Session } from "next-auth";

import { SiteHeader } from "@/components/site-header";
import { SmoothScroll } from "@/components/smooth-scroll";

/** Routes that carry their own top-of-page chrome. */
const headerless = new Set(["/"]);

/** Signed-out chrome: the site header over a smooth-scrolled body. */
export function SignedOutShell({
  session,
  children,
}: {
  session: Session | null;
  children: React.ReactNode;
}) {
  const bare = headerless.has(usePathname());

  return (
    <>
      {!bare && <SiteHeader initialSession={session} />}
      <SmoothScroll contentClassName={bare ? "" : "pt-16"}>
        {children}
      </SmoothScroll>
    </>
  );
}
