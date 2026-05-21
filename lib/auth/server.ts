import type { User } from "@supabase/supabase-js";

import { hasSupabaseConfig } from "@/lib/env";
import { getLocalAuthUserById, getLocalProfileByUserId } from "@/lib/dev/local-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const localAuthCookieName = "thaimarket-local-user-id";

export type AuthUser = {
  id: string;
  email?: string | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  created_at?: string;
};

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  reputation: number;
  points_balance: number;
  created_at: string;
  updated_at: string;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

function readMetadataText(user: AuthUser, key: string) {
  const value = user.user_metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function fallbackDisplayName(user: AuthUser) {
  return readMetadataText(user, "display_name") ?? user.email?.split("@")[0] ?? "ThaiMarket user";
}

function fallbackProfile(user: AuthUser): Profile {
  const now = new Date().toISOString();

  return {
    id: user.id,
    username: readMetadataText(user, "username"),
    display_name: fallbackDisplayName(user),
    avatar_url: readMetadataText(user, "avatar_url"),
    bio: null,
    reputation: 0,
    points_balance: 1000,
    created_at: now,
    updated_at: now
  };
}

export async function getCurrentUser() {
  if (!hasSupabaseConfig()) {
    const cookieStore = await cookies();
    const localUserId = cookieStore.get(localAuthCookieName)?.value;

    if (!localUserId) return null;

    return getLocalAuthUserById(localUserId);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error) return null;
    return user as User;
  } catch (error) {
    console.error("Could not read Supabase user:", error);
    return null;
  }
}

async function ensureProfileForUser(supabase: SupabaseServerClient, user: AuthUser) {
  const fallback = fallbackProfile(user);
  const { data: profile, error: readError } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, reputation, points_balance, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profile && !readError) {
    return profile as Profile;
  }

  if (readError && readError.code !== "PGRST116") {
    console.error("Could not read profile:", readError.message);
  }

  const { data: createdProfile, error: upsertError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        username: fallback.username,
        display_name: fallback.display_name,
        avatar_url: fallback.avatar_url,
        bio: fallback.bio,
        points_balance: fallback.points_balance
      },
      { onConflict: "id" }
    )
    .select("id, username, display_name, avatar_url, bio, reputation, points_balance, created_at, updated_at")
    .single();

  if (createdProfile && !upsertError) {
    return createdProfile as Profile;
  }

  if (upsertError) {
    console.error("Could not create profile:", upsertError.message);
  }

  return fallback;
}

export async function getCurrentProfile() {
  if (!hasSupabaseConfig()) {
    const user = await getCurrentUser();
    return user ? getLocalProfileByUserId(user.id) : null;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error || !user) return null;
    return ensureProfileForUser(supabase, user);
  } catch (error) {
    console.error("Could not read current profile:", error);
    return null;
  }
}
