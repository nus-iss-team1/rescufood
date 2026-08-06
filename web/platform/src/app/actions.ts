"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { AuthError } from "next-auth";

import { auth, signIn, signOut } from "@/auth";
import {
  changePassword,
  confirmSignUpUser,
  emailInUse,
  resendConfirmationCode,
  signUpUser,
} from "@/lib/cognito";
import {
  lookupOrganisation,
  registerOrganisation,
  ProfileApiError,
} from "@/lib/profile";

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
  if (!PASSWORD_RULE.test(password)) {
    return {
      step: "details",
      error:
        "Password must be at least 8 characters with upper- and lowercase letters and a number.",
    };
  }

  // Signup gate: accounts exist only under approved organisations.
  const emailDomain = email.split("@").pop()?.toLowerCase() ?? "";
  try {
    const org = await lookupOrganisation(emailDomain);
    if (!org.registered) {
      return {
        step: "details",
        error:
          "No registered organisation matches your email domain. Register your organisation first.",
      };
    }
    if (!org.approved) {
      return {
        step: "details",
        error:
          "Your organisation's registration is still under review. Try again once it has been approved.",
      };
    }
  } catch {
    return {
      step: "details",
      error: "We couldn't verify your organisation right now. Please try again shortly.",
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

  let confirmed = false;
  try {
    ({ confirmed } = await signUpUser(username, email, password, name));
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

  // Dev pools auto-confirm via a pre-sign-up trigger; sign in directly.
  if (confirmed) {
    try {
      await signIn("credentials", {
        username,
        password,
        redirectTo: "/dashboard",
      });
    } catch (err) {
      if (isRedirectError(err)) throw err;
    }
    return { step: "details", error: "Account created. Please sign in." };
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
  /** set when the registration was submitted successfully */
  domain?: string;
};

export async function registerOrgAction(
  _prev: OrgFormState,
  formData: FormData
): Promise<OrgFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const domain = String(formData.get("domain") ?? "").trim();
  const contactEmail = String(formData.get("contact_email") ?? "").trim();
  if (!name || !contactEmail || !domain) {
    return {
      error: "Please fill in the organisation name, email domain and contact email.",
    };
  }
  if (type !== "donor" && type !== "rescue_partner") {
    return { error: "Please choose an organisation type." };
  }

  try {
    const org = await registerOrganisation({
      name,
      type,
      domain,
      description: String(formData.get("description") ?? "").trim(),
      contact_email: contactEmail,
      contact_phone: String(formData.get("contact_phone") ?? "").trim(),
      address: String(formData.get("address") ?? "").trim(),
    });
    return { domain: org.domain };
  } catch (err) {
    if (err instanceof ProfileApiError) {
      return { error: err.message };
    }
    return { error: "Registration failed. Please try again shortly." };
  }
}

export type PasswordFormState = {
  error?: string;
  done?: boolean;
};

export async function changePasswordAction(
  _prev: PasswordFormState,
  formData: FormData
): Promise<PasswordFormState> {
  const session = await auth();
  const username = session?.user?.username;
  if (!username) {
    return { error: "Your session has expired. Please sign in again." };
  }

  const current = String(formData.get("current_password") ?? "");
  const next = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (!current || !next || !confirm) {
    return { error: "Please fill in every field." };
  }
  if (next !== confirm) {
    return { error: "The new passwords do not match." };
  }
  if (next === current) {
    return { error: "The new password must differ from the current one." };
  }
  if (!PASSWORD_RULE.test(next)) {
    return {
      error:
        "Password must be at least 8 characters with upper- and lowercase letters and a number.",
    };
  }

  try {
    await changePassword(username, current, next);
  } catch (err) {
    switch ((err as { name?: string }).name) {
      case "NotAuthorizedException":
        return { error: "Your current password is incorrect." };
      case "InvalidPasswordException":
        return { error: "Cognito rejected that password. Try a different one." };
      case "LimitExceededException":
        return { error: "Too many attempts. Please try again in a few minutes." };
      default:
        return { error: "Could not change your password. Please try again." };
    }
  }

  return { done: true };
}
