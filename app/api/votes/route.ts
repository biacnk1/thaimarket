import { fail, ok } from "@/lib/api/responses";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) return fail("Unauthorized", 401);

  const body = await request.json();
  const { market_id, side } = body;

  if (!market_id || !["yes", "no"].includes(side)) {
    return fail("Invalid request body", 400);
  }

  const { error: voteError } = await supabase.from("votes").upsert(
    {
      market_id,
      user_id: user.id,
      side,
      updated_at: new Date().toISOString()
    },
    {
      onConflict: "market_id,user_id"
    }
  );

  if (voteError) return fail(voteError.message, 500);

  const { data: stats, error: statsError } = await supabase
    .from("market_stats")
    .select("*")
    .eq("id", market_id)
    .single();

  if (statsError) return fail(statsError.message, 500);

  return ok(stats);
}
