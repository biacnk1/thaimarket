import { fail, ok } from "@/lib/api/responses";
import { getCurrentUser } from "@/lib/auth/server";
import { addLocalComment, getLocalComments, getLocalProfilesByUserIds } from "@/lib/dev/local-store";
import { canUseSupabase, isLocalMode } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CommentRow = {
  id: string;
  body: string;
  user_id: string;
  created_at: string;
};

type CommentProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

function sortComments<T extends { body: string; created_at: string }>(comments: T[], sort: string | null) {
  if (sort === "top") {
    return [...comments].sort((left, right) => {
      const bodyDelta = right.body.length - left.body.length;
      if (bodyDelta !== 0) return bodyDelta;
      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    });
  }

  return [...comments].sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );
}

function attachAuthors(comments: CommentRow[], profiles: CommentProfile[]) {
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

  return comments.map((comment) => {
    const profile = profilesById.get(comment.user_id);

    return {
      ...comment,
      author: profile
        ? {
            username: profile.username,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url
          }
        : null
    };
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const marketId = searchParams.get("market_id");
  const sort = searchParams.get("sort");

  if (!marketId) return fail("market_id is required", 400);

  if (isLocalMode() || !canUseSupabase()) {
    const comments = sortComments(await getLocalComments(marketId), sort);
    const profiles = await getLocalProfilesByUserIds(comments.map((comment) => comment.user_id));

    return ok(attachAuthors(comments, profiles));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("comments")
    .select("id, body, user_id, created_at")
    .eq("market_id", marketId)
    .order("created_at", { ascending: false });

  if (error) return fail(error.message, 500);

  const comments = sortComments((data ?? []) as CommentRow[], sort);
  const userIds = [...new Set(comments.map((comment) => comment.user_id))];
  const { data: profiles, error: profileError } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", userIds)
    : { data: [], error: null };

  if (profileError) {
    console.error("Could not load comment authors:", profileError.message);
  }

  return ok(attachAuthors(comments, (profiles ?? []) as CommentProfile[]));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const marketId = typeof body?.market_id === "string" ? body.market_id : "";
  const commentBody = typeof body?.body === "string" ? body.body : "";

  if (!marketId || !commentBody || commentBody.length > 500) {
    return fail("Invalid comment", 400);
  }

  const user = await getCurrentUser();

  if (!user) {
    return fail("Unauthorized", 401);
  }

  if (isLocalMode() || !canUseSupabase()) {
    const comment = await addLocalComment({
      marketId,
      userId: user.id,
      body: commentBody
    });

    if (!comment) return fail("Market not found", 404);

    const profiles = await getLocalProfilesByUserIds([user.id]);
    return ok(attachAuthors([comment], profiles)[0], 201);
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("comments")
    .insert({
      market_id: marketId,
      user_id: user.id,
      body: commentBody
    })
    .select()
    .single();

  if (error) return fail(error.message, 500);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError && profileError.code !== "PGRST116") {
    console.error("Could not load comment author:", profileError.message);
  }

  return ok(attachAuthors([data as CommentRow], profile ? [profile as CommentProfile] : [])[0], 201);
}
