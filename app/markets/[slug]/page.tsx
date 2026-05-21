import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart3, CalendarDays, CheckCircle2, Coins, ListChecks, Sparkles, UserRound } from "lucide-react";

import { isAdminUser } from "@/lib/auth/admin";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/server";
import { canUseSupabase } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminResolveForm } from "./AdminResolveForm";
import { MarketDiscussion } from "@/app/MarketDiscussion";
import { PredictionForm } from "./PredictionForm";

type Market = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: "open" | "closed" | "resolved";
  resolved_outcome: "YES" | "NO" | null;
  resolved_at: string | null;
  close_date: string | null;
  closes_at: string | null;
  slug: string | null;
  creator_user_id: string | null;
  creator_display_name?: string | null;
  creator_username?: string | null;
  creator_avatar_url?: string | null;
  creator_profile_picture_url?: string | null;
  created_at: string | null;
  total_predictions: number | null;
  total_votes?: number | null;
  total_volume: number | null;
  yes_percentage: number | null;
  no_percentage?: number | null;
  yes_count?: number | null;
  no_count?: number | null;
  yes_votes?: number | null;
  no_votes?: number | null;
  yes_votes_count?: number | null;
  no_votes_count?: number | null;
  yes_amount: number | null;
  no_amount: number | null;
  yes_points?: number | null;
  no_points?: number | null;
  yes_points_volume?: number | null;
  no_points_volume?: number | null;
};

type Prediction = {
  id: string;
  side: "YES" | "NO";
  amount: number;
  result_status: "pending" | "won" | "lost";
  payout_amount: number;
  created_at: string;
};

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function formatDate(value: string | null) {
  if (!value) return "No close date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No close date";

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function statusClass(status: Market["status"]) {
  if (status === "open") return "border-emerald-300/30 bg-emerald-400/10 text-emerald-100";
  if (status === "resolved") return "border-cyan-300/30 bg-cyan-400/10 text-cyan-100";
  return "border-slate-300/20 bg-slate-300/10 text-slate-200";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function toNumber(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function getConsensus(market: Market) {
  const yesVotes = toNumber(market.yes_votes_count ?? market.yes_votes ?? market.yes_count);
  const noVotes = toNumber(market.no_votes_count ?? market.no_votes ?? market.no_count);
  const totalVotes = yesVotes + noVotes;

  if (totalVotes === 0) {
    return {
      yesVotes,
      noVotes,
      yesPercentage: 0,
      noPercentage: 0
    };
  }

  const yesPercentage = Math.round((yesVotes / totalVotes) * 100);

  return {
    yesVotes,
    noVotes,
    yesPercentage,
    noPercentage: 100 - yesPercentage
  };
}

function getCreator(market: Market) {
  const hasCreator = Boolean(market.creator_user_id || market.creator_username || market.creator_display_name);
  const displayName = hasCreator
    ? market.creator_display_name || market.creator_username || "Predictor"
    : "ThaiMarket Board";
  const href = market.creator_username
    ? `/profile/${market.creator_username}`
    : market.creator_user_id
      ? `/profile/id/${market.creator_user_id}`
      : null;

  return {
    displayName,
    href,
    pictureUrl: market.creator_profile_picture_url ?? market.creator_avatar_url
  };
}

async function getMarket(slug: string) {
  if (!canUseSupabase()) return null;

  const supabase = await createSupabaseServerClient();
  const marketQuery = supabase.from("market_stats").select("*");
  const { data, error } = await (isUuid(slug)
    ? marketQuery.eq("id", slug).maybeSingle()
    : marketQuery.eq("slug", slug).maybeSingle());

  if (error) {
    console.error("Could not load market:", error.message);
    return null;
  }

  return data as Market | null;
}

async function getUserPredictions(userId: string, marketId: string) {
  const supabase = createSupabaseAdminClient() ?? (await createSupabaseServerClient());
  const { data, error } = await supabase
    .from("predictions")
    .select("id, side, amount, result_status, payout_amount, created_at")
    .eq("user_id", userId)
    .eq("market_id", marketId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Could not load user predictions:", error.message);
    return [];
  }

  return (data ?? []) as Prediction[];
}

export default async function MarketDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const market = await getMarket(slug);

  if (!market) {
    notFound();
  }

  const user = await getCurrentUser();
  const profile = user ? await getCurrentProfile() : null;
  const predictions = user ? await getUserPredictions(user.id, market.id) : [];
  const isAdmin = user ? await isAdminUser(user) : false;
  const { yesVotes, noVotes, yesPercentage, noPercentage } = getConsensus(market);
  const totalVoteCount = yesVotes + noVotes;
  const yesPoints = toNumber(market.yes_points_volume ?? market.yes_points ?? market.yes_amount);
  const noPoints = toNumber(market.no_points_volume ?? market.no_points ?? market.no_amount);
  const closeDate = market.close_date ?? market.closes_at;
  const creator = getCreator(market);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0B0F19] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div
        className="pointer-events-none fixed inset-0 opacity-90"
        style={{
          backgroundImage:
            "radial-gradient(circle at 42% -10%, rgba(34, 211, 238, 0.18), transparent 32%), radial-gradient(circle at 90% 18%, rgba(139, 92, 246, 0.18), transparent 28%), radial-gradient(circle at 4% 82%, rgba(16, 185, 129, 0.10), transparent 30%)"
        }}
      />
      <div className="relative mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_400px]">
        <section className="space-y-6">
          <Link href="/feed" className="text-sm text-cyan-200 hover:text-cyan-100">
            Back to markets
          </Link>

          <article className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
                <Sparkles size={13} /> Market
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                {market.category ?? "General"}
              </span>
              <span className={`rounded-full border px-3 py-1 text-xs uppercase ${statusClass(market.status)}`}>
                {market.status}
              </span>
              {market.resolved_outcome ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
                  <CheckCircle2 size={13} /> Resolved {market.resolved_outcome}
                </span>
              ) : null}
            </div>

            <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{market.title}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
              {market.description ?? "No description yet."}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              {creator.pictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={creator.pictureUrl}
                  alt={creator.displayName}
                  className="h-9 w-9 rounded-full border border-white/10 object-cover"
                />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300">
                  <UserRound size={16} />
                </span>
              )}
              <div className="min-w-0 text-sm">
                <p className="text-xs text-slate-500">Created by</p>
                {creator.href ? (
                  <Link href={creator.href} className="font-medium text-white hover:text-cyan-200">
                    {creator.displayName}
                  </Link>
                ) : (
                  <span className="font-medium text-white">{creator.displayName}</span>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <CalendarDays className="mb-2 text-cyan-200" size={18} />
                <p className="text-xs text-slate-500">Close date</p>
                <p className="mt-1 text-sm font-semibold text-white">{formatDate(closeDate)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <CalendarDays className="mb-2 text-indigo-200" size={18} />
                <p className="text-xs text-slate-500">Created</p>
                <p className="mt-1 text-sm font-semibold text-white">{formatDate(market.created_at)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <ListChecks className="mb-2 text-emerald-200" size={18} />
                <p className="text-xs text-slate-500">Predictions</p>
                <p className="mt-1 text-sm font-semibold text-white">{totalVoteCount}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <Coins className="mb-2 text-amber-200" size={18} />
                <p className="text-xs text-slate-500">Volume</p>
                <p className="mt-1 text-sm font-semibold text-white">{yesPoints + noPoints} points</p>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.035] p-5">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-emerald-200">YES {yesPercentage}%</span>
                <span className="text-rose-200">NO {noPercentage}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-900 ring-1 ring-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-300 to-violet-400 shadow-[0_0_24px_rgba(34,211,238,0.45)]"
                  style={{ width: `${yesPercentage}%` }}
                />
              </div>
              <div className="mt-3 flex justify-between text-xs text-slate-500">
                <span>{yesVotes} YES votes &bull; {yesPoints} points</span>
                <span className="text-right">{noVotes} NO votes &bull; {noPoints} points</span>
              </div>
            </div>
          </article>

          <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Your predictions</h2>
                <p className="mt-1 text-sm text-slate-400">Positions tied to your account.</p>
              </div>
              <BarChart3 size={18} className="text-cyan-300" />
            </div>
            {predictions.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-400">
                No predictions on this market yet.
              </p>
            ) : (
              <div className="space-y-2">
                {predictions.map((prediction) => (
                  <div
                    key={prediction.id}
                    className="grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300 sm:grid-cols-[80px_1fr_1fr_1fr]"
                  >
                    <span className={prediction.side === "YES" ? "font-semibold text-emerald-300" : "font-semibold text-rose-300"}>
                      {prediction.side}
                    </span>
                    <span>{prediction.amount} points</span>
                    <span className="capitalize">{prediction.result_status}</span>
                    <span>{prediction.payout_amount} payout</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <MarketDiscussion
            marketId={market.id}
            isAuthenticated={Boolean(user)}
            returnPath={`/markets/${market.slug ?? slug}`}
            variant="detail"
          />
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <PredictionForm
            marketId={market.id}
            marketStatus={market.status}
            initialBalance={profile?.points_balance ?? null}
            returnPath={`/markets/${market.slug ?? slug}`}
            initialMarket={{
              yes_percentage: yesPercentage,
              total_predictions: totalVoteCount,
              total_volume: yesPoints + noPoints,
              yes_count: yesVotes,
              no_count: noVotes,
              yes_amount: yesPoints,
              no_amount: noPoints
            }}
            isAuthenticated={Boolean(user)}
          />
          {isAdmin ? (
            <AdminResolveForm marketId={market.id} disabled={market.status === "resolved"} />
          ) : null}
        </aside>
      </div>
    </main>
  );
}
