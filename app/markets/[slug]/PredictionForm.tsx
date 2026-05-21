"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

type MarketState = {
  yes_percentage: number;
  total_predictions: number;
  total_volume: number;
  yes_amount: number;
  no_amount: number;
};

type PredictionFormProps = {
  marketId: string;
  marketStatus: "open" | "closed" | "resolved";
  initialBalance: number | null;
  initialMarket: MarketState;
  isAuthenticated: boolean;
  returnPath: string;
};

async function readApiResponse(response: Response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: text };
  }
}

function asMarketState(value: unknown): MarketState | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  return {
    yes_percentage: Number(record.yes_percentage ?? 0),
    total_predictions: Number(record.total_predictions ?? 0),
    total_volume: Number(record.total_volume ?? 0),
    yes_amount: Number(record.yes_amount ?? 0),
    no_amount: Number(record.no_amount ?? 0)
  };
}

export function PredictionForm({
  marketId,
  marketStatus,
  initialBalance,
  initialMarket,
  isAuthenticated,
  returnPath
}: PredictionFormProps) {
  const router = useRouter();
  const [side, setSide] = useState<"YES" | "NO">("YES");
  const [amount, setAmount] = useState("100");
  const [balance, setBalance] = useState(initialBalance);
  const [market, setMarket] = useState(initialMarket);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const noPercentage = useMemo(() => Math.max(0, 100 - market.yes_percentage), [market.yes_percentage]);
  const canSubmit = isAuthenticated && marketStatus === "open" && status !== "loading";

  async function submitPrediction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          market_id: marketId,
          side,
          amount: Number(amount)
        })
      });
      const json = await readApiResponse(res);

      if (!res.ok) {
        throw new Error(typeof json.error === "string" ? json.error : `Prediction failed (${res.status})`);
      }

      const data = json.data as Record<string, unknown>;
      const nextMarket = asMarketState(data.market);
      const nextBalance = Number(data.balance);

      if (nextMarket) setMarket(nextMarket);
      if (Number.isFinite(nextBalance)) setBalance(nextBalance);

      setStatus("success");
      setMessage("Prediction saved.");
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not save prediction");
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Cast your signal</h2>
          <p className="mt-1 text-sm text-slate-400">
            Balance: {isAuthenticated ? `${balance ?? 0} points` : "login required"}
          </p>
        </div>
        <div className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase text-cyan-100">
          {marketStatus}
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
        <div className="flex justify-between text-xs text-slate-400">
          <span>YES {market.yes_percentage}%</span>
          <span>NO {noPercentage}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-900 ring-1 ring-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-300 to-violet-400 shadow-[0_0_24px_rgba(34,211,238,0.45)]"
            style={{ width: `${market.yes_percentage}%` }}
          />
        </div>
        <div className="mt-3 flex justify-between text-xs text-slate-500">
          <span>{market.total_predictions} predictions</span>
          <span>{market.total_volume} points volume</span>
        </div>
      </div>

      {!isAuthenticated ? (
        <Link
          href={`/login?next=${encodeURIComponent(returnPath)}`}
          className="block rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-3 text-center text-sm font-semibold text-white shadow-[0_0_30px_rgba(34,211,238,0.18)]"
        >
          Login to predict
        </Link>
      ) : (
        <form className="space-y-4" onSubmit={submitPrediction}>
          <div className="grid grid-cols-2 gap-3">
            {(["YES", "NO"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSide(value)}
                disabled={marketStatus !== "open"}
                className={[
                  "rounded-2xl border px-4 py-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                  side === value
                    ? value === "YES"
                      ? "border-emerald-300/60 bg-emerald-400/20 text-emerald-100 shadow-[0_0_30px_rgba(16,185,129,0.16)]"
                      : "border-rose-300/60 bg-rose-400/20 text-rose-100 shadow-[0_0_30px_rgba(244,63,94,0.16)]"
                    : "border-white/10 bg-black/10 text-slate-300 hover:bg-white/[0.06]"
                ].join(" ")}
              >
                {value}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">Amount</span>
            <input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              disabled={marketStatus !== "open"}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>

          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(34,211,238,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "loading" ? <Loader2 size={16} className="animate-spin" /> : null}
            {status === "loading" ? "Submitting..." : "Submit prediction"}
          </button>
        </form>
      )}

      {message ? (
        <div
          className={[
            "mt-4 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm",
            status === "success"
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
              : "border-rose-400/20 bg-rose-400/10 text-rose-100"
          ].join(" ")}
        >
          {status === "success" ? <CheckCircle2 size={16} /> : null}
          {message}
        </div>
      ) : null}
    </section>
  );
}
