import { fail, ok } from "@/lib/api/responses";
import { getCurrentUser } from "@/lib/auth/server";
import { canUseSupabase } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function readSide(value: unknown) {
  if (typeof value !== "string") return null;
  const side = value.trim().toUpperCase();
  return side === "YES" || side === "NO" ? side : null;
}

function readAmount(value: unknown) {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isInteger(amount) ? amount : null;
}

function mapPredictionError(message: string) {
  if (message.includes("Market not found")) return 404;
  if (message.includes("Market is not open") || message.includes("close date")) return 409;
  if (
    message.includes("Insufficient points") ||
    message.includes("Amount") ||
    message.includes("Choose YES or NO")
  ) {
    return 400;
  }

  return 500;
}

export async function POST(request: Request) {
  if (!canUseSupabase()) {
    return fail("Supabase is not configured for predictions", 503);
  }

  const user = await getCurrentUser();

  if (!user) {
    return fail("Unauthorized", 401);
  }

  const body = await request.json().catch(() => null);
  const marketId = typeof body?.market_id === "string" ? body.market_id : "";
  const side = readSide(body?.side);
  const amount = readAmount(body?.amount);

  if (!marketId || !side || amount === null || amount <= 0) {
    return fail("Invalid prediction", 400);
  }

  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return fail("SUPABASE_SERVICE_ROLE_KEY is required for predictions", 503);
  }

  const { data, error } = await supabase.rpc("place_prediction", {
    p_market_id: marketId,
    p_side: side,
    p_amount: amount,
    p_user_id: user.id
  });

  if (error) {
    console.error("Prediction failed:", error.message);
    return fail(error.message, mapPredictionError(error.message));
  }

  return ok(data, 201);
}
