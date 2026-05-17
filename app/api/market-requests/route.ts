import { fail, ok } from "@/lib/api/responses";
import { addLocalMarketRequest, getLocalMarketRequests } from "@/lib/markets/request-queue";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedCategories = new Set(["Thailand", "Politics", "Crypto", "AI", "Economy"]);
const allowLocalFallback = process.env.NODE_ENV !== "production";

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
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("market_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase market request queue unavailable:", error.message);
      return allowLocalFallback ? ok(getLocalMarketRequests()) : fail(error.message, 500);
    }

    return ok([...(allowLocalFallback ? getLocalMarketRequests() : []), ...(data ?? [])]);
  } catch (error) {
    console.error("Supabase market request queue unavailable:", error);
    return allowLocalFallback ? ok(getLocalMarketRequests()) : fail("Could not load market requests", 500);
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = validateRequestBody(body);

  if ("error" in result) {
    return fail(result.error ?? "Invalid request body", 400);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("market_requests")
      .insert({
        ...result.data,
        requester_user_id: null,
        status: "pending"
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase market request queue unavailable:", error.message);
      return allowLocalFallback ? ok(addLocalMarketRequest(result.data), 202) : fail(error.message, 500);
    }

    return ok(data, 201);
  } catch (error) {
    console.error("Supabase market request queue unavailable:", error);
    return allowLocalFallback ? ok(addLocalMarketRequest(result.data), 202) : fail("Could not submit market request", 500);
  }
}
