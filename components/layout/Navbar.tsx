import Link from "next/link";
import { Coins, ShieldCheck } from "lucide-react";

import { signOut } from "@/lib/auth/actions";
import { isAdminUser } from "@/lib/auth/admin";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/server";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export async function Navbar() {
  const user = await getCurrentUser();
  const profile = user ? await getCurrentProfile() : null;
  const admin = user ? await isAdminUser(user) : false;
  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Profile";
  const pictureUrl = profile?.profile_picture_url ?? profile?.avatar_url;

  return (
    <nav className="border-b border-white/10 bg-[#0B0F19]/90 px-4 py-4 text-white backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <Link href="/feed" className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.9)]" />
          <span className="text-sm font-semibold tracking-wide text-slate-100">ThaiMarket</span>
        </Link>

        {user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-100">
              <Coins size={15} />
              <span>{profile?.points_balance ?? 1000}</span>
            </span>
            {admin ? (
              <Link
                href="/admin/requests"
                className="hidden items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300 hover:bg-white/[0.08] sm:inline-flex"
              >
                <ShieldCheck size={15} /> Admin
              </Link>
            ) : null}
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 hover:bg-white/[0.08]"
            >
              {pictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pictureUrl} alt={displayName} className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400/20 text-xs font-bold text-cyan-100">
                  {getInitials(displayName)}
                </span>
              )}
              <span className="hidden max-w-32 truncate sm:inline">{displayName}</span>
              <span className="sm:hidden">Profile</span>
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300 hover:bg-white/[0.08]"
              >
                Logout
              </button>
            </form>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300 hover:bg-white/[0.08]"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-500 px-3 py-2 text-sm font-semibold text-white shadow-[0_0_30px_rgba(34,211,238,0.16)]"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
