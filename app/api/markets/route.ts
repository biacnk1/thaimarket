import { fail, ok } from "@/lib/api/responses";
import { demoMarketStats } from "@/lib/markets/demo";
import { getLocalApprovedMarkets } from "@/lib/markets/request-queue";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("market_stats")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase market feed unavailable:", error.message);
    return ok([...getLocalApprovedMarkets(), ...demoMarketStats]);
  }

  return ok([...getLocalApprovedMarkets(), ...(data ?? [])]);
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
