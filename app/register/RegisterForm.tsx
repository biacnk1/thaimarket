"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signUp, type AuthActionState } from "@/lib/auth/actions";

const initialState: AuthActionState = {
  status: "idle",
  message: ""
};

export function RegisterForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, isPending] = useActionState(signUp, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="display-name">
          Display name
        </label>
        <input
          id="display-name"
          name="display_name"
          type="text"
          maxLength={60}
          required
          className="w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
          placeholder="Bank.J"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          minLength={3}
          maxLength={24}
          required
          pattern="[A-Za-z0-9_]+"
          className="w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
          placeholder="marketguru"
        />
        <p className="mt-1 text-xs text-slate-500">Immutable profile handle. Letters, numbers, and underscores only.</p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
          placeholder="you@example.com"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="age">
            Age
          </label>
          <input
            id="age"
            name="age"
            type="number"
            min={13}
            max={120}
            required
            className="w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
            placeholder="28"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="gender">
            Gender
          </label>
          <select
            id="gender"
            name="gender"
            required
            defaultValue=""
            className="w-full rounded-2xl border border-white/10 bg-[#101623] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
          >
            <option value="" disabled>
              Select
            </option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="non_binary">Non-binary</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="province">
          Province
        </label>
        <input
          id="province"
          name="province"
          type="text"
          maxLength={60}
          required
          className="w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
          placeholder="Bangkok"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          className="w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
          placeholder="At least 6 characters"
        />
      </div>

      {state.message && (
        <div
          className={
            state.status === "success"
              ? "rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100"
              : "rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100"
          }
        >
          {state.message}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(34,211,238,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Creating account..." : "Sign up"}
      </button>

      <p className="text-center text-sm text-slate-400">
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(redirectTo)}`} className="text-cyan-200 hover:text-cyan-100">
          Login
        </Link>
      </p>
    </form>
  );
}
