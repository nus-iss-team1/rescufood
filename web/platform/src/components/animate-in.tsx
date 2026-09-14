"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";

gsap.registerPlugin(useGSAP);

/**
 * Calm entrance for a block of content: the container rises in, then any
 * children tagged with data-animate="field" follow with a soft stagger.
 * Timing follows the design-system motion vocabulary.
 */
export function AnimateIn({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(ref.current, {
          y: 24,
          autoAlpha: 0,
          duration: 0.8,
          ease: "power3.out",
        });
        // Scoped: an unscoped selector matches every field on the page.
        const fields = gsap.utils.toArray<HTMLElement>(
          "[data-animate=field]",
          ref.current,
        );
        if (fields.length) {
          gsap.from(fields, {
            y: 16,
            autoAlpha: 0,
            duration: 0.6,
            stagger: 0.08,
            delay: 0.15,
            ease: "power3.out",
          });
        }
      });
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
