"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Loader2, MessageCircle, Send } from "lucide-react";

type CommentAuthor = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type MarketComment = {
  id: string;
  body: string;
  user_id: string;
  created_at: string;
  author?: CommentAuthor | null;
};

type DiscussionProps = {
  marketId: string;
  isAuthenticated: boolean;
  returnPath: string;
  variant?: "panel" | "detail";
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

function isComment(value: unknown): value is MarketComment {
  return Boolean(value && typeof value === "object" && "id" in value && "body" in value);
}

function readComments(value: unknown): MarketComment[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isComment);
}

function getDisplayName(comment: MarketComment) {
  return comment.author?.display_name || comment.author?.username || "Predictor";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function AuthorAvatar({ comment }: { comment: MarketComment }) {
  const displayName = getDisplayName(comment);

  if (comment.author?.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={comment.author.avatar_url}
        alt={displayName}
        className="h-8 w-8 rounded-full border border-white/10 object-cover"
      />
    );
  }

  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-400/10 text-xs font-semibold text-cyan-100">
      {getInitials(displayName)}
    </span>
  );
}

function AuthorName({ comment }: { comment: MarketComment }) {
  const displayName = getDisplayName(comment);

  if (comment.author?.username) {
    return (
      <Link href={`/u/${comment.author.username}`} className="font-medium text-white hover:text-cyan-200">
        {displayName}
      </Link>
    );
  }

  return <span className="font-medium text-white">{displayName}</span>;
}

export function MarketDiscussion({
  marketId,
  isAuthenticated,
  returnPath,
  variant = "panel"
}: DiscussionProps) {
  const [sort, setSort] = useState<"top" | "newest">("newest");
  const [comments, setComments] = useState<MarketComment[]>([]);
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "posting" | "error">("idle");
  const [message, setMessage] = useState("");

  const visibleComments = useMemo(() => {
    if (sort === "newest") return comments;

    return [...comments].sort((left, right) => {
      const bodyDelta = right.body.length - left.body.length;
      if (bodyDelta !== 0) return bodyDelta;
      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    });
  }, [comments, sort]);

  useEffect(() => {
    let cancelled = false;

    async function loadComments() {
      setStatus("loading");
      setMessage("");

      try {
        const response = await fetch(`/api/comments?market_id=${encodeURIComponent(marketId)}&sort=${sort}`, {
          cache: "no-store"
        });
        const json = await readApiResponse(response);

        if (!response.ok) {
          throw new Error(typeof json.error === "string" ? json.error : "Could not load comments");
        }

        if (!cancelled) {
          setComments(readComments(json.data));
          setStatus("idle");
        }
      } catch (error) {
        if (!cancelled) {
          setStatus("error");
          setMessage(error instanceof Error ? error.message : "Could not load comments");
        }
      }
    }

    loadComments();

    return () => {
      cancelled = true;
    };
  }, [marketId, sort]);

  async function postComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextBody = body.trim();
    if (!nextBody || status === "posting") return;

    setStatus("posting");
    setMessage("");

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          market_id: marketId,
          body: nextBody
        })
      });
      const json = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(typeof json.error === "string" ? json.error : "Could not post comment");
      }

      const comment = isComment(json.data) ? json.data : null;
      if (comment) {
        setComments((current) => [comment, ...current]);
      }
      setBody("");
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not post comment");
    }
  }

  const compact = variant === "panel";

  return (
    <section
      className={
        compact
          ? "rounded-3xl border border-white/10 bg-black/20 p-4"
          : "rounded-3xl border border-white/10 bg-slate-950/60 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl"
      }
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageCircle size={18} className="text-cyan-300" />
          <div>
            <h2 className="text-sm font-semibold text-white sm:text-base">Discussion</h2>
            <p className="text-xs text-slate-500">{comments.length} comments</p>
          </div>
        </div>
        <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
          {(["top", "newest"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSort(item)}
              className={[
                "rounded-full px-3 py-1 text-xs capitalize transition",
                sort === item ? "bg-cyan-400/15 text-cyan-100" : "text-slate-400 hover:text-white"
              ].join(" ")}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {isAuthenticated ? (
        <form className="mb-4 space-y-2" onSubmit={postComment}>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={500}
            rows={compact ? 2 : 3}
            className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
            placeholder="Add your conviction..."
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500">{body.trim().length}/500</span>
            <button
              type="submit"
              disabled={!body.trim() || status === "posting"}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/40 bg-cyan-400/15 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "posting" ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Post
            </button>
          </div>
        </form>
      ) : (
        <Link
          href={`/login?next=${encodeURIComponent(returnPath)}`}
          className="mb-4 block rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm text-slate-200 hover:bg-white/[0.08]"
        >
          Login to comment
        </Link>
      )}

      {message ? (
        <div className="mb-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-100">
          {message}
        </div>
      ) : null}

      <div className={compact ? "max-h-72 space-y-3 overflow-y-auto pr-1" : "space-y-3"}>
        {status === "loading" && comments.length === 0 ? (
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/10 p-3 text-sm text-slate-400">
            <Loader2 size={15} className="animate-spin" /> Loading discussion...
          </div>
        ) : null}

        {visibleComments.length === 0 && status !== "loading" ? (
          <p className="rounded-2xl border border-white/10 bg-black/10 p-3 text-sm text-slate-400">
            No comments yet. Start the read on this market.
          </p>
        ) : null}

        {visibleComments.map((comment) => (
          <article key={comment.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
            <div className="mb-2 flex items-center gap-2">
              <AuthorAvatar comment={comment} />
              <div className="min-w-0">
                <AuthorName comment={comment} />
                <p className="text-xs text-slate-500">{formatTime(comment.created_at)}</p>
              </div>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">{comment.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
