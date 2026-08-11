import type { Metadata } from "next";

import { AnimateIn } from "@/components/animate-in";
import { PageShell } from "@/components/page-shell";
import { RegisterOrgForm } from "@/components/org/register-org-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@rescufood/ui/components/card";

export const metadata: Metadata = {
  title: "Register your organisation — RescuFood",
};

export default function RegisterOrganisationPage() {
  return (
    <PageShell width="form">
      <AnimateIn className="flex flex-col">
        <Card data-animate="field">
          <CardHeader>
            <CardTitle>
              <h1 className="text-2xl font-semibold tracking-tight">
                Register your organisation
              </h1>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RegisterOrgForm />
          </CardContent>
        </Card>
      </AnimateIn>
    </PageShell>
  );
}
