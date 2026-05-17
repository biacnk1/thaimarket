import { fail, ok } from "@/lib/api/responses";
import { approveLocalMarketRequest } from "@/lib/markets/request-queue";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowLocalFallback = process.env.NODE_ENV !== "production";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  try {
    const supabase = await createSupabaseServerClient();
    const { data: marketRequest, error: requestError } = await supabase
      .from("market_requests")
      .select("*")
      .eq("id", id)
      .eq("status", "pending")
      .single();

    if (requestError || !marketRequest) {
      if (allowLocalFallback) {
        const localRequest = approveLocalMarketRequest(id);

        if (localRequest) {
          return ok({
            request_id: id,
            market: localRequest.market
          });
        }
      }

      return fail(requestError?.message ?? "Market request not found", 404);
    }

    const { data: market, error: marketError } = await supabase
      .from("markets")
      .insert({
        title: marketRequest.question,
        description: marketRequest.description,
        category: marketRequest.category,
        closes_at: marketRequest.closes_at
      })
      .select()
      .single();

    if (marketError) return fail(marketError.message, 500);

    const { error: updateError } = await supabase
      .from("market_requests")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString()
      })
      .eq("id", id);

    if (updateError) return fail(updateError.message, 500);

    return ok({
      request_id: id,
      market
    });
  } catch (error) {
    console.error("Approve request failed:", error);
    if (allowLocalFallback) {
      const localRequest = approveLocalMarketRequest(id);

      if (localRequest) {
        return ok({
          request_id: id,
          market: localRequest.market
        });
      }
    }

    return fail("Market request not found", 404);
  }
}
