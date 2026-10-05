import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignupForm } from "./signup-form";

const { signUpAction, confirmSignUpAction, resendCodeAction } = vi.hoisted(
  () => ({
    signUpAction: vi.fn(),
    confirmSignUpAction: vi.fn(),
    resendCodeAction: vi.fn(),
  }),
);

// The real actions module pulls in next-auth and the Cognito client; the
// form only needs the action functions, whose behaviour has its own spec.
vi.mock("@/app/actions", () => ({
  signUpAction,
  confirmSignUpAction,
  resendCodeAction,
}));

const confirmState = {
  step: "confirm" as const,
  username: "alice",
  email: "alice@example.org",
};

async function fillDetails(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Username"), "alice");
  await user.type(screen.getByLabelText("Full name"), "Alice Tan");
  await user.type(screen.getByLabelText("Email"), "alice@example.org");
  await user.type(screen.getByLabelText("Password"), "Secret123");
  await user.click(screen.getByRole("button", { name: "Create account" }));
}

/** Last FormData an action was called with, as a plain object. */
function lastFields(action: ReturnType<typeof vi.fn>) {
  return Object.fromEntries(action.mock.lastCall![1] as FormData);
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("SignupForm", () => {
  it("shows the error from a rejected sign-up and stays on the details step", async () => {
    const user = userEvent.setup();
    signUpAction.mockResolvedValue({
      step: "details",
      error: "That username is taken.",
    });
    render(<SignupForm />);

    await fillDetails(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That username is taken.",
    );
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeInTheDocument();
  });

  it("moves to the verification step naming the email and username", async () => {
    const user = userEvent.setup();
    signUpAction.mockResolvedValue(confirmState);
    render(<SignupForm />);

    await fillDetails(user);

    expect(
      await screen.findByLabelText("Verification code"),
    ).toBeInTheDocument();
    expect(screen.getByText("alice@example.org")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it("verifies with the code, the username and the password from the first step", async () => {
    const user = userEvent.setup();
    signUpAction.mockResolvedValue(confirmState);
    confirmSignUpAction.mockResolvedValue(confirmState);
    render(<SignupForm />);

    await fillDetails(user);
    await user.type(await screen.findByLabelText("Verification code"), "123456");
    await user.click(screen.getByRole("button", { name: "Verify & sign in" }));

    expect(lastFields(confirmSignUpAction)).toEqual({
      username: "alice",
      password: "Secret123",
      code: "123456",
    });
  });

  it("shows the error from a rejected verification code", async () => {
    const user = userEvent.setup();
    signUpAction.mockResolvedValue(confirmState);
    confirmSignUpAction.mockResolvedValue({
      ...confirmState,
      error: "That code is incorrect.",
    });
    render(<SignupForm />);

    await fillDetails(user);
    await user.type(await screen.findByLabelText("Verification code"), "000000");
    await user.click(screen.getByRole("button", { name: "Verify & sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That code is incorrect.",
    );
  });

  it("resends the code for the same username and shows any failure", async () => {
    const user = userEvent.setup();
    signUpAction.mockResolvedValue(confirmState);
    resendCodeAction.mockResolvedValue({
      error: "Too many attempts. Try again later.",
    });
    render(<SignupForm />);

    await fillDetails(user);
    await user.click(await screen.findByRole("button", { name: "Resend code" }));

    expect(lastFields(resendCodeAction)).toEqual({ username: "alice" });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Too many attempts. Try again later.",
    );
  });
});
