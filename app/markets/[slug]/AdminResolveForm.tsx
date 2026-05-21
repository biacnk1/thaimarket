"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";

type AdminResolveFormProps = {
  marketId: string;
  disabled: boolean;
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

export function AdminResolveForm({ marketId, disabled }: AdminResolveFormProps) {
  const router = useRouter();
  const [outcome, setOutcome] = useState<"YES" | "NO">("YES");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function resolveMarket(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || status === "loading") return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch(`/api/admin/markets/${marketId}/resolve`, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ outcome })
      });
      const json = await readApiResponse(res);

      if (!res.ok) {
        throw new Error(typeof json.error === "string" ? json.error : `Resolve failed (${res.status})`);
      }

      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not resolve market");
    }
  }

  return (
    <section className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-amber-100">
        <ShieldCheck size={16} /> Admin resolve
      </div>
      <form className="space-y-4" onSubmit={resolveMarket}>
        <div className="grid grid-cols-2 gap-3">
          {(["YES", "NO"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setOutcome(value)}
              disabled={disabled}
              className={[
                "rounded-2xl border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                outcome === value
                  ? "border-amber-200/60 bg-amber-200/20 text-amber-50"
                  : "border-white/10 bg-black/10 text-slate-300 hover:bg-white/[0.06]"
              ].join(" ")}
            >
              {value}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={disabled || status === "loading"}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_30px_rgba(252,211,77,0.16)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading" ? <Loader2 size={16} className="animate-spin" /> : null}
          {status === "loading" ? "Resolving..." : "Resolve market"}
        </button>
      </form>
      {message ? (
        <p className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {message}
        </p>
      ) : null}
    </section>
  );
}
