"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, ScrollSmoother, useGSAP);

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useGSAP(() => {
    ScrollSmoother.create({
      smooth: 1.2,
      effects: true,
      // Without this, normalizing swallows wheel and touch events over
      // regions with their own overflow, such as the listings list.
      normalizeScroll: { allowNestedScroll: true },
    });
  });

  // This layout survives navigation, so the smoother keeps the height it
  // measured on the first page and cuts off anything taller. Remeasure per
  // route, and land at the top of the new one.
  useEffect(() => {
    ScrollSmoother.get()?.scrollTo(0, false);
    ScrollTrigger.refresh();
  }, [pathname]);

  // Content that grows after render - fonts, images, expanding fields -
  // moves the bottom of the page past the measured height.
  useEffect(() => {
    const content = document.getElementById("smooth-content");
    if (!content) return;
    const observer = new ResizeObserver(() => ScrollTrigger.refresh());
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return (
    <div id="smooth-wrapper">
      {/* pt-16 clears the fixed SiteHeader (h-16) */}
      <div id="smooth-content" className="pt-16">
        {children}
      </div>
    </div>
  );
}
