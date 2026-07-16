"use server";

import { signIn } from "@/auth";

export async function signInWithCognito() {
  await signIn("cognito", { redirectTo: "/dashboard" });
}
