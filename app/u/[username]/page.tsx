import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Coins, Radio, UserRound } from "lucide-react";

import { getLocalProfileByUsername } from "@/lib/dev/local-store";
import { canUseSupabase, isLocalMode } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PublicProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  reputation: number;
  points_balance: number;
};

type PageProps = {
  params: Promise<{
    username: string;
  }>;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

async function getPublicProfile(username: string) {
  const normalized = username.trim().toLowerCase();

  if (!/^[a-z0-9_]{3,24}$/.test(normalized)) {
    return null;
  }

  if (isLocalMode() || !canUseSupabase()) {
    return getLocalProfileByUsername(normalized);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, reputation, points_balance")
    .eq("username", normalized)
    .maybeSingle();

  if (error) {
    console.error("Could not load public profile:", error.message);
    return null;
  }

  return data as PublicProfile | null;
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;
  const profile = await getPublicProfile(username);

  if (!profile) {
    notFound();
  }

  const displayName = profile.display_name || profile.username || "Predictor";

  return (
    <main className="min-h-screen bg-[#090D14] px-4 py-8 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-3xl">
        <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm text-cyan-200 hover:text-cyan-100">
          <ArrowLeft size={16} /> Back to feed
        </Link>

        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/25">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="h-20 w-20 rounded-2xl border border-white/10 object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-400/15 text-2xl font-bold text-cyan-100">
                  {profile.username ? getInitials(displayName) : <UserRound size={26} />}
                </div>
              )}
              <div>
                <p className="mb-1 text-sm text-cyan-200">Predictor</p>
                <h1 className="text-3xl font-bold">{displayName}</h1>
                <p className="mt-1 text-sm text-slate-400">@{profile.username}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
              <Coins className="mb-2 text-emerald-300" size={18} />
              <p className="text-xs text-slate-500">Points</p>
              <p className="mt-1 text-xl font-bold text-white">{profile.points_balance}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
              <Radio className="mb-2 text-cyan-300" size={18} />
              <p className="text-xs text-slate-500">Reputation</p>
              <p className="mt-1 text-xl font-bold text-white">{profile.reputation}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
              <UserRound className="mb-2 text-indigo-300" size={18} />
              <p className="text-xs text-slate-500">Handle</p>
              <p className="mt-1 truncate text-xl font-bold text-white">@{profile.username}</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/15 p-5">
            <p className="mb-2 text-sm font-medium text-slate-200">Edge</p>
            <p className="text-sm leading-6 text-slate-400">
              {profile.bio || "This predictor has not added a public edge yet."}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
