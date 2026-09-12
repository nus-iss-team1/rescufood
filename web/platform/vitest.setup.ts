import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

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
  };
  return { gsap, default: gsap };
});
vi.mock("gsap/ScrollTrigger", () => ({ ScrollTrigger: {} }));
vi.mock("@gsap/react", () => ({
  useGSAP: (callback: () => void) => callback(),
}));

// jsdom has no matchMedia; gsap's ScrollTrigger calls it on registration.
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
