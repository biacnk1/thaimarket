import {
  getLocalMarkets,
  getLocalProfileByUserId,
  getLocalProfileByUsername
} from "@/lib/dev/local-store";
import { canUseSupabase, isLocalMode } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PublicProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  profile_picture_url: string | null;
  bio: string | null;
  gender: string | null;
  age: number | null;
  province: string | null;
  occupation: string | null;
  social_links: string[];
  reputation_links: string[];
  reputation: number;
  points_balance: number;
  created_at: string | null;
};

export type CreatorMarket = {
  id: string;
  title: string;
  slug: string | null;
  status: "open" | "closed" | "resolved";
  category: string | null;
  close_date: string | null;
  closes_at: string | null;
  created_at: string | null;
  total_predictions: number | null;
  yes_percentage: number | null;
};

const fullProfileSelect = [
  "id",
  "username",
  "display_name",
  "avatar_url",
  "profile_picture_url",
  "bio",
  "gender",
  "age",
  "province",
  "occupation",
  "social_links",
  "reputation_links",
  "reputation",
  "points_balance",
  "created_at"
].join(", ");

const baseProfileSelect = [
  "id",
  "username",
  "display_name",
  "avatar_url",
  "bio",
  "reputation",
  "points_balance",
  "created_at"
].join(", ");

function isMissingColumnError(error: { code?: string; message?: string } | null) {
  return error?.code === "42703" || error?.message?.toLowerCase().includes("does not exist");
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function normalizeProfile(row: Record<string, unknown>): PublicProfile {
  const avatarUrl = typeof row.avatar_url === "string" ? row.avatar_url : null;
  const profilePictureUrl =
    typeof row.profile_picture_url === "string" ? row.profile_picture_url : avatarUrl;

  return {
    id: String(row.id),
    username: typeof row.username === "string" ? row.username : null,
    display_name: typeof row.display_name === "string" ? row.display_name : null,
    avatar_url: avatarUrl,
    profile_picture_url: profilePictureUrl,
    bio: typeof row.bio === "string" ? row.bio : null,
    gender: typeof row.gender === "string" ? row.gender : null,
    age: typeof row.age === "number" ? row.age : null,
    province: typeof row.province === "string" ? row.province : null,
    occupation: typeof row.occupation === "string" ? row.occupation : null,
    social_links: readStringArray(row.social_links),
    reputation_links: readStringArray(row.reputation_links),
    reputation: Number(row.reputation ?? 0),
    points_balance: Number(row.points_balance ?? 1000),
    created_at: typeof row.created_at === "string" ? row.created_at : null
  };
}

function normalizeMarket(row: Record<string, unknown>): CreatorMarket {
  return {
    id: String(row.id),
    title: String(row.title),
    slug: typeof row.slug === "string" ? row.slug : null,
    status: (row.status as CreatorMarket["status"]) ?? "open",
    category: typeof row.category === "string" ? row.category : null,
    close_date: typeof row.close_date === "string" ? row.close_date : null,
    closes_at: typeof row.closes_at === "string" ? row.closes_at : null,
    created_at: typeof row.created_at === "string" ? row.created_at : null,
    total_predictions: typeof row.total_predictions === "number" ? row.total_predictions : 0,
    yes_percentage: typeof row.yes_percentage === "number" ? row.yes_percentage : 0
  };
}

async function getSupabaseProfile(field: "id" | "username", value: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(fullProfileSelect)
    .eq(field, value)
    .maybeSingle();

  if (data && !error) return normalizeProfile(data as unknown as Record<string, unknown>);

  if (!isMissingColumnError(error)) {
    if (error) console.error("Could not load public profile:", error.message);
    return null;
  }

  const { data: fallbackData, error: fallbackError } = await supabase
    .from("profiles")
    .select(baseProfileSelect)
    .eq(field, value)
    .maybeSingle();

  if (fallbackError) {
    console.error("Could not load public profile:", fallbackError.message);
    return null;
  }

  return fallbackData ? normalizeProfile(fallbackData as unknown as Record<string, unknown>) : null;
}

export async function getPublicProfileByUsername(username: string) {
  const normalized = username.trim().toLowerCase();

  if (!/^[a-z0-9_]{3,24}$/.test(normalized)) {
    return null;
  }

  if (isLocalMode() || !canUseSupabase()) {
    const profile = await getLocalProfileByUsername(normalized);
    return profile ? normalizeProfile(profile as unknown as Record<string, unknown>) : null;
  }

  return getSupabaseProfile("username", normalized);
}

export async function getPublicProfileById(id: string) {
  if (!/^[0-9a-z-]{8,}$/i.test(id)) {
    return null;
  }

  if (isLocalMode() || !canUseSupabase()) {
    const profile = await getLocalProfileByUserId(id);
    return profile ? normalizeProfile(profile as unknown as Record<string, unknown>) : null;
  }

  return getSupabaseProfile("id", id);
}

export async function getCreatorMarkets(profileId: string) {
  if (isLocalMode() || !canUseSupabase()) {
    const markets = await getLocalMarkets();
    return markets
      .filter((market) => market.creator_user_id === profileId)
      .slice(0, 6)
      .map((market) => normalizeMarket(market as unknown as Record<string, unknown>));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("market_stats")
    .select("id, title, slug, status, category, close_date, closes_at, created_at, total_predictions, yes_percentage, creator_user_id")
    .eq("creator_user_id", profileId)
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    console.error("Could not load creator markets:", error.message);
    return [];
  }

  return ((data ?? []) as Record<string, unknown>[]).map(normalizeMarket);
}
