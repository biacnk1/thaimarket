import Link from "next/link";
import { redirect } from "next/navigation";

import { ProfileSettingsForm } from "@/app/settings/profile/ProfileSettingsForm";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/server";

export default async function ProfileSettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/settings/profile");
  }

  const profile = await getCurrentProfile();

  return (
    <main className="min-h-screen bg-[#0B0F19] px-4 py-8 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-2 text-sm text-cyan-200">Profile settings</p>
            <h1 className="text-3xl font-bold">Edit your public profile</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Keep it lightweight for now: name, username, avatar, and a short prediction edge.
            </p>
          </div>
          <Link href="/profile" className="text-sm text-slate-300 hover:text-white">
            Back to profile
          </Link>
        </div>

        <ProfileSettingsForm
          profile={{
            username: profile?.username ?? null,
            display_name: profile?.display_name ?? user.email?.split("@")[0] ?? null,
            avatar_url: profile?.profile_picture_url ?? profile?.avatar_url ?? null,
            bio: profile?.bio ?? null,
            occupation: profile?.occupation ?? null,
            social_links: profile?.social_links ?? [],
            reputation_links: profile?.reputation_links ?? []
          }}
        />
      </section>
    </main>
  );
}
