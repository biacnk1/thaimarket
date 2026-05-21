import { ok } from "@/lib/api/responses";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/server";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return ok({
      authenticated: false,
      user: null,
      profile: null
    });
  }

  const profile = await getCurrentProfile();

  return ok({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email ?? null
    },
    profile
  });
}
