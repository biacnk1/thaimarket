"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Loader2, PlusCircle, X } from "lucide-react";

const categories = ["Thailand", "Politics", "Crypto", "AI", "Economy"];

function toDateTimeLocalValue(date: Date) {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

function defaultCloseDate() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  date.setMinutes(0, 0, 0);
  return toDateTimeLocalValue(date);
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

export function CreateMarketRequestForm({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [closesAt, setClosesAt] = useState(defaultCloseDate);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const closeDate = new Date(closesAt);

      if (Number.isNaN(closeDate.getTime())) {
        throw new Error("Choose a valid close date.");
      }

      const response = await fetch("/api/market-requests", {
        method: "POST",
        cache: "no-store",
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
      const json = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(typeof json.error === "string" ? json.error : `Could not create market (${response.status})`);
      }

      setStatus("success");
      setMessage("Market sent to admin review.");
      setQuestion("");
      setDescription("");
      setCategory(categories[0]);
      setClosesAt(defaultCloseDate());
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not create market");
    }
  }

  if (!isAuthenticated) {
    return (
      <Link
        href="/login?next=/"
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(34,211,238,0.18)]"
      >
        <PlusCircle size={16} /> Create Market
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(34,211,238,0.18)]"
      >
        <PlusCircle size={16} /> Create Market
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 px-3 py-4 backdrop-blur-md sm:px-4 sm:py-10">
          <div className="mx-auto w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm text-cyan-200">
                  <PlusCircle size={16} /> New market request
                </div>
                <h2 className="text-xl font-bold text-white sm:text-2xl">Submit a board for approval</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Markets go live after admin approval.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-2 text-slate-300 hover:bg-white/[0.08]"
                aria-label="Close create market form"
              >
                <X size={18} />
              </button>
            </div>

            <form className="space-y-4" onSubmit={submitRequest}>
              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">Question</span>
                <input
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  required
                  minLength={12}
                  maxLength={180}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
                  placeholder="Will Thailand pass 40M visitors in 2026?"
                />
                <div className="mt-1 text-right text-xs text-slate-500">{question.length}/180</div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">Description</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
                  placeholder="Define what counts as YES and what source should resolve it."
                />
              </label>

              <div>
                <p className="mb-2 text-sm text-slate-300">Category</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {categories.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCategory(item)}
                      className={[
                        "rounded-2xl border px-3 py-2 text-sm transition",
                        category === item
                          ? "border-cyan-300/60 bg-cyan-400/15 text-cyan-100"
                          : "border-white/10 bg-white/[0.035] text-slate-400 hover:bg-white/[0.07]"
                      ].join(" ")}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">Close date</span>
                  <input
                    type="datetime-local"
                    value={closesAt}
                    onChange={(event) => setClosesAt(event.target.value)}
                    required
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
                  />
                </label>
              </div>

              {message ? (
                <div
                  className={[
                    "flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm",
                    status === "success"
                      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                      : "border-rose-400/20 bg-rose-400/10 text-rose-100"
                  ].join(" ")}
                >
                  {status === "success" ? <CheckCircle2 size={16} /> : null}
                  {message}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200 hover:bg-white/[0.08]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(34,211,238,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === "loading" ? <Loader2 size={16} className="animate-spin" /> : null}
                  {status === "loading" ? "Submitting..." : "Submit market"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
