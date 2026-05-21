import { fail, ok } from "@/lib/api/responses";
import { isAdminUser } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/server";
import { approveLocalMarketRequest } from "@/lib/dev/local-store";
import { canUseSupabase, isLocalMode } from "@/lib/env";
import { createMarketSlug } from "@/lib/markets/slug";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type MarketRequestRow = {
  id: string;
  question: string;
  description: string | null;
  category: string;
  closes_at: string;
  status: "pending" | "approved" | "rejected";
};

type MarketRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: "open" | "closed" | "resolved";
  close_date: string | null;
  closes_at: string | null;
  slug: string;
};

function buildMarketPayload(marketRequest: MarketRequestRow) {
  return {
    id: marketRequest.id,
    title: marketRequest.question,
    description: marketRequest.description,
    category: marketRequest.category,
    close_date: marketRequest.closes_at,
    closes_at: marketRequest.closes_at,
    slug: createMarketSlug(marketRequest.question, marketRequest.id),
    status: "open" as const
  };
}

export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  if (isLocalMode()) {
    const localRequest = await approveLocalMarketRequest(id);

    if (!localRequest) {
      return fail("Market request not found", 404);
    }

    return ok({
      request_id: id,
      market: localRequest.market
    });
  }

  if (!canUseSupabase()) {
    return fail("Supabase is not configured for market approval", 503);
  }

  const currentUser = await getCurrentUser();

  if (!currentUser || !(await isAdminUser(currentUser))) {
    return fail("Admin access required", 403);
  }

  try {
    const supabase = createSupabaseAdminClient();

    if (!supabase) {
      return fail("SUPABASE_SERVICE_ROLE_KEY is required for market approval", 503);
    }

    const { data: marketRequest, error: requestError } = await supabase
      .from("market_requests")
      .select("*")
      .eq("id", id)
      .single<MarketRequestRow>();

    if (requestError || !marketRequest) {
      return fail(requestError?.message ?? "Market request not found", 404);
    }

    if (marketRequest.status === "rejected") {
      return fail("Rejected market requests cannot be approved", 409);
    }

    const { data: existingMarket, error: existingMarketError } = await supabase
      .from("markets")
      .select("*")
      .eq("id", id)
      .maybeSingle<MarketRow>();

    if (existingMarketError && existingMarketError.code !== "PGRST116") {
      return fail(existingMarketError.message, 500);
    }

    let market = existingMarket;

    if (!market) {
      const marketPayload = buildMarketPayload(marketRequest);
      const { data: insertedMarket, error: marketError } = await supabase
        .from("markets")
        .insert(marketPayload)
        .select()
        .single<MarketRow>();

      if (marketError) {
        if (marketError.code !== "23505") return fail(marketError.message, 500);

        const { data: duplicatedMarket, error: duplicatedMarketError } = await supabase
          .from("markets")
          .select("*")
          .eq("id", marketPayload.id)
          .maybeSingle<MarketRow>();

        if (duplicatedMarketError || !duplicatedMarket) {
          return fail(duplicatedMarketError?.message ?? "Market publish conflict could not be resolved", 409);
        }
        market = duplicatedMarket;
      } else {
        market = insertedMarket;
      }
    }

    if (marketRequest.status === "approved") {
      return ok({
        request_id: id,
        request: marketRequest,
        market,
        duplicate_publish_prevented: true
      });
    }

    const { data: approvedRequest, error: updateError } = await supabase
      .from("market_requests")
      .update({
        status: "approved",
        reviewed_by: currentUser.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("status", "pending")
      .select()
      .maybeSingle();

    if (updateError) return fail(updateError.message, 500);

    if (!approvedRequest) {
      const { data: latestRequest, error: latestRequestError } = await supabase
        .from("market_requests")
        .select("*")
        .eq("id", id)
        .single<MarketRequestRow>();

      if (latestRequestError) return fail(latestRequestError.message, 500);
      if (latestRequest.status !== "approved") {
        return fail("Market request was not approved. Refresh and try again.", 409);
      }
    }

    return ok({
      request_id: id,
      market
    });
  } catch (error) {
    console.error("Approve request failed:", error);
    return fail(error instanceof Error ? error.message : "Could not approve request", 500);
  }
}
