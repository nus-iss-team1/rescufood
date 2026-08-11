import { redirect } from "next/navigation";

import { auth, authConfigured } from "@/auth";
import { Landing } from "@/components/landing";

export default async function Home() {
  const session = authConfigured ? await auth() : null;
  if (session?.user) redirect("/dashboard");

  return <Landing />;
}
