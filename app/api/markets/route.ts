import { fail, ok } from "@/lib/api/responses";
import { demoMarketStats } from "@/lib/markets/demo";
import { getLocalApprovedMarkets } from "@/lib/markets/request-queue";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowLocalFallback = process.env.NODE_ENV !== "production";

function marketRowToStat(row: {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: "open" | "closed" | "resolved";
  result: "yes" | "no" | null;
  closes_at: string | null;
  created_at: string;
}) {
  return {
    ...row,
    category: row.category ?? "General",
    total_votes: 0,
    yes_count: 0,
    no_count: 0,
    yes_percentage: 0
  };
}

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("market_stats")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase market feed unavailable:", error.message);

    const { data: marketRows, error: marketsError } = await supabase
      .from("markets")
      .select("id, title, description, category, status, result, closes_at, created_at")
      .order("created_at", { ascending: false });

    if (!marketsError) {
      return ok([
        ...(allowLocalFallback ? getLocalApprovedMarkets() : []),
        ...(marketRows ?? []).map(marketRowToStat)
      ]);
    }

    return allowLocalFallback
      ? ok([...getLocalApprovedMarkets(), ...demoMarketStats])
      : fail(marketsError.message, 500);
  }

  return ok([...(allowLocalFallback ? getLocalApprovedMarkets() : []), ...(data ?? [])]);
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) return fail("Unauthorized", 401);

  const body = await request.json();
  const { title, description, category, closes_at } = body;

  if (!title || typeof title !== "string") {
    return fail("title is required", 400);
  }

  // MVP note: lock this down to an admin role before production.
  const { data, error } = await supabase
    .from("markets")
    .insert({
      title,
      description,
      category: category || "General",
      closes_at: closes_at || null
    })
    .select()
    .single();

  if (error) return fail(error.message, 500);

  return ok(data, 201);
}
