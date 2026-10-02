import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@rescufood/ui/components/sonner";

import { auth, authConfigured } from "@/auth";
import { SiteHeader } from "@/components/site-header";
import { SmoothScroll } from "@/components/smooth-scroll";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider key={sessionKey} session={session}>
          <SiteHeader initialSession={session} />
          <SmoothScroll>{children}</SmoothScroll>
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
