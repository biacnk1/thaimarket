import { fail, ok } from "@/lib/api/responses";
import { isAdminUser } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/server";
import {
  addLocalMarketRequest,
  getLocalMarketRequests
} from "@/lib/dev/local-store";
import { canUseSupabase, isLocalMode } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedCategories = new Set(["Thailand", "Politics", "Crypto", "AI", "Economy"]);

export const dynamic = "force-dynamic";
export const revalidate = 0;

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validateRequestBody(body: unknown) {
  if (!body || typeof body !== "object") {
    return { error: "Invalid request body" };
  }

  const record = body as Record<string, unknown>;
  const question = readString(record.question);
  const description = readString(record.description);
  const category = readString(record.category);
  const closesAtValue = readString(record.closes_at);
  const closesAt = new Date(closesAtValue);

  if (question.length < 12 || question.length > 180) {
    return { error: "Question must be 12-180 characters" };
  }

  if (!allowedCategories.has(category)) {
    return { error: "Choose a valid category" };
  }

  if (!closesAtValue || Number.isNaN(closesAt.getTime())) {
    return { error: "Choose a clear close date and time" };
  }

  if (closesAt.getTime() <= Date.now() + 60 * 60 * 1000) {
    return { error: "Close time must be at least 1 hour in the future" };
  }

  return {
    data: {
      question,
      description: description || null,
      category,
      closes_at: closesAt.toISOString()
    }
  };
}

export async function GET() {
  if (isLocalMode()) {
    return ok(await getLocalMarketRequests());
  }

  if (!canUseSupabase()) {
    return fail("Supabase is not configured for market requests", 503);
  }

  const user = await getCurrentUser();

  if (!user) {
    return fail("Unauthorized", 401);
  }

  try {
    const isAdmin = await isAdminUser(user);
    const supabase = isAdmin
      ? createSupabaseAdminClient() ?? (await createSupabaseServerClient())
      : await createSupabaseServerClient();
    let query = supabase
      .from("market_requests")
      .select("*");

    if (!isAdmin) {
      query = query.eq("requester_user_id", user.id);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase market request queue unavailable:", error.message);
      return fail(error.message, 500);
    }

    return ok(data ?? []);
  } catch (error) {
    console.error("Supabase market request queue unavailable:", error);
    return fail("Could not load market requests", 500);
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = validateRequestBody(body);

  if ("error" in result) {
    return fail(result.error ?? "Invalid request body", 400);
  }

  const user = await getCurrentUser();

  if (!user) {
    return fail("Unauthorized", 401);
  }

  if (isLocalMode()) {
    return ok(
      await addLocalMarketRequest({
        ...result.data,
        requester_user_id: user.id
      }),
      201
    );
  }

  if (!canUseSupabase()) {
    return fail("Supabase is not configured for market requests", 503);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("market_requests")
      .insert({
        ...result.data,
        requester_user_id: user.id,
        status: "pending"
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase market request queue unavailable:", error.message);
      return fail(error.message, 500);
    }

    return ok(data, 201);
  } catch (error) {
    console.error("Supabase market request queue unavailable:", error);
    const message = error instanceof Error ? error.message : "Could not submit market request";
    return fail(message, 500);
  }
}
