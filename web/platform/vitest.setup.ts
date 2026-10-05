import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Next.js aliases "server-only" to a no-op in server bundles and to a
// throwing stub in client bundles - a build-time trick, not a runtime
// check. Under plain Node resolution its index.js always throws, so it
// needs mocking here for every server-only lib spec.
vi.mock("server-only", () => ({}));

// GSAP entrance animations set opacity:0/visibility:hidden as their
// starting state, which jsdom never animates away from - that would hide
// every animated element from accessible queries. Animation is visual
// polish, not logic under test, so it's mocked out entirely here.
vi.mock("gsap", () => {
  const gsap = {
    registerPlugin: vi.fn(),
    from: vi.fn(),
    to: vi.fn(),
    set: vi.fn(),
    utils: { toArray: () => [] },
    // AnimateIn gates its entrance animation behind a reduced-motion media
    // query via gsap.matchMedia(); invoke the callback unconditionally so
    // the wrapped gsap.from/toArray calls above still run under test.
    matchMedia: () => ({
      add: (_query: string, callback: () => void) => callback(),
      revert: vi.fn(),
    }),
  };
  return { gsap, default: gsap };
});
vi.mock("gsap/ScrollTrigger", () => ({ ScrollTrigger: {} }));
vi.mock("@gsap/react", () => ({
  useGSAP: (callback: () => void) => callback(),
}));

// jsdom has no matchMedia; gsap's ScrollTrigger calls it on registration.
// Guarded because server-only lib specs run in the node environment, where
// there's no window at all.
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
