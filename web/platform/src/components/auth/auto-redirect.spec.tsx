import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AutoRedirect } from "./auto-redirect";

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  replaceMock.mockClear();
});

describe("AutoRedirect", () => {
  it("counts down from the given seconds", () => {
    render(<AutoRedirect to="/login" seconds={5} />);
    expect(
      screen.getByText("Taking you to sign in in 5s."),
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(
      screen.getByText("Taking you to sign in in 4s."),
    ).toBeInTheDocument();
  });

  it("defaults to a 5 second countdown", () => {
    render(<AutoRedirect to="/login" />);
    expect(
      screen.getByText("Taking you to sign in in 5s."),
    ).toBeInTheDocument();
  });

  it("redirects to the target route once the countdown reaches zero", () => {
    render(<AutoRedirect to="/login" seconds={2} />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(replaceMock).toHaveBeenCalledWith("/login");
  });

  it("never displays a negative countdown", () => {
    render(<AutoRedirect to="/login" seconds={1} />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(
      screen.getByText("Taking you to sign in in 0s."),
    ).toBeInTheDocument();
  });

  it("does not redirect after it has been unmounted", () => {
    const { unmount } = render(<AutoRedirect to="/login" seconds={2} />);

    unmount();
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(replaceMock).not.toHaveBeenCalled();
  });
});
