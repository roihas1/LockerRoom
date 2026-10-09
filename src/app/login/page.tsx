import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { he } from "@/config/strings";
import { safeAdminNext } from "@/lib/auth/safe-next";
import { isDemoMode } from "@/lib/supabase/env";
import { createSessionClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: he.auth.title };

async function isSignedInAdmin(): Promise<boolean> {
  const client = await createSessionClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return false;
  const { data: profile } = await client.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return profile?.role === "admin";
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const nextPath = safeAdminNext(typeof sp.next === "string" ? sp.next : undefined);
  const demo = isDemoMode();
  if (!demo && (await isSignedInAdmin())) redirect(nextPath);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-bold">{he.auth.title}</h1>
      <p className="mt-2 text-muted">{he.auth.subtitle}</p>
      <div className="mt-8">
        <LoginForm nextPath={nextPath} demo={demo} />
      </div>
      <Link href="/" className="mt-8 text-sm font-semibold text-team">
        {he.actions.toHome}
      </Link>
    </div>
  );
}
