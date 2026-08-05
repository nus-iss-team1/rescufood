"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { AuthError } from "next-auth";

import { auth, signIn, signOut } from "@/auth";
import {
  addUserToGroup,
  confirmSignUpUser,
  emailInUse,
  resendConfirmationCode,
  signUpUser,
} from "@/lib/cognito";
import { createOrganisation, ProfileApiError } from "@/lib/profile";

export async function signInWithCognito() {
  await signIn("cognito", { redirectTo: "/dashboard" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

export type FormState = {
  error?: string;
  /** signup flow: which step to render */
  step?: "details" | "confirm";
  username?: string;
  email?: string;
};

export async function loginAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) {
    return { error: "Please enter your username and password." };
  }

  try {
    await signIn("credentials", {
      username,
      password,
      redirectTo: "/dashboard",
    });
    return {};
  } catch (err) {
    if (isRedirectError(err)) throw err; // successful sign-in redirects
    if (err instanceof AuthError) {
      return {
        error:
          "Sign-in failed. Check your username and password, and make sure your account is verified.",
      };
    }
    throw err;
  }
}

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const USERNAME_RULE = /^[a-zA-Z0-9._-]{3,32}$/;

export async function signUpAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const username = String(formData.get("username") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "");

  if (!username || !name || !email || !password) {
    return { step: "details", error: "Please fill in every field." };
  }
  if (!USERNAME_RULE.test(username)) {
    return {
      step: "details",
      error:
        "Username must be 3-32 characters: letters, numbers, dots, dashes, or underscores.",
    };
  }
  if (role !== "donor" && role !== "rescue-partner") {
    return { step: "details", error: "Please choose a role." };
  }
  if (!PASSWORD_RULE.test(password)) {
    return {
      step: "details",
      error:
        "Password must be at least 8 characters with upper- and lowercase letters and a number.",
    };
  }

  try {
    if (await emailInUse(email)) {
      return {
        step: "details",
        error:
          "An account with this email already exists. Try signing in instead.",
      };
    }
  } catch {
    // Pre-check unavailable - the pool's email alias still enforces
    // uniqueness at verification time.
  }

  try {
    await signUpUser(username, email, password, name);
  } catch (err) {
    const code = (err as { name?: string }).name;
    if (code === "UsernameExistsException") {
      return {
        step: "details",
        error: "That username is taken. Try another one.",
      };
    }
    return {
      step: "details",
      error: "Sign-up failed. Please check your details and try again.",
    };
  }

  try {
    await addUserToGroup(username, role);
  } catch {
    // Non-fatal: an admin can assign the role later.
  }

  return { step: "confirm", username, email };
}

export async function confirmSignUpAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const username = String(formData.get("username") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !code) {
    return { step: "confirm", username, error: "Please enter the code." };
  }

  try {
    await confirmSignUpUser(username, code);
  } catch {
    return {
      step: "confirm",
      username,
      error: "That code didn't work. Check the digits or resend a new one.",
    };
  }

  // Sign the fresh account in when the form carried the password through;
  // otherwise land on the login page.
  if (password) {
    try {
      await signIn("credentials", {
        username,
        password,
        redirectTo: "/dashboard",
      });
    } catch (err) {
      if (isRedirectError(err)) throw err;
    }
  }
  return {
    step: "confirm",
    username,
    error: "Verified! You can sign in now.",
  };
}

export async function resendCodeAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const username = String(formData.get("username") ?? "").trim();
  if (username) {
    try {
      await resendConfirmationCode(username);
    } catch {
      // Rate-limited or unknown user; keep quiet either way.
    }
  }
  return { step: "confirm", username, error: "A new code has been sent." };
}

export type OrgFormState = {
  error?: string;
};

export async function createOrgAction(
  _prev: OrgFormState,
  formData: FormData
): Promise<OrgFormState> {
  const session = await auth();
  if (!session?.idToken) {
    return { error: "Your session has expired. Please sign in again." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const contactEmail = String(formData.get("contact_email") ?? "").trim();
  if (!name || !contactEmail) {
    return { error: "Please fill in the organisation name and contact email." };
  }
  if (type !== "donor" && type !== "rescue_partner") {
    return { error: "Please choose an organisation type." };
  }

  try {
    await createOrganisation(session.idToken, {
      name,
      type,
      domain: String(formData.get("domain") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      contact_email: contactEmail,
      contact_phone: String(formData.get("contact_phone") ?? "").trim(),
      address: String(formData.get("address") ?? "").trim(),
    });
  } catch (err) {
    if (err instanceof ProfileApiError) {
      return { error: err.message };
    }
    return { error: "Registration failed. Please try again shortly." };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
