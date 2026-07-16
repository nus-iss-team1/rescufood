"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, ScrollSmoother, useGSAP);

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useGSAP(() => {
    ScrollSmoother.create({
      smooth: 1.2,
      effects: true,
      normalizeScroll: true,
    });
  });

  return (
    <div id="smooth-wrapper">
      {/* pt-16 clears the fixed SiteHeader (h-16) */}
      <div id="smooth-content" className="pt-16">
        {children}
      </div>
    </div>
  );
}
