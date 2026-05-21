import { redirect } from "next/navigation";

import { LoginForm } from "@/app/login/LoginForm";
import { getCurrentUser } from "@/lib/auth/server";

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string | string[];
    error?: string | string[];
  }>;
};

function readNextPath(value: string | string[] | undefined) {
  const next = Array.isArray(value) ? value[0] : value;

  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/feed";
  }

  return next;
}

function readLoginMessage(value: string | string[] | undefined) {
  const error = Array.isArray(value) ? value[0] : value;

  if (error === "auth_callback_failed") {
    return "Could not confirm the email link. Request a new link or try logging in again.";
  }

  return "";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : {};
  const redirectTo = readNextPath(params.next);
  const loginMessage = readLoginMessage(params.error);
  const user = await getCurrentUser();

  if (user) {
    redirect("/feed");
  }

  return (
    <main className="min-h-screen bg-[#0B0F19] px-4 py-10 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl backdrop-blur-xl">
        <div className="mb-6">
          <p className="mb-2 text-sm text-cyan-200">Welcome back</p>
          <h1 className="text-3xl font-bold">Login to ThaiMarket</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Sign in with your username to predict, comment, and build your public signal.
          </p>
        </div>
        <LoginForm redirectTo={redirectTo} initialMessage={loginMessage} />
      </section>
    </main>
  );
}
