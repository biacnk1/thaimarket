import { fail, ok } from "@/lib/api/responses";
import { isAdminUser } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/server";
import { canUseSupabase } from "@/lib/env";
import { createMarketSlug } from "@/lib/markets/slug";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function marketRowToStat(row: {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: "open" | "closed" | "resolved";
  result: "yes" | "no" | null;
  resolved_outcome?: "YES" | "NO" | null;
  resolved_at?: string | null;
  close_date?: string | null;
  closes_at: string | null;
  slug?: string | null;
  created_at: string;
}) {
  return {
    ...row,
    category: row.category ?? "General",
    close_date: row.close_date ?? row.closes_at,
    slug: row.slug ?? row.id,
    total_predictions: 0,
    total_volume: 0,
    total_votes: 0,
    yes_count: 0,
    no_count: 0,
    yes_amount: 0,
    no_amount: 0,
    yes_percentage: 0
  };
}

export async function GET() {
  if (!canUseSupabase()) {
    return fail("Supabase is not configured for markets", 503);
  }

  const supabase = createSupabaseAdminClient() ?? (await createSupabaseServerClient());

  const { data, error } = await supabase
    .from("market_stats")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase market feed unavailable:", error.message);

    const { data: marketRows, error: marketsError } = await supabase
      .from("markets")
      .select("id, title, description, category, status, result, resolved_outcome, resolved_at, close_date, closes_at, slug, created_at")
      .order("created_at", { ascending: false });

    if (!marketsError) {
      return ok((marketRows ?? []).map(marketRowToStat));
    }

    return fail(marketsError.message, 500);
  }

  return ok(data ?? []);
}

export async function POST(request: Request) {
  if (!canUseSupabase()) {
    return fail("Supabase is not configured for markets", 503);
  }

  const user = await getCurrentUser();
  const sessionSupabase = await createSupabaseServerClient();

  if (!user) return fail("Unauthorized", 401);
  if (!(await isAdminUser(user))) return fail("Admin access required", 403);

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description =
    typeof body?.description === "string" && body.description.trim()
      ? body.description.trim()
      : null;
  const category =
    typeof body?.category === "string" && body.category.trim()
      ? body.category.trim()
      : "General";
  const closeDate =
    typeof body?.close_date === "string" && body.close_date.trim()
      ? body.close_date.trim()
      : typeof body?.closes_at === "string" && body.closes_at.trim()
        ? body.closes_at.trim()
        : null;

  if (!title) {
    return fail("title is required", 400);
  }

  if (closeDate && Number.isNaN(new Date(closeDate).getTime())) {
    return fail("close_date is invalid", 400);
  }

  const supabase = createSupabaseAdminClient() ?? sessionSupabase;
  const marketId = crypto.randomUUID();
  const { data, error } = await supabase
    .from("markets")
    .insert({
      id: marketId,
      title,
      description,
      category: category || "General",
      close_date: closeDate,
      closes_at: closeDate,
      slug: createMarketSlug(title, marketId)
    })
    .select()
    .single();

  if (error) return fail(error.message, 500);

  return ok(data, 201);
}
