"use client";

import { useActionState } from "react";

import { updateProfile, type AuthActionState } from "@/lib/auth/actions";

type ProfileFormValues = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

const initialState: AuthActionState = {
  status: "idle",
  message: ""
};

export function ProfileSettingsForm({ profile }: { profile: ProfileFormValues }) {
  const [state, formAction, isPending] = useActionState(updateProfile, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="display-name">
          Display name
        </label>
        <input
          id="display-name"
          name="display_name"
          type="text"
          maxLength={60}
          defaultValue={profile.display_name ?? ""}
          className="w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
          placeholder="Your public name"
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
          defaultValue={profile.username ?? ""}
          readOnly
          className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-slate-400 outline-none"
          placeholder="marketguru"
        />
        <p className="mt-1 text-xs text-slate-500">Username is locked after signup. Display name is your public persona.</p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="avatar-url">
          Avatar URL
        </label>
        <input
          id="avatar-url"
          name="avatar_url"
          type="url"
          defaultValue={profile.avatar_url ?? ""}
          className="w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
          placeholder="https://..."
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="bio">
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={4}
          maxLength={280}
          defaultValue={profile.bio ?? ""}
          className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
          placeholder="What markets do you understand best?"
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
        className="rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(34,211,238,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}
