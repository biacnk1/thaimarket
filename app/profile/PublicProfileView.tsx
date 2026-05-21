import Link from "next/link";
import { ArrowLeft, Briefcase, CalendarDays, ExternalLink, MapPin, Radio, UserRound } from "lucide-react";

import type { CreatorMarket, PublicProfile } from "@/lib/profiles/public";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(value: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function linkLabel(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

function ProfileLinks({ title, links }: { title: string; links: string[] }) {
  if (links.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/15 p-5">
      <p className="mb-3 text-sm font-medium text-slate-200">{title}</p>
      <div className="space-y-2">
        {links.map((link) => (
          <a
            key={link}
            href={link}
            target="_blank"
            rel="noreferrer"
            className="flex min-w-0 items-center gap-2 text-sm text-cyan-200 hover:text-cyan-100"
          >
            <ExternalLink size={14} className="shrink-0" />
            <span className="truncate">{linkLabel(link)}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function CreatorMarkets({ markets }: { markets: CreatorMarket[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/15 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-200">Created markets</p>
          <p className="mt-1 text-xs text-slate-500">{markets.length} shown</p>
        </div>
        <Radio size={18} className="text-cyan-300" />
      </div>

      {markets.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-slate-400">
          No public markets created yet.
        </p>
      ) : (
        <div className="space-y-2">
          {markets.map((market) => (
            <Link
              key={market.id}
              href={`/markets/${market.slug ?? market.id}`}
              className="block rounded-2xl border border-white/10 bg-white/[0.025] p-4 hover:bg-white/[0.05]"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>{market.category ?? "General"}</span>
                <span className="rounded-full border border-white/10 px-2 py-0.5 uppercase text-slate-300">
                  {market.status}
                </span>
              </div>
              <p className="line-clamp-2 text-sm font-medium text-white">{market.title}</p>
              <p className="mt-2 text-xs text-slate-500">
                {market.total_predictions ?? 0} signals - YES {market.yes_percentage ?? 0}%
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function PublicProfileView({
  profile,
  markets
}: {
  profile: PublicProfile;
  markets: CreatorMarket[];
}) {
  const displayName = profile.display_name || profile.username || "Predictor";
  const pictureUrl = profile.profile_picture_url ?? profile.avatar_url;

  return (
    <main className="min-h-screen bg-[#090D14] px-4 py-8 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl">
        <Link href="/feed" className="mb-5 inline-flex items-center gap-2 text-sm text-cyan-200 hover:text-cyan-100">
          <ArrowLeft size={16} /> Back to feed
        </Link>

        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/25">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {pictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pictureUrl}
                  alt={displayName}
                  className="h-20 w-20 rounded-2xl border border-white/10 object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-400/15 text-2xl font-bold text-cyan-100">
                  {profile.username || profile.display_name ? getInitials(displayName) : <UserRound size={26} />}
                </div>
              )}
              <div className="min-w-0">
                <p className="mb-1 text-sm text-cyan-200">Predictor</p>
                <h1 className="break-words text-3xl font-bold">{displayName}</h1>
                <p className="mt-1 text-sm text-slate-400">@{profile.username ?? profile.id}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
              <CalendarDays className="mb-2 text-cyan-300" size={18} />
              <p className="text-xs text-slate-500">Joined</p>
              <p className="mt-1 text-sm font-semibold text-white">{formatDate(profile.created_at)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
              <MapPin className="mb-2 text-emerald-300" size={18} />
              <p className="text-xs text-slate-500">Province</p>
              <p className="mt-1 text-sm font-semibold text-white">{profile.province ?? "Not shared"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
              <Briefcase className="mb-2 text-indigo-300" size={18} />
              <p className="text-xs text-slate-500">Occupation</p>
              <p className="mt-1 text-sm font-semibold text-white">{profile.occupation ?? "Not shared"}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/15 p-5">
                <p className="mb-2 text-sm font-medium text-slate-200">Bio</p>
                <p className="text-sm leading-6 text-slate-400">
                  {profile.bio || "This predictor has not added a public bio yet."}
                </p>
              </div>
              <CreatorMarkets markets={markets} />
            </div>

            <div className="space-y-4">
              <ProfileLinks title="Social links" links={profile.social_links} />
              <ProfileLinks title="Reputation links" links={profile.reputation_links} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
