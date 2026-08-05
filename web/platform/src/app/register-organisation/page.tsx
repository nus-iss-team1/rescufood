import type { Metadata } from "next";

import { AnimateIn } from "@/components/animate-in";
import { RegisterOrgForm } from "@/components/org/register-org-form";
import { Card, CardContent, CardHeader, CardTitle } from "@rescufood/ui/components/card";

export const metadata: Metadata = {
  title: "Register your organisation — RescuFood",
};

export default function RegisterOrganisationPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <section className="flex flex-1 items-center justify-center px-6 py-16 sm:py-24">
        <AnimateIn className="mx-auto flex w-full max-w-lg flex-col">
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
      </section>
    </main>
  );
}
