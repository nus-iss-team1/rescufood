"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { AuthError } from "next-auth";

import { signIn } from "@/auth";
import {
  addUserToGroup,
  confirmSignUpUser,
  resendConfirmationCode,
  signUpUser,
} from "@/lib/cognito";

export async function signInWithCognito() {
  await signIn("cognito", { redirectTo: "/dashboard" });
}

export type FormState = {
  error?: string;
  /** signup flow: which step to render */
  step?: "details" | "confirm";
  email?: string;
};

export async function loginAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
    return {};
  } catch (err) {
    if (isRedirectError(err)) throw err; // successful sign-in redirects
    if (err instanceof AuthError) {
      return {
        error:
          "Sign-in failed. Check your email and password, and make sure your account is verified.",
      };
    }
    throw err;
  }
}

const PASSWORD_RULE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,}$/;

export async function signUpAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "");

  if (!name || !email || !password) {
    return { step: "details", error: "Please fill in every field." };
  }
  if (role !== "donor" && role !== "rescue-partner") {
    return { step: "details", error: "Please choose a role." };
  }
  if (!PASSWORD_RULE.test(password)) {
    return {
      step: "details",
      error:
        "Password must be at least 12 characters with upper- and lowercase letters and a number.",
    };
  }

  try {
    await signUpUser(email, password, name);
  } catch (err) {
    const code = (err as { name?: string }).name;
    if (code === "UsernameExistsException") {
      return {
        step: "details",
        error: "An account with this email already exists. Try signing in.",
      };
    }
    return {
      step: "details",
      error: "Sign-up failed. Please check your details and try again.",
    };
  }

  try {
    await addUserToGroup(email, role);
  } catch {
    // Non-fatal: an admin can assign the role later.
  }

  return { step: "confirm", email };
}

export async function confirmSignUpAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !code) {
    return { step: "confirm", email, error: "Please enter the code." };
  }

  try {
    await confirmSignUpUser(email, code);
  } catch {
    return {
      step: "confirm",
      email,
      error: "That code didn't work. Check the digits or resend a new one.",
    };
  }

  // Sign the fresh account in when the form carried the password through;
  // otherwise land on the login page.
  if (password) {
    try {
      await signIn("credentials", {
        email,
        password,
        redirectTo: "/dashboard",
      });
    } catch (err) {
      if (isRedirectError(err)) throw err;
    }
  }
  return { step: "confirm", email, error: "Verified! You can sign in now." };
}

export async function resendCodeAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (email) {
    try {
      await resendConfirmationCode(email);
    } catch {
      // Rate-limited or unknown user; keep quiet either way.
    }
  }
  return { step: "confirm", email, error: "A new code has been sent." };
}
