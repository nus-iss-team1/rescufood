"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Leaf } from "lucide-react";

import { buttonVariants } from "@rescufood/ui/components/button";
import { Logo } from "@/components/logo";
import { Card } from "@rescufood/ui/components/card";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const eyebrow =
  "text-xs font-semibold tracking-[0.18em] text-primary uppercase";

const sectionHeading =
  "text-3xl font-bold tracking-tight text-balance sm:text-4xl";

type Step = { title: string; description: string };

const steps: Step[] = [
  {
    title: "List the surplus",
    description:
      "A donor posts what is left over: quantity, allergens, handling notes, and the window it can be collected in.",
  },
  {
    title: "Claim a lot",
    description:
      "Rescue partners filter what is available nearby and reserve it. One claim per listing, so nothing is double-booked.",
  },
  {
    title: "Confirm the handover",
    description:
      "A single-use code closes the pickup, leaving both sides with the same record of what moved and when.",
  },
];

type Audience = {
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
  image: { src: string; alt: string };
};

const audiences: Audience[] = [
  {
    eyebrow: "For donors",
    title: "Surplus out the door, not into the bin",
    description:
      "Cafes, bakeries, caterers and grocers turn an end-of-day problem into a few taps.",
    points: [
      "Post a lot in under a minute",
      "Set the pickup window that suits your shift",
      "See who claimed what, and when they collected",
    ],
    image: {
      src: "/images/packed-food-supplies.jpg",
      alt: "Neatly packed food supplies including pasta, canned goods, and water",
    },
  },
  {
    eyebrow: "For rescue partners",
    title: "Know what is available before you drive",
    description:
      "Shelters, soup kitchens and community fridges see live surplus nearby and reserve it on the spot.",
    points: [
      "Browse and filter listings close to you",
      "Reserve a lot that is yours alone",
      "Get reminded before a pickup window closes",
    ],
    image: {
      src: "/images/volunteers-with-donations.jpg",
      alt: "Two smiling volunteers holding boxes of food and aid donations",
    },
  },
];

export function Landing() {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-animate=hero] > *", {
          y: 24,
          autoAlpha: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
        });

        gsap.from("[data-animate=hero-media]", {
          autoAlpha: 0,
          scale: 1.05,
          duration: 1.2,
          ease: "power2.out",
        });

        gsap.utils.toArray<HTMLElement>("[data-animate=reveal]").forEach((el) => {
          gsap.from(el, {
            y: 24,
            autoAlpha: 0,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 85%" },
          });
        });

        gsap.utils.toArray<HTMLElement>("[data-animate=group]").forEach((group) => {
          const items = group.querySelectorAll("[data-animate=item]");
          if (!items.length) return;
          gsap.from(items, {
            y: 28,
            autoAlpha: 0,
            duration: 0.7,
            stagger: 0.09,
            ease: "power3.out",
            scrollTrigger: { trigger: group, start: "top 80%" },
          });
        });
      });
    },
    { scope: container },
  );

  return (
    <div ref={container} className="flex min-h-screen flex-col">
      <header className="w-full px-6 py-5">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <Link href="/" aria-label="RescuFood home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Create account
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative">
          <div className="grid lg:grid-cols-[1fr_minmax(0,28rem)] xl:grid-cols-[1fr_minmax(0,36rem)]">
            {/* Left padding tracks the 64rem container the header uses. */}
            <div className="flex items-center px-6 py-20 lg:py-32 lg:pr-14 lg:pl-[max(1.5rem,calc((100vw-64rem)/2+1.5rem))]">
              <div
                data-animate="hero"
                className="flex w-full max-w-xl flex-col items-start gap-7"
              >
                <span className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                  <Leaf className="size-3.5" aria-hidden />
                  Less waste, more meals
                </span>

                <h1 className="text-5xl font-bold tracking-tight text-balance sm:text-6xl xl:text-[4.25rem] xl:leading-[1.03]">
                  Good food.
                  <br />
                  <span className="text-primary">Not landfill.</span>
                </h1>

                <p className="max-w-md text-lg text-pretty text-muted-foreground">
                  RescuFood connects surplus from local businesses with the
                  rescue partners who get it to the communities that need it.
                </p>

                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:gap-4">
                  <Link
                    href="/signup"
                    className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
                  >
                    Donate food
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                  <Link
                    href="/signup"
                    className={cn(
                      buttonVariants({ size: "lg", variant: "outline" }),
                      "w-full sm:w-auto",
                    )}
                  >
                    Find food near you
                  </Link>
                </div>

              </div>
            </div>

            <div
              data-animate="hero-media"
              className="relative order-first h-72 overflow-hidden sm:h-96 lg:order-none lg:h-auto lg:min-h-[38rem]"
            >
              {/* 12% vertical overscan behind the data-speed parallax offset. */}
              <div data-speed="0.92" className="absolute inset-x-0 -inset-y-[12%]">
                <Image
                  src="/images/volunteer-loading-food.jpg"
                  alt="A volunteer loading crates of rescued food for collection"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-cover saturate-[0.92]"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="bg-secondary/50 px-6 py-20 sm:py-28">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-12">
            <div
              data-animate="reveal"
              className="flex max-w-2xl flex-col gap-4"
            >
              <p className={eyebrow}>How it works</p>
              <h2 className={sectionHeading}>Three steps from surplus to table</h2>
            </div>

            <ol
              data-animate="group"
              className="grid gap-10 sm:grid-cols-3 sm:gap-8"
            >
              {steps.map((step, i) => (
                <li key={step.title} data-animate="item">
                  <div className="flex items-center gap-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
                      {i + 1}
                    </span>
                    {i < steps.length - 1 && (
                      <span aria-hidden className="hidden h-px flex-1 bg-border sm:block" />
                    )}
                  </div>
                  <h3 className="mt-6 text-lg font-semibold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-pretty text-muted-foreground">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="px-6 py-20 sm:py-28">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-12">
            <div data-animate="reveal" className="flex max-w-2xl flex-col gap-4">
              <p className={eyebrow}>Who it is for</p>
              <h2 className={sectionHeading}>
                Two sides of the same hand-off
              </h2>
            </div>

            <div data-animate="group" className="grid gap-6 lg:grid-cols-2">
              {audiences.map((audience) => (
                <Card
                  key={audience.title}
                  data-animate="item"
                  className="group gap-0 py-0"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image
                      src={audience.image.src}
                      alt={audience.image.alt}
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover saturate-[0.92] transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-4 p-7">
                    <p className={eyebrow}>{audience.eyebrow}</p>
                    <h3 className="text-2xl font-bold tracking-tight text-balance">
                      {audience.title}
                    </h3>
                    <p className="text-pretty text-muted-foreground">
                      {audience.description}
                    </p>
                    <ul className="grid gap-2.5">
                      {audience.points.map((point) => (
                        <li key={point} className="flex items-start gap-2.5">
                          <Check
                            className="mt-0.5 size-4 shrink-0 text-primary"
                            aria-hidden
                          />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

      </main>

      <footer className="w-full px-6 py-8">
        <div className="mx-auto w-full max-w-5xl text-center text-sm text-muted-foreground">
          <p>RescuFood · a NUS-ISS Team 1 project</p>
        </div>
      </footer>
    </div>
  );
}
