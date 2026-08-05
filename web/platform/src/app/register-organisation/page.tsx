import type { Metadata } from "next";

import { AnimateIn } from "@/components/animate-in";
import { RegisterOrgForm } from "@/components/org/register-org-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Register your organisation — RescuFood",
};

export default function RegisterOrganisationPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <section className="flex-1 px-6 py-16 sm:py-24">
        <AnimateIn className="mx-auto flex w-full max-w-lg flex-col gap-6">
          <h1
            data-animate="field"
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Register your organisation
          </h1>
          <Card data-animate="field">
            <CardContent className="flex flex-col gap-5 pt-6">
              <p className="text-sm text-muted-foreground">
                RescuFood works between approved organisations. Registration
                comes first: once an administrator approves your
                organisation, everyone on your email domain can create an
                account and start donating or rescuing surplus food.
              </p>
              <RegisterOrgForm />
            </CardContent>
          </Card>
        </AnimateIn>
      </section>
    </main>
  );
}
