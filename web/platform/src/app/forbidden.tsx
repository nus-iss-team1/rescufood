import Link from "next/link";

import { AnimateIn } from "@/components/animate-in";
import { PageShell } from "@/components/page-shell";
import { buttonVariants } from "@rescufood/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rescufood/ui/components/card";
import { cn } from "@/lib/utils";

export default function Forbidden() {
  return (
    <PageShell width="narrow" className="flex min-h-[70vh] items-center">
      <AnimateIn className="w-full">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Forbidden</CardTitle>
            <CardDescription>
              You do not have access to this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard" className={cn(buttonVariants(), "w-full")}>
              Back to dashboard
            </Link>
          </CardContent>
        </Card>
      </AnimateIn>
    </PageShell>
  );
}
