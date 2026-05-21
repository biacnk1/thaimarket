import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminCandidate = {
  id?: string | null;
  email?: string | null;
  app_metadata?: Record<string, unknown>;
} | null;

function hasAdminOverride(user: AdminCandidate) {
  if (!user) return false;

  const role = user.app_metadata?.role;
  if (role === "admin") return true;

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return Boolean(user.email && adminEmails.includes(user.email.toLowerCase()));
}

function normalizeUsername(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().toLowerCase() : null;
}

export async function isAdminUser(user: AdminCandidate) {
  if (!user) return false;
  if (hasAdminOverride(user)) return true;
  if (!user.id) return false;

  const supabase = createSupabaseAdminClient();
  if (!supabase) return false;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle<{ username: string | null }>();

  if (profileError && profileError.code !== "PGRST116") {
    console.error("Could not read admin profile:", profileError.message);
    return false;
  }

  const username = normalizeUsername(profile?.username);
  if (!username) return false;

  const { data: adminUser, error: adminError } = await supabase
    .from("admin_users")
    .select("username")
    .eq("username", username)
    .maybeSingle<{ username: string }>();

  if (adminError && adminError.code !== "PGRST116") {
    console.error("Could not read admin_users:", adminError.message);
    return false;
  }

  return Boolean(adminUser);
}
