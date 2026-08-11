import Link from "next/link";
import type { Metadata } from "next";

import { AnimateIn } from "@/components/animate-in";
import { AutoRedirect } from "@/components/auth/auto-redirect";
import { buttonVariants } from "@rescufood/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rescufood/ui/components/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Session expired — RescuFood",
  robots: { index: false },
};

export default function SessionExpiredPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <AnimateIn className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Your session has expired</CardTitle>
              <CardDescription>
                You have been signed out for security. Sign in again to pick up
                where you left off.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Link href="/login" className={cn(buttonVariants(), "w-full")}>
                Sign in
              </Link>
              <AutoRedirect to="/login" />
            </CardContent>
          </Card>
        </AnimateIn>
      </main>
      {/* Redirects without javascript. */}
      <meta httpEquiv="refresh" content="5;url=/login" />
    </div>
  );
}
