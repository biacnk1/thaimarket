"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signIn, type AuthActionState } from "@/lib/auth/actions";

const initialState: AuthActionState = {
  status: "idle",
  message: ""
};

export function LoginForm({ redirectTo, initialMessage = "" }: { redirectTo: string; initialMessage?: string }) {
  const [state, formAction, isPending] = useActionState(signIn, initialState);
  const message = state.message || initialMessage;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="login">
          Username
        </label>
        <input
          id="login"
          name="login"
          type="text"
          autoComplete="username"
          required
          className="w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
          placeholder="macrowolf"
        />
        <p className="mt-1 text-xs text-slate-500">Email still works for account recovery.</p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
          placeholder="Your password"
        />
      </div>

      {message && (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(34,211,238,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Signing in..." : "Login"}
      </button>

      <p className="text-center text-sm text-slate-400">
        New here?{" "}
        <Link href={`/register?next=${encodeURIComponent(redirectTo)}`} className="text-cyan-200 hover:text-cyan-100">
          Create an account
        </Link>
      </p>
    </form>
  );
}
