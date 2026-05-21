import Link from "next/link";
import { Activity, PlusCircle, Radio, ShieldCheck, Sparkles } from "lucide-react";

import { CreateMarketRequestForm } from "@/app/CreateMarketRequestForm";
import { MarketBoard, type MarketBoardItem } from "@/app/MarketBoard";
import { isAdminUser } from "@/lib/auth/admin";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/server";
import { canUseSupabase } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function countComments(rows: Array<{ market_id: string | null }>) {
  const counts = new Map<string, number>();

  for (const row of rows) {
    if (!row.market_id) continue;
    counts.set(row.market_id, (counts.get(row.market_id) ?? 0) + 1);
  }

  return counts;
}

async function getMarkets() {
  if (!canUseSupabase()) {
    return {
      markets: [] as MarketBoardItem[],
      error: "Supabase is not configured. Set APP_DATA_MODE=supabase and provide Supabase keys."
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("market_stats")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return {
      markets: [] as MarketBoardItem[],
      error: error.message
    };
  }

  const marketIds = (data ?? []).map((market) => market.id).filter(Boolean);
  const { data: comments, error: commentsError } = marketIds.length
    ? await supabase.from("comments").select("market_id").in("market_id", marketIds)
    : { data: [], error: null };

  if (commentsError) {
    console.error("Could not load market comment counts:", commentsError.message);
  }

  const commentCounts = countComments((comments ?? []) as Array<{ market_id: string | null }>);

  return {
    markets: ((data ?? []) as MarketBoardItem[]).map((market) => ({
      ...market,
      comment_count: commentCounts.get(market.id) ?? 0,
      creator_user_id: market.creator_user_id ?? null,
      creator_display_name: market.creator_display_name ?? null,
      creator_username: market.creator_username ?? null,
      creator_avatar_url: market.creator_avatar_url ?? null,
      creator_profile_picture_url: market.creator_profile_picture_url ?? null
    })),
    error: ""
  };
}

export default async function HomePage() {
  const user = await getCurrentUser();
  const profile = user ? await getCurrentProfile() : null;
  const admin = user ? await isAdminUser(user) : false;
  const { markets, error } = await getMarkets();
  const openMarkets = markets.filter((market) => market.status === "open").length;
  const totalPredictions = markets.reduce((sum, market) => sum + Number(market.total_predictions ?? 0), 0);

  return (
    <main className="min-h-screen bg-[#090D14] px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-cyan-200">
              <Sparkles size={16} />
              <span>ThaiMarket live feed</span>
              <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-100">
                {openMarkets} open
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Predict, discuss, keep scrolling.</h1>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5">
                <Radio size={13} /> {markets.length} markets
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5">
                <Activity size={13} /> {totalPredictions} signals
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5">
                <ShieldCheck size={13} /> Points-only
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {admin ? (
              <Link
                href="/admin/requests"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200 hover:bg-white/[0.08]"
              >
                <PlusCircle size={16} /> Admin queue
              </Link>
            ) : null}
            <CreateMarketRequestForm isAuthenticated={Boolean(user)} />
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-5 text-sm text-rose-100">
            {error}
          </div>
        ) : (
          <MarketBoard
            markets={markets}
            isAuthenticated={Boolean(user)}
            initialBalance={profile?.points_balance ?? null}
          />
        )}
      </div>
    </main>
  );
}
