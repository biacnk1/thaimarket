import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentProfile, getCurrentUser } from "@/lib/auth/server";
import { canUseSupabase } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PredictionHistoryRow = {
  id: string;
  side: "YES" | "NO";
  amount: number;
  result_status: "pending" | "won" | "lost";
  payout_amount: number;
  created_at: string;
  markets: {
    title: string;
    slug: string | null;
  } | null;
};

type RawPredictionHistoryRow = Omit<PredictionHistoryRow, "markets"> & {
  markets: PredictionHistoryRow["markets"] | PredictionHistoryRow["markets"][];
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

async function getPredictionHistory(userId: string) {
  if (!canUseSupabase()) {
    return [];
  }

  const supabase = createSupabaseAdminClient() ?? (await createSupabaseServerClient());
  const { data, error } = await supabase
    .from("predictions")
    .select("id, side, amount, result_status, payout_amount, created_at, markets(title, slug)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Could not load prediction history:", error.message);
    return [];
  }

  return ((data ?? []) as RawPredictionHistoryRow[]).map((prediction) => ({
    ...prediction,
    markets: Array.isArray(prediction.markets)
      ? prediction.markets[0] ?? null
      : prediction.markets
  }));
}

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/profile");
  }

  const profile = await getCurrentProfile();
  const predictions = await getPredictionHistory(user.id);
  const displayName = profile?.display_name || user.email?.split("@")[0] || "ThaiMarket user";
  const username = profile?.username ? `@${profile.username}` : "No username yet";
  const pictureUrl = profile?.profile_picture_url ?? profile?.avatar_url;

  return (
    <main className="min-h-screen bg-[#0B0F19] px-4 py-8 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl">
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {pictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pictureUrl}
                  alt={displayName}
                  className="h-20 w-20 rounded-3xl border border-white/10 object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-cyan-300/30 bg-cyan-400/15 text-2xl font-bold text-cyan-100">
                  {getInitials(displayName)}
                </div>
              )}
              <div>
                <p className="mb-1 text-sm text-cyan-200">Predictor profile</p>
                <h1 className="text-3xl font-bold">{displayName}</h1>
                <p className="mt-1 text-sm text-slate-400">{username}</p>
              </div>
            </div>
            <Link
              href="/settings/profile"
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm text-slate-200 hover:bg-white/[0.08]"
            >
              Edit profile
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">Points</p>
              <p className="mt-2 text-3xl font-bold text-emerald-300">{profile?.points_balance ?? 1000}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">Account</p>
              <p className="mt-2 text-sm font-semibold text-white">{user.email}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">Status</p>
              <p className="mt-2 text-sm font-semibold text-cyan-200">Ready to predict</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="mb-2 text-sm font-medium text-slate-200">Bio</p>
            <p className="text-sm leading-6 text-slate-400">
              {profile?.bio || "Add a short bio so other predictors know your edge."}
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-200">Prediction history</p>
                <p className="mt-1 text-xs text-slate-500">Your latest YES/NO positions and payouts.</p>
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400">
                {predictions.length} total
              </span>
            </div>

            {predictions.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-slate-400">
                No predictions yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] border-separate border-spacing-y-2 text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Market</th>
                      <th className="px-3 py-2 font-medium">Side</th>
                      <th className="px-3 py-2 font-medium">Amount</th>
                      <th className="px-3 py-2 font-medium">Time</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Payout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictions.map((prediction) => {
                      const marketHref = prediction.markets?.slug
                        ? `/markets/${prediction.markets.slug}`
                        : "#";

                      return (
                        <tr key={prediction.id} className="rounded-2xl bg-white/[0.035] text-slate-300">
                          <td className="rounded-l-2xl px-3 py-3">
                            {prediction.markets?.slug ? (
                              <Link href={marketHref} className="font-medium text-white hover:text-cyan-200">
                                {prediction.markets.title}
                              </Link>
                            ) : (
                              <span className="font-medium text-white">Market unavailable</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <span className={prediction.side === "YES" ? "text-emerald-300" : "text-rose-300"}>
                              {prediction.side}
                            </span>
                          </td>
                          <td className="px-3 py-3">{prediction.amount}</td>
                          <td className="px-3 py-3 text-slate-400">{formatDateTime(prediction.created_at)}</td>
                          <td className="px-3 py-3 capitalize">{prediction.result_status}</td>
                          <td className="rounded-r-2xl px-3 py-3">{prediction.payout_amount}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
