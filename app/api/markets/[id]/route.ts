import { fail, ok } from "@/lib/api/responses";
import { demoMarketStats } from "@/lib/markets/demo";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: market, error } = await supabase
    .from("market_stats")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    const fallbackMarket = demoMarketStats.find((item) => item.id === id);
    if (fallbackMarket) {
      console.error("Supabase market detail unavailable:", error.message);
      return ok({
        ...fallbackMarket,
        user_vote: null
      });
    }

    return fail(error.message, 404);
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  let userVote: string | null = null;

  if (user) {
    const { data: vote } = await supabase
      .from("votes")
      .select("side")
      .eq("market_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    userVote = vote?.side ?? null;
  }

  return ok({
    ...market,
    user_vote: userVote
  });
}
