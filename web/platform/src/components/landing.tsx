"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import {
  BarChart3,
  Bell,
  PackagePlus,
  QrCode,
  Search,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@rescufood/ui/components/badge";
import { buttonVariants } from "@rescufood/ui/components/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rescufood/ui/components/card";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type FeatureStatus = "available" | "coming-soon";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
  status: FeatureStatus;
};

const features: Feature[] = [
  {
    icon: ShieldCheck,
    title: "Accounts & organisations",
    description:
      "Donors and rescue partners sign in to a verified organisation profile with the right access for their role.",
    status: "coming-soon",
  },
  {
    icon: PackagePlus,
    title: "Post surplus food",
    description:
      "Donors publish a surplus lot with quantity, allergens, handling notes, and a pickup window in a few taps.",
    status: "coming-soon",
  },
  {
    icon: Search,
    title: "Find & claim food",
    description:
      "Rescue partners browse what's available nearby and reserve a lot — one claim per listing, no double-booking.",
    status: "coming-soon",
  },
  {
    icon: QrCode,
    title: "Pickup verification",
    description:
      "A single-use QR or short code confirms collection, so every handover is accounted for.",
    status: "coming-soon",
  },
  {
    icon: Bell,
    title: "Reminders & alerts",
    description:
      "Timely notifications for new claims, pickup reminders, changes, and listings about to expire.",
    status: "coming-soon",
  },
  {
    icon: BarChart3,
    title: "Impact reporting",
    description:
      "See food rescued, time-to-claim, and activity history at a glance — with a full audit trail behind it.",
    status: "coming-soon",
  },
];

export function Landing() {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from("[data-animate=hero] > *", {
        y: 24,
        autoAlpha: 0,
        duration: 0.8,
        stagger: 0.12,
        ease: "power3.out",
      });

      gsap.from("[data-animate=card]", {
        y: 32,
        autoAlpha: 0,
        duration: 0.7,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: {
          trigger: "[data-animate=cards]",
          start: "top 80%",
        },
      });

      // Banners settle in slowly for a calm feel.
      gsap.utils.toArray<HTMLElement>("[data-animate=banner]").forEach((el) => {
        gsap.from(el, {
          y: 20,
          autoAlpha: 0,
          duration: 1.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
          },
        });
      });
    },
    { scope: container },
  );

  return (
    <div ref={container} className="flex min-h-screen flex-col">
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border">
          <Image
            src="/images/volunteer-loading-food.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover saturate-[0.92]"
          />
          {/* Scrim: keeps the theme's text colours readable on the photo. */}
          <div className="absolute inset-0 bg-background/80 dark:bg-background/75" />
          <div
            data-animate="hero"
            className="relative mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-6 pt-28 pb-20 text-center sm:pt-36 sm:pb-28"
          >
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              RescuFood
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Connecting surplus food from businesses with the communities that
              need it
            </p>
            <div className="flex flex-col items-center gap-3">
              <div className="flex w-full max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:gap-4">
                <a
                  href="/signup"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "w-full sm:w-auto",
                  )}
                >
                  Donate food
                </a>
                <a
                  href="/signup"
                  className={cn(
                    buttonVariants({ size: "lg", variant: "outline" }),
                    "w-full sm:w-auto",
                  )}
                >
                  Find food near you
                </a>
              </div>
              <p className="text-xs text-muted-foreground">
                Create an organisation account or{" "}
                <a
                  href="/login"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  sign in
                </a>{" "}
                to get started.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-secondary/40 px-6 py-20 sm:py-28">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
            <div className="flex flex-col items-center gap-3 text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                What RescuFood will do
              </h2>
              <p className="max-w-2xl text-muted-foreground">
                The full donor-to-rescue-partner workflow, built one step at a
                time. Everything below is on the roadmap and not yet live.
              </p>
            </div>

            <div
              data-animate="cards"
              className="grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {features.map((feature) => {
                const Icon = feature.icon;
                const isAvailable = feature.status === "available";
                return (
                  <Card
                    key={feature.title}
                    data-animate="card"
                    aria-disabled={!isAvailable}
                    className={isAvailable ? undefined : "opacity-60"}
                  >
                    <CardHeader>
                      <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
                        <Icon className="size-5" aria-hidden />
                      </div>
                      <CardAction>
                        {isAvailable ? (
                          <Badge>Live</Badge>
                        ) : (
                          <Badge variant="secondary">Coming soon</Badge>
                        )}
                      </CardAction>
                      <CardTitle className="mt-3">{feature.title}</CardTitle>
                      <CardDescription>{feature.description}</CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section
          data-animate="banner"
          className="border-t border-border px-6 py-20 sm:py-28"
        >
          <div className="mx-auto grid w-full max-w-5xl items-center gap-10 lg:grid-cols-2">
            <div className="flex flex-col gap-4 text-center lg:text-left">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Built by people who care about their community
              </h2>
              <p className="text-muted-foreground">
                Behind every listing is a donor with food to spare and a rescue
                partner ready to collect it. RescuFood exists to make that
                hand-off simple, dependable, and kind — so good food reaches
                people instead of landfills.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl ring-1 ring-border">
                <Image
                  src="/images/volunteers-with-donations.jpg"
                  alt="Two smiling volunteers holding boxes of food and aid donations"
                  fill
                  sizes="(max-width: 1024px) 50vw, 320px"
                  className="object-cover saturate-[0.92]"
                />
                <div className="absolute inset-0 bg-background/5" />
              </div>
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl ring-1 ring-border">
                <Image
                  src="/images/packed-food-supplies.jpg"
                  alt="Neatly packed food supplies including pasta, canned goods, and water"
                  fill
                  sizes="(max-width: 1024px) 50vw, 320px"
                  className="object-cover saturate-[0.92]"
                />
                <div className="absolute inset-0 bg-background/5" />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full border-t border-border py-6">
        <p className="text-center text-sm text-muted-foreground">
          RescuFood — a NUS-ISS Team 1 project
        </p>
      </footer>
    </div>
  );
}
