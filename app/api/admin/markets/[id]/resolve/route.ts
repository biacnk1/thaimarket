import { fail, ok } from "@/lib/api/responses";
import { isAdminUser } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/server";
import { canUseSupabase } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function readOutcome(value: unknown) {
  if (typeof value !== "string") return null;
  const outcome = value.trim().toUpperCase();
  return outcome === "YES" || outcome === "NO" ? outcome : null;
}

function mapResolveError(message: string) {
  if (message.includes("Market not found")) return 404;
  if (message.includes("already resolved")) return 409;
  if (message.includes("Choose YES or NO")) return 400;
  if (message.includes("Admin access")) return 403;
  return 500;
}

export async function POST(request: Request, { params }: RouteContext) {
  if (!canUseSupabase()) {
    return fail("Supabase is not configured for market resolution", 503);
  }

  const user = await getCurrentUser();

  if (!user) {
    return fail("Unauthorized", 401);
  }

  if (!(await isAdminUser(user))) {
    return fail("Admin access required", 403);
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const outcome = readOutcome(body?.outcome ?? body?.resolved_outcome);

  if (!id || !outcome) {
    return fail("Choose YES or NO", 400);
  }

  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return fail("SUPABASE_SERVICE_ROLE_KEY is required for market resolution", 503);
  }

  const { data, error } = await supabase.rpc("resolve_market", {
    p_market_id: id,
    p_outcome: outcome,
    p_admin_id: user.id
  });

  if (error) {
    console.error("Market resolve failed:", error.message);
    return fail(error.message, mapResolveError(error.message));
  }

  return ok(data);
}
