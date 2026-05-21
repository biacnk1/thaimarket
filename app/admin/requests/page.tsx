"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, RefreshCw, ShieldCheck, XCircle } from "lucide-react";

type MarketRequest = {
  id: string;
  question: string;
  description: string | null;
  category: string;
  closes_at: string;
  status: "pending" | "approved" | "rejected";
  requester_user_id: string | null;
  reviewed_at?: string | null;
  admin_note?: string | null;
  created_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
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

export default function AdminMarketRequestsPage() {
  const [requests, setRequests] = useState<MarketRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState("");
  const [actingType, setActingType] = useState<"approve" | "reject" | "">("");

  async function loadRequests() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/market-requests", { cache: "no-store" });
      const json = await readApiResponse(res);

      if (!res.ok) {
        throw new Error(typeof json.error === "string" ? json.error : `Could not load market requests (${res.status})`);
      }

      setRequests(Array.isArray(json.data) ? (json.data as MarketRequest[]) : []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load market requests");
    } finally {
      setLoading(false);
    }
  }

  async function approveRequest(id: string) {
    setActingId(id);
    setActingType("approve");
    setError("");

    try {
      const res = await fetch(`/api/admin/market-requests/${id}/approve`, {
        method: "POST",
        cache: "no-store"
      });
      const json = await readApiResponse(res);

      if (!res.ok) {
        throw new Error(typeof json.error === "string" ? json.error : `Could not approve request (${res.status})`);
      }

      await loadRequests();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not approve request");
    } finally {
      setActingId("");
      setActingType("");
    }
  }

  async function rejectRequest(id: string) {
    setActingId(id);
    setActingType("reject");
    setError("");

    try {
      const res = await fetch(`/api/admin/market-requests/${id}/reject`, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason: "" })
      });
      const json = await readApiResponse(res);

      if (!res.ok) {
        throw new Error(typeof json.error === "string" ? json.error : `Could not reject request (${res.status})`);
      }

      await loadRequests();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not reject request");
    } finally {
      setActingId("");
      setActingType("");
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  return (
    <main className="min-h-screen bg-[#0B0F19] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-col justify-between gap-4 border-b border-white/10 pb-6 md:flex-row md:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-cyan-200">
              <ShieldCheck size={16} /> Admin review
            </div>
            <h1 className="text-3xl font-bold">Market requests</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Review submitted boards before they become public markets.
            </p>
          </div>
          <button
            onClick={loadRequests}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200 hover:bg-white/[0.08]"
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </header>

        {error && (
          <div className="mb-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
            {error === "Admin access required"
              ? "Admin access required. Add the profile username to public.admin_users, then refresh."
              : error}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-center text-slate-300">
            Loading requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-center">
            <Clock className="mx-auto mb-3 text-slate-500" size={24} />
            <p className="font-semibold text-white">No requests yet</p>
            <p className="mt-2 text-sm text-slate-400">New Create Market submissions will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <article key={request.id} className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
                <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
                        {request.category}
                      </span>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400">
                        {request.status}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-white">{request.question}</h2>
                    {request.description && (
                      <p className="mt-3 text-sm leading-6 text-slate-400">{request.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
                    <button
                      onClick={() => approveRequest(request.id)}
                      disabled={request.status !== "pending" || actingId === request.id}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CheckCircle2 size={16} />
                      {actingId === request.id && actingType === "approve" ? "Approving..." : "Approve"}
                    </button>
                    <button
                      onClick={() => rejectRequest(request.id)}
                      disabled={request.status !== "pending" || actingId === request.id}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <XCircle size={16} />
                      {actingId === request.id && actingType === "reject" ? "Rejecting..." : "Reject"}
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 text-xs text-slate-500 sm:grid-cols-2">
                  <span>Close: {formatDate(request.closes_at)}</span>
                  <span>Submitted: {formatDate(request.created_at)}</span>
                  {request.reviewed_at && <span>Reviewed: {formatDate(request.reviewed_at)}</span>}
                  {request.admin_note && <span>Reason: {request.admin_note}</span>}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
