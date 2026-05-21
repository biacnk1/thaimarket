import { fail, ok } from "@/lib/api/responses";
import { getCurrentUser } from "@/lib/auth/server";
import { canUseSupabase } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  if (!canUseSupabase()) {
    return fail("Supabase is not configured for markets", 503);
  }

  const supabase = await createSupabaseServerClient();

  const marketQuery = supabase.from("market_stats").select("*");
  const { data: market, error } = await (isUuid(id)
    ? marketQuery.eq("id", id).maybeSingle()
    : marketQuery.eq("slug", id).maybeSingle());

  if (error || !market) {
    return fail(error?.message ?? "Market not found", 404);
  }

  let userPredictions: unknown[] = [];

  if (currentUser) {
    const { data: predictions } = await supabase
      .from("predictions")
      .select("id, side, amount, result_status, payout_amount, created_at")
      .eq("market_id", market.id)
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false });

    userPredictions = predictions ?? [];
  }

  return ok({
    ...market,
    user_predictions: userPredictions
  });
}
