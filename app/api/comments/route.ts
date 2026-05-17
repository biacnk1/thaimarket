import { fail, ok } from "@/lib/api/responses";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { searchParams } = new URL(request.url);
  const marketId = searchParams.get("market_id");

  if (!marketId) return fail("market_id is required", 400);

  const { data, error } = await supabase
    .from("comments")
    .select("id, body, user_id, created_at")
    .eq("market_id", marketId)
    .order("created_at", { ascending: false });

  if (error) return fail(error.message, 500);

  return ok(data);
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) return fail("Unauthorized", 401);

  const body = await request.json();
  const { market_id, body: commentBody } = body;

  if (!market_id || !commentBody || typeof commentBody !== "string" || commentBody.length > 500) {
    return fail("Invalid comment", 400);
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      market_id,
      user_id: user.id,
      body: commentBody
    })
    .select()
    .single();

  if (error) return fail(error.message, 500);

  return ok(data, 201);
}
