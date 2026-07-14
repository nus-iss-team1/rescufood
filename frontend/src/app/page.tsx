"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function Home() {
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
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: {
          trigger: "[data-animate=cards]",
          start: "top 80%",
        },
      });
    },
    { scope: container }
  );

  return (
    <div ref={container} className="flex min-h-screen flex-col items-center">
      <main className="flex w-full max-w-4xl flex-1 flex-col items-center gap-12 px-6 py-24">
        <section
          data-animate="hero"
          className="flex flex-col items-center gap-6 text-center"
        >
          <Badge variant="secondary">Fighting food waste together</Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            RescuFood
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Connecting surplus food from businesses with the communities that
            need it — before it goes to waste.
          </p>
          <div className="flex gap-4">
            <Button size="lg">Donate food</Button>
            <Button size="lg" variant="outline">
              Find food near you
            </Button>
          </div>
        </section>

        <Separator />

        <section
          data-animate="cards"
          className="grid w-full gap-6 sm:grid-cols-3"
        >
          <Card data-animate="card">
            <CardHeader>
              <CardTitle>List surplus</CardTitle>
              <CardDescription>
                Restaurants and grocers post surplus food in seconds.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Snap a photo, set a pickup window, and your listing goes live
              instantly.
            </CardContent>
          </Card>
          <Card data-animate="card">
            <CardHeader>
              <CardTitle>Match nearby</CardTitle>
              <CardDescription>
                Charities and community fridges get notified in real time.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              We match listings to the closest recipients so food travels less
              and arrives fresh.
            </CardContent>
          </Card>
          <Card data-animate="card">
            <CardHeader>
              <CardTitle>Rescue &amp; track</CardTitle>
              <CardDescription>
                Every pickup is logged so impact is easy to see.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Track meals rescued, kilograms diverted from landfill, and CO2
              saved.
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="w-full border-t py-6">
        <p className="text-center text-sm text-muted-foreground">
          RescuFood — a NUS-ISS Team 1 project
        </p>
      </footer>
    </div>
  );
}
