import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Landing } from "./landing";

describe("Landing", () => {
  it("links the primary calls to action to the signup flow", () => {
    render(<Landing />);

    expect(screen.getByRole("link", { name: /donate food/i })).toHaveAttribute(
      "href",
      "/signup",
    );
    expect(
      screen.getByRole("link", { name: /find food near you/i }),
    ).toHaveAttribute("href", "/signup");
  });

  it("links sign in to the login page", () => {
    render(<Landing />);

    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});
