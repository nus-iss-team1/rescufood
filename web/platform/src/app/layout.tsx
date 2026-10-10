import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@rescufood/ui/components/sonner";

import { auth, authConfigured } from "@/auth";
import { getMe, getMyOrgMembers, type Org } from "@/lib/profile";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SmoothScroll } from "@/components/smooth-scroll";
import { SidebarProvider } from "@/components/ui/sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Every route reads the session from cookies, so none of them may prerender.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RescuFood",
  description:
    "Connecting surplus food from businesses with the communities that need it.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = authConfigured ? await auth() : null;
  const sessionKey =
    session?.user?.username ?? session?.user?.email ?? "anonymous";
  // Signed-out pages keep the header on every width; there is nothing to
  // navigate to in a sidebar.
  const signedIn = Boolean(session?.user);

  // Feeds the sidebar's organisation block. A failure here leaves the block
  // out rather than taking every page down with it.
  let org: Org | null = null;
  let memberCount = 0;
  if (signedIn && session?.idToken) {
    try {
      const me = await getMe(session.idToken);
      org = me.org;
      if (me.org?.status === "approved") {
        memberCount = (await getMyOrgMembers(session.idToken)).length;
      }
    } catch {
      // Sidebar renders without the organisation block.
    }
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider key={sessionKey} session={session}>
          {signedIn ? (
            <SidebarProvider>
              <AppSidebar org={org} memberCount={memberCount} />
              {/* No ScrollSmoother here: its wrapper is position:fixed at
                  full width, so it would escape the sidebar's layout. */}
              <div className="relative flex w-full flex-1 flex-col">
                <SiteHeader
                  initialSession={session}
                  className="md:hidden"
                  withSidebarTrigger
                />
                <div className="pt-16 md:pt-0">{children}</div>
              </div>
            </SidebarProvider>
          ) : (
            <>
              <SiteHeader initialSession={session} />
              <SmoothScroll>{children}</SmoothScroll>
            </>
          )}
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
