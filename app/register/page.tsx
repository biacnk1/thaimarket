import { redirect } from "next/navigation";

import { RegisterForm } from "@/app/register/RegisterForm";
import { getCurrentUser } from "@/lib/auth/server";

type RegisterPageProps = {
  searchParams?: Promise<{
    next?: string | string[];
  }>;
};

function readNextPath(value: string | string[] | undefined) {
  const next = Array.isArray(value) ? value[0] : value;

  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/profile";
  }

  return next;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = searchParams ? await searchParams : {};
  const redirectTo = readNextPath(params.next);
  const user = await getCurrentUser();

  if (user) {
    redirect(redirectTo);
  }

  return (
    <main className="min-h-screen bg-[#0B0F19] px-4 py-10 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl backdrop-blur-xl">
        <div className="mb-6">
          <p className="mb-2 text-sm text-cyan-200">Join the signal layer</p>
          <h1 className="text-3xl font-bold">Create your account</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Start with a public handle and basic demographic fields. Profile details can grow later.
          </p>
        </div>
        <RegisterForm redirectTo={redirectTo} />
      </section>
    </main>
  );
}
