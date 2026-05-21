import { fail, ok } from "@/lib/api/responses";
import { isAdminUser } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/server";
import { rejectLocalMarketRequest } from "@/lib/dev/local-store";
import { canUseSupabase, isLocalMode } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function readAdminNote(body: unknown) {
  if (!body || typeof body !== "object") return null;

  const value = (body as Record<string, unknown>).reason;
  if (typeof value !== "string") return null;

  const note = value.trim();
  return note ? note.slice(0, 500) : null;
}

function isMissingAdminNoteColumn(errorMessage: string) {
  const message = errorMessage.toLowerCase();
  return message.includes("admin_note") && message.includes("column");
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const adminNote = readAdminNote(body);

  if (isLocalMode()) {
    const localRequest = await rejectLocalMarketRequest(id, adminNote);

    if (!localRequest) {
      return fail("Market request not found or already approved", 404);
    }

    return ok(localRequest);
  }

  if (!canUseSupabase()) {
    return fail("Supabase is not configured for market rejection", 503);
  }

  const currentUser = await getCurrentUser();

  if (!currentUser || !(await isAdminUser(currentUser))) {
    return fail("Admin access required", 403);
  }

  try {
    const supabase = createSupabaseAdminClient() ?? (await createSupabaseServerClient());
    const { data: marketRequest, error: requestError } = await supabase
      .from("market_requests")
      .select("id, status")
      .eq("id", id)
      .single();

    if (requestError || !marketRequest) {
      return fail(requestError?.message ?? "Market request not found", 404);
    }

    if (marketRequest.status === "approved") {
      return fail("Approved market requests cannot be rejected", 409);
    }

    const reviewedAt = new Date().toISOString();
    const updatePayload = {
      status: "rejected",
      reviewed_by: currentUser.id,
      reviewed_at: reviewedAt,
      updated_at: reviewedAt,
      admin_note: adminNote
    };

    let result = await supabase
      .from("market_requests")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (result.error && isMissingAdminNoteColumn(result.error.message)) {
      const { admin_note: _adminNote, ...payloadWithoutNote } = updatePayload;
      void _adminNote;
      result = await supabase
        .from("market_requests")
        .update(payloadWithoutNote)
        .eq("id", id)
        .select()
        .single();
    }

    if (result.error) {
      return fail(result.error.message, 500);
    }

    return ok(result.data);
  } catch (error) {
    console.error("Reject request failed:", error);
    return fail(error instanceof Error ? error.message : "Could not reject request", 500);
  }
}
