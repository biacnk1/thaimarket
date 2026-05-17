"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  TrendingUp,
  Clock,
  MessageCircle,
  Sparkles,
  BarChart3,
  ShieldCheck,
  Flame,
  CalendarDays,
  CheckCircle2,
  PlusCircle,
  Send,
  X
} from "lucide-react";

type Market = {
  id: string;
  title: string;
  description: string;
  category: string;
  closesAt: string;
  yes: number;
  no: number;
  comments: number;
  volume: string;
  hot: boolean;
  totalVotes: number;
  yesCount: number;
  noCount: number;
};

type MarketStat = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  closes_at: string | null;
  total_votes: number | null;
  yes_count: number | null;
  no_count: number | null;
  yes_percentage: number | null;
};


const categories = ["All", "Thailand", "Politics", "Crypto", "AI", "Economy"];
const marketRequestCategories = categories.filter((category) => category !== "All");
const durationOptions = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 }
];
const fallbackMarkets: Market[] = [
  {
    id: "demo-bitcoin-2026",
    title: "Will Bitcoin break $150,000 before the end of 2026?",
    description:
      "A demo market for tracking public sentiment around Bitcoin, liquidity, ETF flows, and institutional demand.",
    category: "Crypto",
    closesAt: "31 Dec 2026",
    yes: 58,
    no: 42,
    comments: 0,
    volume: "128 votes",
    hot: true,
    totalVotes: 128,
    yesCount: 74,
    noCount: 54
  },
  {
    id: "demo-thailand-tourism",
    title: "Will Thailand pass 40 million international visitors in 2026?",
    description:
      "A public forecast for Thailand tourism recovery based on aviation capacity, regional demand, and policy changes.",
    category: "Thailand",
    closesAt: "31 Dec 2026",
    yes: 64,
    no: 36,
    comments: 0,
    volume: "96 votes",
    hot: true,
    totalVotes: 96,
    yesCount: 61,
    noCount: 35
  },
  {
    id: "demo-ai-model",
    title: "Will a major AI lab release a new frontier model this year?",
    description:
      "A sentiment market for AI release cycles, product launches, and competition between frontier model providers.",
    category: "AI",
    closesAt: "31 Dec 2026",
    yes: 51,
    no: 49,
    comments: 0,
    volume: "77 votes",
    hot: false,
    totalVotes: 77,
    yesCount: 39,
    noCount: 38
  }
];

function formatCloseDate(value: string | null) {
  if (!value) return "No close date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No close date";

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function normalizeMarket(market: MarketStat): Market {
  const totalVotes = Number(market.total_votes ?? 0);
  const yesCount = Number(market.yes_count ?? 0);
  const noCount = Number(market.no_count ?? 0);
  const yes = Number(market.yes_percentage ?? 0);
  const no = Math.max(0, 100 - yes);

  return {
    id: market.id,
    title: market.title,
    description: market.description ?? "No description yet.",
    category: market.category ?? "General",
    closesAt: formatCloseDate(market.closes_at),
    yes,
    no,
    comments: 0,
    volume: `${totalVotes} votes`,
    hot: totalVotes >= 50 || yes >= 60,
    totalVotes,
    yesCount,
    noCount
  };
}

function applyLocalVote(market: Market, side: "yes" | "no", previousSide?: "yes" | "no"): Market {
  let yesCount = market.yesCount;
  let noCount = market.noCount;

  if (previousSide === side) return market;
  if (previousSide === "yes") yesCount -= 1;
  if (previousSide === "no") noCount -= 1;
  if (side === "yes") yesCount += 1;
  if (side === "no") noCount += 1;

  const totalVotes = previousSide ? market.totalVotes : market.totalVotes + 1;
  const yes = totalVotes === 0 ? 0 : Math.round((yesCount / totalVotes) * 100);
  const no = Math.max(0, 100 - yes);

  return {
    ...market,
    yes,
    no,
    totalVotes,
    yesCount,
    noCount,
    volume: `${totalVotes} votes`,
    hot: totalVotes >= 50 || yes >= 60
  };
}

function toDateTimeLocalValue(date: Date) {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

function getFutureDateTimeLocalValue(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setMinutes(0, 0, 0);
  return toDateTimeLocalValue(date);
}

async function readApiResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {
      error: text
    };
  }
}


function cn(...classes: Array<string | boolean | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function GlassCard({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-3xl border border-white/10 bg-white/[0.035] backdrop-blur-xl", className)}>
      {children}
    </div>
  );
}

function SentimentBar({ yes, no }: { yes: number; no: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Yes {yes}%</span>
        <span>No {no}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800 ring-1 ring-white/5">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" style={{ width: `${yes}%` }} />
      </div>
    </div>
  );
}

function MarketCard({
  market,
  selected,
  onClick
}: {
  market: Market;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5",
        "bg-white/[0.035] backdrop-blur-xl hover:bg-white/[0.06]",
        selected ? "border-cyan-400/60 shadow-[0_0_40px_rgba(34,211,238,0.12)]" : "border-white/10"
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-300">
            {market.category}
          </span>
          {market.hot && (
            <span className="flex items-center gap-1 rounded-full border border-orange-400/20 bg-orange-400/10 px-2.5 py-1 text-xs text-orange-300">
              <Flame size={12} /> Hot
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500">{market.volume}</span>
      </div>
      <h3 className="mb-3 line-clamp-2 text-base font-semibold leading-snug text-slate-50">{market.title}</h3>
      <SentimentBar yes={market.yes} no={market.no} />
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <Clock size={13} /> {market.closesAt}
        </span>
        <span className="flex items-center gap-1.5">
          <MessageCircle size={13} /> {market.comments}
        </span>
      </div>
    </button>
  );
}

function VoteButton({
  side,
  active,
  onClick
}: {
  side: "yes" | "no";
  active: boolean;
  onClick: () => void;
}) {
  const isYes = side === "yes";
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 rounded-2xl border px-4 py-4 text-sm font-semibold transition",
        active
          ? isYes
            ? "border-emerald-300/60 bg-emerald-400/20 text-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.16)]"
            : "border-rose-300/60 bg-rose-400/20 text-rose-200 shadow-[0_0_30px_rgba(244,63,94,0.16)]"
          : "border-white/10 bg-white/[0.035] text-slate-300 hover:bg-white/[0.07]"
      )}
    >
      {isYes ? "Yes" : "No"}
    </button>
  );
}

function MarketDetail({
  market,
  userVote,
  onVote
}: {
  market: Market;
  userVote?: "yes" | "no";
  onVote: (side: "yes" | "no") => void;
}) {
  return (
    <div className="sticky top-6 rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl backdrop-blur-2xl">
      <div className="mb-5 flex items-center justify-between">
        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
          {market.category}
        </span>
        <span className="text-xs text-slate-500">Close: {market.closesAt}</span>
      </div>
      <h2 className="text-2xl font-bold leading-tight text-white">{market.title}</h2>
      <p className="mt-4 text-sm leading-6 text-slate-400">{market.description}</p>
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-200">Current sentiment</span>
          <span className="text-xs text-slate-500">{market.totalVotes} votes</span>
        </div>
        <SentimentBar yes={market.yes} no={market.no} />
      </div>
      <div className="mt-6">
        <p className="mb-3 text-sm font-medium text-slate-200">Cast your signal</p>
        <div className="flex gap-3">
          <VoteButton side="yes" active={userVote === "yes"} onClick={() => onVote("yes")} />
          <VoteButton side="no" active={userVote === "no"} onClick={() => onVote("no")} />
        </div>
        <p className="mt-3 text-xs text-slate-500">Prototype mode: vote is stored locally in this session only.</p>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <BarChart3 className="mb-2 text-cyan-300" size={18} />
          <p className="text-xs text-slate-500">Signal</p>
          <p className="text-sm font-semibold text-white">{market.yesCount >= market.noCount ? "Bullish" : "Bearish"}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <TrendingUp className="mb-2 text-violet-300" size={18} />
          <p className="text-xs text-slate-500">Activity</p>
          <p className="text-sm font-semibold text-white">High</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <ShieldCheck className="mb-2 text-emerald-300" size={18} />
          <p className="text-xs text-slate-500">Risk</p>
          <p className="text-sm font-semibold text-white">No money</p>
        </div>
      </div>
    </div>
  );
}

function CreateMarketRequestModal({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [category, setCategory] = useState(marketRequestCategories[0]);
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [closesAt, setClosesAt] = useState(() => getFutureDateTimeLocalValue(30));
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    try {
      const closeDate = new Date(closesAt);

      if (Number.isNaN(closeDate.getTime())) {
        throw new Error("Choose a clear close date and time");
      }

      const res = await fetch("/api/market-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question,
          description,
          category,
          closes_at: closeDate.toISOString()
        })
      });

      const json = await readApiResponse(res);

      if (!res.ok) {
        throw new Error(typeof json.error === "string" ? json.error : "Could not submit market request");
      }

      setStatus("success");
      setMessage("Request sent to the admin review queue.");
      setQuestion("");
      setDescription("");
      setClosesAt(getFutureDateTimeLocalValue(30));
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not submit market request");
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/70 px-3 py-4 backdrop-blur-md sm:px-4 sm:py-10">
      <div className="mx-auto w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950 p-4 shadow-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-cyan-200">
              <PlusCircle size={16} /> New market request
            </div>
            <h2 className="text-xl font-bold text-white sm:text-2xl">Submit a board for approval</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              The board goes live only after an admin approves it. When auth is connected, this request will include the logged-in user automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-2 text-slate-300 hover:bg-white/[0.08]"
            aria-label="Close create market form"
          >
            <X size={18} />
          </button>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="market-question">
              Question
            </label>
            <input
              id="market-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              minLength={12}
              maxLength={180}
              required
              placeholder="Will Thailand pass 40M visitors in 2026?"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
            />
            <div className="mt-1 text-right text-xs text-slate-500">{question.length}/180</div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-200">Category</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {marketRequestCategories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={cn(
                    "rounded-2xl border px-3 py-2 text-sm transition",
                    category === item
                      ? "border-cyan-300/60 bg-cyan-400/15 text-cyan-100"
                      : "border-white/10 bg-white/[0.035] text-slate-400 hover:bg-white/[0.07]"
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="market-description">
              Resolution notes
            </label>
            <textarea
              id="market-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              placeholder="Define what counts as Yes, what source should be checked, and any edge cases."
              className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
            />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-200" htmlFor="market-closes-at">
              <CalendarDays size={16} /> Close date and time
            </label>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                id="market-closes-at"
                type="datetime-local"
                value={closesAt}
                onChange={(event) => setClosesAt(event.target.value)}
                required
                min={getFutureDateTimeLocalValue(1)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
              />
              <div className="grid grid-cols-3 gap-2 sm:flex">
                {durationOptions.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setClosesAt(getFutureDateTimeLocalValue(option.days))}
                    className="rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.07]"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {message && (
            <div
              className={cn(
                "flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm",
                status === "success"
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                  : "border-rose-400/20 bg-rose-400/10 text-rose-100"
              )}
            >
              {status === "success" && <CheckCircle2 size={16} />}
              {message}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300 hover:bg-white/[0.08]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={status === "submitting"}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(34,211,238,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={16} />
              {status === "submitting" ? "Sending..." : "Submit for review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProductPreview() {
  const [markets, setMarkets] = useState<Market[]>(fallbackMarkets);
  const [activeCategory, setActiveCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(fallbackMarkets[0]?.id ?? "");
  const [votes, setVotes] = useState<Record<string, "yes" | "no">>({});

  useEffect(() => {
    async function loadMarkets() {
      try {
        const res = await fetch("/api/markets");
        const json = await readApiResponse(res);
        if (!res.ok || !Array.isArray(json.data)) {
          throw new Error(typeof json.error === "string" ? json.error : "Market API returned an invalid response");
        }

        const nextMarkets = json.data.map((market: MarketStat) => normalizeMarket(market));
        if (nextMarkets.length > 0) {
          setMarkets(nextMarkets);
          setSelectedId(nextMarkets[0].id);
        }
      } catch (error) {
        console.error("Failed to load markets:", error);
      }
    }

    loadMarkets();
  }, []);

  useEffect(() => {
    if (markets.length > 0 && !selectedId) {
      setSelectedId(markets[0].id);
    }
  }, [markets, selectedId]);

  const filteredMarkets = useMemo(() => {
    return markets.filter((market) => {
      const matchCategory =
        activeCategory === "All" || market.category === activeCategory;

      const matchQuery = market.title.toLowerCase().includes(query.toLowerCase());

      return matchCategory && matchQuery;
    });
  }, [activeCategory, query, markets]);

  const selectedMarket =
    markets.find((market) => market.id === selectedId) || markets[0];

  async function handleVote(side: "yes" | "no") {
    if (!selectedMarket) return;

    const previousSide = votes[selectedMarket.id];
    setVotes((prev) => ({
      ...prev,
      [selectedMarket.id]: side,
    }));

    setMarkets((prev) =>
      prev.map((market) =>
        market.id === selectedMarket.id ? applyLocalVote(market, side, previousSide) : market
      )
    );

    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          market_id: selectedMarket.id,
          side,
        }),
      });

      const json = await readApiResponse(res);

      if (!res.ok) {
        console.info("Vote saved locally only:", json.error || "Supabase auth is not active");
        return;
      }

      setMarkets((prev) =>
        prev.map((market) =>
          market.id === selectedMarket.id ? normalizeMarket(json.data as MarketStat) : market
        )
      );
    } catch (error) {
      console.info("Vote saved locally only:", error);
    }
  }

  if (!selectedMarket) {
    return (
      <GlassCard className="p-8 text-center">
        <p className="text-slate-300">Loading markets...</p>
      </GlassCard>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_440px]">
      <section>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm transition",
                  activeCategory === category
                    ? "border-cyan-300/50 bg-cyan-400/15 text-cyan-100"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.07]"
                )}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 text-slate-400">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search markets"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500 md:w-56"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {filteredMarkets.map((market) => (
            <MarketCard
              key={market.id}
              market={market}
              selected={selectedMarket.id === market.id}
              onClick={() => setSelectedId(market.id)}
            />
          ))}
        </div>
      </section>

      <aside>
        <MarketDetail
          market={selectedMarket}
          userVote={votes[selectedMarket.id]}
          onVote={handleVote}
        />
      </aside>
    </div>
  );
}
export default function ThaiPredictionBoardPrototype() {
  const [isCreateMarketOpen, setIsCreateMarketOpen] = useState(false);

  return (
    <main className="min-h-screen overflow-hidden bg-[#0B0F19] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-[-10rem] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[120px]" />
        <div className="absolute right-[-8rem] top-[12rem] h-[22rem] w-[22rem] rounded-full bg-violet-500/20 blur-[120px]" />
        <div className="absolute bottom-[-8rem] left-[-8rem] h-[22rem] w-[22rem] rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col justify-between gap-4 border-b border-white/10 pb-6 md:flex-row md:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-cyan-200">
              <Sparkles size={16} /> ThaiMarket MVP Preview
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Predict what happens next.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
              เว็บรวมมุมมองอนาคตของไทย ผ่านการโหวตแบบตลาดทำนาย — Project by Bank.J
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300 hover:bg-white/[0.08]">
              Sign in
            </button>
            <button
              onClick={() => setIsCreateMarketOpen(true)}
              className="rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_30px_rgba(34,211,238,0.18)]"
            >
              Create Market
            </button>
          </div>
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <GlassCard className="p-5">
            <p className="text-sm text-slate-500">Markets</p>
            <p className="mt-2 text-3xl font-bold">128</p>
          </GlassCard>
          <GlassCard className="p-5">
            <p className="text-sm text-slate-500">Total Votes</p>
            <p className="mt-2 text-3xl font-bold">49.3K</p>
          </GlassCard>
          <GlassCard className="p-5">
            <p className="text-sm text-slate-500">Active Predictors</p>
            <p className="mt-2 text-3xl font-bold">1.2K</p>
          </GlassCard>
          <GlassCard className="p-5">
            <p className="text-sm text-slate-500">Trending Category</p>
            <p className="mt-2 text-3xl font-bold text-emerald-300">Crypto</p>
          </GlassCard>
        </section>

        <ProductPreview />
      </div>
      <CreateMarketRequestModal open={isCreateMarketOpen} onClose={() => setIsCreateMarketOpen(false)} />
    </main>
  );
}
