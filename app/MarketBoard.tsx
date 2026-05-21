"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Clock,
  Coins,
  Flame,
  Loader2,
  MessageCircle,
  Search,
  ShieldCheck,
  TrendingUp,
  UserRound,
  Zap
} from "lucide-react";

import { MarketDiscussion } from "@/app/MarketDiscussion";

export type MarketBoardItem = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: "open" | "closed" | "resolved";
  slug: string | null;
  close_date: string | null;
  closes_at: string | null;
  created_at?: string | null;
  total_predictions: number | null;
  total_votes?: number | null;
  total_volume: number | null;
  yes_percentage: number | null;
  no_percentage?: number | null;
  yes_count?: number | null;
  no_count?: number | null;
  yes_amount?: number | null;
  no_amount?: number | null;
  creator_user_id?: string | null;
  creator_display_name?: string | null;
  creator_username?: string | null;
  creator_avatar_url?: string | null;
  creator_profile_picture_url?: string | null;
  comment_count?: number | null;
};

type MarketBoardProps = {
  markets: MarketBoardItem[];
  isAuthenticated: boolean;
  initialBalance: number | null;
};

type MarketPatch = Partial<
  Pick<
    MarketBoardItem,
    | "yes_percentage"
    | "no_percentage"
    | "total_predictions"
    | "total_votes"
    | "total_volume"
    | "yes_count"
    | "no_count"
    | "yes_amount"
    | "no_amount"
  >
>;

const baseCategories = ["All", "Thailand", "Politics", "Crypto", "AI", "Economy"];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "No close date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No close date";

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("en", {
    notation: Number(value ?? 0) >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1
  }).format(Number(value ?? 0));
}

function getMarketHref(market: MarketBoardItem) {
  return `/markets/${market.slug ?? market.id}`;
}

function statusClass(status: MarketBoardItem["status"]) {
  if (status === "open") return "border-emerald-300/30 bg-emerald-400/10 text-emerald-100";
  if (status === "resolved") return "border-cyan-300/30 bg-cyan-400/10 text-cyan-100";
  return "border-slate-300/20 bg-slate-300/10 text-slate-200";
}

function toNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function clampPercentage(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function getConsensus(market: MarketBoardItem) {
  const yesVotes = toNumber(market.yes_count);
  const noVotes = toNumber(market.no_count);
  const totalVotes = yesVotes + noVotes;

  if (totalVotes > 0) {
    const yes = Math.round((yesVotes / totalVotes) * 100);

    return {
      yes,
      no: 100 - yes
    };
  }

  const yes = clampPercentage(toNumber(market.yes_percentage));
  const no =
    market.no_percentage === null || market.no_percentage === undefined
      ? yes > 0
        ? 100 - yes
        : 0
      : clampPercentage(toNumber(market.no_percentage));

  return { yes, no };
}

function getCreator(market: MarketBoardItem) {
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
    avatarUrl: market.creator_profile_picture_url ?? market.creator_avatar_url
  };
}

function SentimentBar({ yes, no }: { yes: number; no: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>YES {yes}%</span>
        <span>NO {no}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-950 ring-1 ring-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-300 to-indigo-400 shadow-[0_0_22px_rgba(34,211,238,0.38)]"
          style={{ width: `${yes}%` }}
        />
      </div>
    </div>
  );
}

function CreatorLine({ market }: { market: MarketBoardItem }) {
  const creator = getCreator(market);

  return (
    <div className="flex min-w-0 items-center gap-2 text-xs text-slate-400">
      {creator.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={creator.avatarUrl} alt={creator.displayName} className="h-6 w-6 rounded-full object-cover" />
      ) : (
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300">
          <UserRound size={13} />
        </span>
      )}
      <span className="shrink-0">Created by</span>
      {creator.href ? (
        <Link
          href={creator.href}
          onClick={(event) => event.stopPropagation()}
          className="min-w-0 truncate font-medium text-slate-200 hover:text-cyan-200"
        >
          {creator.displayName}
        </Link>
      ) : (
        <span className="min-w-0 truncate font-medium text-slate-200">{creator.displayName}</span>
      )}
    </div>
  );
}

function MarketCard({
  market,
  selected,
  onSelect
}: {
  market: MarketBoardItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const { yes, no } = getConsensus(market);
  const volume = Number(market.total_volume ?? 0);
  const predictionCount = Number(market.total_predictions ?? 0);
  const hot = market.status === "open" && (volume >= 500 || predictionCount >= 10 || yes >= 60);

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-2xl border bg-white/[0.035] p-4 text-left shadow-xl shadow-black/20 outline-none transition duration-200 hover:-translate-y-0.5 hover:bg-white/[0.06] focus:border-cyan-300/60",
        selected
          ? "border-cyan-300/60 shadow-[0_0_44px_rgba(34,211,238,0.14)]"
          : "border-white/10 hover:border-cyan-300/40"
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-300">
            {market.category ?? "General"}
          </span>
          {hot ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-orange-400/20 bg-orange-400/10 px-2.5 py-1 text-xs text-orange-300">
              <Flame size={12} /> Hot
            </span>
          ) : null}
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-xs uppercase ${statusClass(market.status)}`}>
          {market.status}
        </span>
      </div>

      <h2 className="line-clamp-2 text-base font-semibold leading-snug sm:text-lg">
        <Link
          href={getMarketHref(market)}
          onClick={(event) => event.stopPropagation()}
          className="text-slate-50 hover:text-cyan-200"
        >
          {market.title}
        </Link>
      </h2>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">
        {market.description ?? "No description yet."}
      </p>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
        <SentimentBar yes={yes} no={no} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <Clock size={13} /> {formatDate(market.close_date ?? market.closes_at)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MessageCircle size={13} /> {Number(market.comment_count ?? 0)}
        </span>
        <span>{formatNumber(volume)} pts</span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
        <CreatorLine market={market} />
        <ArrowUpRight size={16} className="shrink-0 text-slate-500 transition group-hover:text-cyan-200" />
      </div>
    </article>
  );
}

function readMarketPatch(value: unknown): MarketPatch | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const yesCount = toNumber(record.yes_votes_count ?? record.yes_votes ?? record.yes_count);
  const noCount = toNumber(record.no_votes_count ?? record.no_votes ?? record.no_count);
  const yesPoints = toNumber(record.yes_points_volume ?? record.yes_points ?? record.yes_amount);
  const noPoints = toNumber(record.no_points_volume ?? record.no_points ?? record.no_amount);
  const totalVotes = yesCount + noCount;
  const yesPercentage = totalVotes === 0 ? 0 : Math.round((yesCount / totalVotes) * 100);

  return {
    yes_percentage: yesPercentage,
    no_percentage: totalVotes === 0 ? 0 : 100 - yesPercentage,
    total_predictions: totalVotes,
    total_votes: totalVotes,
    total_volume: yesPoints + noPoints,
    yes_count: yesCount,
    no_count: noCount,
    yes_amount: yesPoints,
    no_amount: noPoints
  };
}

async function readApiResponse(response: Response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: text };
  }
}

function QuickPredictPanel({
  market,
  isAuthenticated,
  balance,
  onBalance,
  onMarketUpdate
}: {
  market: MarketBoardItem;
  isAuthenticated: boolean;
  balance: number | null;
  onBalance: (balance: number) => void;
  onMarketUpdate: (marketId: string, patch: MarketPatch) => void;
}) {
  const [side, setSide] = useState<"YES" | "NO">("YES");
  const [amount, setAmount] = useState("100");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const { yes, no } = getConsensus(market);
  const returnPath = getMarketHref(market);
  const creator = getCreator(market);
  const canSubmit = isAuthenticated && market.status === "open" && status !== "loading";

  useEffect(() => {
    setStatus("idle");
    setMessage("");
  }, [market.id]);

  async function submitPrediction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) return;

    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/predictions", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          market_id: market.id,
          side,
          amount: Number(amount)
        })
      });
      const json = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(typeof json.error === "string" ? json.error : `Prediction failed (${response.status})`);
      }

      const data = json.data as Record<string, unknown>;
      const nextMarket = readMarketPatch(data.market);
      const nextBalance = Number(data.balance);

      if (nextMarket) onMarketUpdate(market.id, nextMarket);
      if (Number.isFinite(nextBalance)) onBalance(nextBalance);

      setStatus("success");
      setMessage(`${side} signal saved.`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not save prediction");
    }
  }

  return (
    <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
      <section className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 shadow-2xl shadow-black/30">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
                {market.category ?? "General"}
              </span>
              <span className={`rounded-full border px-3 py-1 text-xs uppercase ${statusClass(market.status)}`}>
                {market.status}
              </span>
            </div>
            <h2 className="text-xl font-bold leading-tight text-white sm:text-2xl">{market.title}</h2>
          </div>
          <TrendingUp size={20} className="shrink-0 text-cyan-300" />
        </div>

        <p className="mb-4 text-sm leading-6 text-slate-400">{market.description ?? "No description yet."}</p>

        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
          <CreatorLine market={market} />
          {creator.href ? (
            <Link href={creator.href} className="text-xs text-cyan-200 hover:text-cyan-100">
              Profile
            </Link>
          ) : null}
        </div>

        <div className="mb-5 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">Vote consensus</p>
              <p className="mt-1 text-2xl font-bold text-white">YES {yes}%</p>
            </div>
            <p className="text-sm text-slate-400">NO {no}%</p>
          </div>
          <SentimentBar yes={yes} no={no} />
        </div>

        <form className="space-y-4" onSubmit={submitPrediction}>
          <div className="grid grid-cols-2 gap-3">
            {(["YES", "NO"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSide(value)}
                disabled={market.status !== "open"}
                className={cn(
                  "rounded-2xl border px-4 py-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                  side === value
                    ? value === "YES"
                      ? "border-emerald-300/60 bg-emerald-400/20 text-emerald-100 shadow-[0_0_30px_rgba(16,185,129,0.16)]"
                      : "border-rose-300/60 bg-rose-400/20 text-rose-100 shadow-[0_0_30px_rgba(244,63,94,0.16)]"
                    : "border-white/10 bg-white/[0.035] text-slate-300 hover:bg-white/[0.07]"
                )}
              >
                {value}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">Points</span>
            <input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              disabled={market.status !== "open"}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>

          {isAuthenticated ? (
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(34,211,238,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "loading" ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              {status === "loading" ? "Saving..." : "Cast signal"}
            </button>
          ) : (
            <Link
              href={`/login?next=${encodeURIComponent("/feed")}`}
              className="block rounded-2xl bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-3 text-center text-sm font-semibold text-white shadow-[0_0_30px_rgba(34,211,238,0.18)]"
            >
              Login to predict
            </Link>
          )}
        </form>

        {message ? (
          <div
            className={cn(
              "mt-4 rounded-2xl border px-4 py-3 text-sm",
              status === "success"
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                : "border-rose-400/20 bg-rose-400/10 text-rose-100"
            )}
          >
            {message}
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
            <BarChart3 size={16} className="mb-2 text-cyan-300" />
            <p className="text-xs text-slate-500">Signals</p>
            <p className="mt-1 text-sm font-semibold text-white">{formatNumber(market.total_predictions)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
            <Coins size={16} className="mb-2 text-amber-300" />
            <p className="text-xs text-slate-500">Volume</p>
            <p className="mt-1 text-sm font-semibold text-white">{formatNumber(market.total_volume)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
            <ShieldCheck size={16} className="mb-2 text-emerald-300" />
            <p className="text-xs text-slate-500">Balance</p>
            <p className="mt-1 text-sm font-semibold text-white">
              {isAuthenticated ? formatNumber(balance ?? 0) : "--"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={13} /> Close {formatDate(market.close_date ?? market.closes_at)}
          </span>
          <Link href={returnPath} className="text-cyan-200 hover:text-cyan-100">
            Full market
          </Link>
        </div>
      </section>

      <MarketDiscussion marketId={market.id} isAuthenticated={isAuthenticated} returnPath={returnPath} />
    </aside>
  );
}

export function MarketBoard({ markets, isAuthenticated, initialBalance }: MarketBoardProps) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<"new" | "ending" | "mostVoted">("new");
  const [marketState, setMarketState] = useState(markets);
  const [selectedMarketId, setSelectedMarketId] = useState(markets[0]?.id ?? "");
  const [balance, setBalance] = useState(initialBalance);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMarketState(markets);
    setSelectedMarketId((current) => (current || markets[0]?.id) ?? "");
  }, [markets]);

  const categories = useMemo(() => {
    const dynamicCategories = marketState
      .map((market) => market.category ?? "General")
      .filter((category) => !baseCategories.includes(category));

    return [...baseCategories, ...Array.from(new Set(dynamicCategories))];
  }, [marketState]);

  const filteredMarkets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = marketState.filter((market) => {
      const category = market.category ?? "General";
      const matchesCategory = activeCategory === "All" || category === activeCategory;
      const matchesQuery =
        !normalizedQuery ||
        market.title.toLowerCase().includes(normalizedQuery) ||
        (market.description ?? "").toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });

    return [...filtered].sort((left, right) => {
      if (quickFilter === "ending") {
        return (
          new Date(left.close_date ?? left.closes_at ?? "9999-12-31").getTime() -
          new Date(right.close_date ?? right.closes_at ?? "9999-12-31").getTime()
        );
      }

      if (quickFilter === "mostVoted") {
        return Number(right.total_predictions ?? 0) - Number(left.total_predictions ?? 0);
      }

      return (
        new Date(right.created_at ?? "1970-01-01").getTime() -
        new Date(left.created_at ?? "1970-01-01").getTime()
      );
    });
  }, [activeCategory, marketState, query, quickFilter]);

  const selectedMarket =
    marketState.find((market) => market.id === selectedMarketId) ?? filteredMarkets[0] ?? marketState[0] ?? null;

  function updateMarket(marketId: string, patch: MarketPatch) {
    setMarketState((current) =>
      current.map((market) =>
        market.id === marketId
          ? {
              ...market,
              ...patch
            }
          : market
      )
    );
  }

  function selectMarket(marketId: string) {
    setSelectedMarketId(marketId);

    if (window.innerWidth < 1024) {
      window.requestAnimationFrame(() => {
        panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  if (markets.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-8 text-center text-slate-300">
        No markets are live yet.
      </div>
    );
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm transition",
                  activeCategory === category
                    ? "border-cyan-300/50 bg-cyan-400/15 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.12)]"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.07]"
                )}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
              {[
                ["new", "New"],
                ["ending", "Ending soon"],
                ["mostVoted", "Most voted"]
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setQuickFilter(value as "new" | "ending" | "mostVoted")}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs transition",
                    quickFilter === value ? "bg-cyan-400/15 text-cyan-100" : "text-slate-400 hover:text-white"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-2 text-slate-400">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search markets"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500 sm:w-52"
              />
            </div>
          </div>
        </div>

        {filteredMarkets.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-8 text-center text-slate-300">
            No markets match this filter.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredMarkets.map((market) => (
              <MarketCard
                key={market.id}
                market={market}
                selected={selectedMarket?.id === market.id}
                onSelect={() => selectMarket(market.id)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedMarket ? (
        <div ref={panelRef} className="scroll-mt-4">
          <QuickPredictPanel
            market={selectedMarket}
            isAuthenticated={isAuthenticated}
            balance={balance}
            onBalance={setBalance}
            onMarketUpdate={updateMarket}
          />
        </div>
      ) : null}
    </section>
  );
}
