"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { hasSupabaseConfig } from "@/lib/env";
import {
  createLocalAuthUser,
  findLocalAuthUserByLoginIdentifier,
  getLocalProfileByUserId,
  localUsernameExists,
  updateLocalProfile
} from "@/lib/dev/local-store";
import { localAuthCookieName } from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const idleState: AuthActionState = {
  status: "idle",
  message: ""
};

const reservedUsernames = new Set([
  "admin",
  "api",
  "help",
  "login",
  "market",
  "markets",
  "mod",
  "moderator",
  "profile",
  "register",
  "root",
  "settings",
  "staff",
  "support",
  "system",
  "thaimarket"
]);

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readRedirectPath(formData: FormData, fallback: string) {
  const value = readText(formData, "redirectTo");

  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

function normalizeUsername(value: string) {
  const username = value.trim().toLowerCase();

  if (!username) return null;
  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    throw new Error("Username must be 3-24 characters using letters, numbers, or underscores.");
  }

  return username;
}

function isReservedUsername(username: string | null) {
  return Boolean(username && reservedUsernames.has(username));
}

function normalizeOptionalUrl(value: string) {
  if (!value) return null;

  try {
    return new URL(value).toString();
  } catch {
    throw new Error("Avatar URL must be a valid URL.");
  }
}

function errorState(message: string): AuthActionState {
  return {
    status: "error",
    message
  };
}

function successState(message: string): AuthActionState {
  return {
    status: "success",
    message
  };
}

function logSupabaseAuthError(action: string, error: unknown) {
  if (error instanceof Error) {
    console.error(`${action}:`, {
      name: error.name,
      message: error.message
    });
    return;
  }

  console.error(`${action}:`, error);
}

function mapSignUpErrorMessage(error: Error) {
  const message = error.message.toLowerCase();

  if (
    message.includes("rate limit") ||
    message.includes("security purposes") ||
    message.includes("over_email_send_rate_limit")
  ) {
    return "Signup email is temporarily rate limited. Wait a few minutes before trying again. If this keeps happening, configure SMTP in Supabase Auth.";
  }

  if (message.includes("already registered") || message.includes("already exists")) {
    return "Email is already registered. Log in instead.";
  }

  if (message.includes("invalid email")) {
    return "Enter a valid email address.";
  }

  if (message.includes("weak password") || message.includes("password")) {
    return error.message;
  }

  if (message.includes("could not reach")) {
    return error.message;
  }

  return "Could not create account. Check your signup details and try again.";
}

async function setLocalAuthSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(localAuthCookieName, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

async function clearLocalAuthSession() {
  const cookieStore = await cookies();
  cookieStore.delete(localAuthCookieName);
}

async function usernameExists(username: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("Could not check username:", error.message);
  }

  return Boolean(data);
}

async function resolveSupabaseLoginEmail(identifier: string) {
  const normalized = identifier.trim().toLowerCase();

  if (normalized.includes("@")) {
    return normalized;
  }

  let username: string | null = null;

  try {
    username = normalizeUsername(normalized);
  } catch {
    return null;
  }

  const admin = createSupabaseAdminClient();

  if (!admin) {
    throw new Error("Username login requires SUPABASE_SERVICE_ROLE_KEY. Use email login until the server key is configured.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle<{ id: string }>();

  if (profileError && profileError.code !== "PGRST116") {
    console.error("Could not resolve username login:", profileError.message);
    throw new Error("Could not verify that username. Try again.");
  }

  if (!profile) {
    return null;
  }

  const { data, error } = await admin.auth.admin.getUserById(profile.id);

  if (error) {
    console.error("Could not resolve auth user for username login:", error.message);
    throw new Error("Could not verify that username. Try again.");
  }

  return data.user?.email?.toLowerCase() ?? null;
}

export async function signIn(_previousState: AuthActionState = idleState, formData: FormData) {
  void _previousState;

  const login = (readText(formData, "login") || readText(formData, "email")).toLowerCase();
  const password = readText(formData, "password");
  const redirectTo = readRedirectPath(formData, "/profile");

  if (!login || !password) {
    return errorState("Enter your username and password.");
  }

  if (!hasSupabaseConfig()) {
    const user = await findLocalAuthUserByLoginIdentifier(login, password);

    if (!user) {
      return errorState("Username or password is incorrect.");
    }

    await setLocalAuthSession(user.id);
    revalidatePath("/", "layout");
    redirect(redirectTo);
  }

  let email: string | null = null;

  try {
    email = await resolveSupabaseLoginEmail(login);
  } catch (error) {
    return errorState(error instanceof Error ? error.message : "Could not verify that username. Try again.");
  }

  if (!email) {
    return errorState("Username or password is incorrect.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  }).catch((error: unknown) => {
    console.error("Supabase sign in failed:", error);
    return {
      error: new Error("Could not reach Supabase Auth. Check network access and Supabase env.")
    };
  });

  if (error) {
    return errorState(error.message.includes("Could not reach") ? error.message : "Username or password is incorrect.");
  }

  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function signUp(_previousState: AuthActionState = idleState, formData: FormData) {
  void _previousState;

  const email = readText(formData, "email").toLowerCase();
  const password = readText(formData, "password");
  const displayName = readText(formData, "display_name");
  const redirectTo = readRedirectPath(formData, "/profile");
  let username: string | null = null;

  try {
    username = normalizeUsername(readText(formData, "username"));
  } catch (error) {
    return errorState(error instanceof Error ? error.message : "Username is invalid.");
  }

  if (!email || !password) {
    return errorState("Enter an email and password.");
  }

  if (password.length < 6) {
    return errorState("Password must be at least 6 characters.");
  }

  if (displayName.length > 60) {
    return errorState("Display name must be 60 characters or fewer.");
  }

  if (isReservedUsername(username)) {
    return errorState("Username is reserved.");
  }

  if (username && (hasSupabaseConfig() ? await usernameExists(username) : await localUsernameExists(username))) {
    return errorState("Username is already taken.");
  }

  if (!hasSupabaseConfig()) {
    const result = await createLocalAuthUser({
      email,
      password,
      username,
      display_name: displayName || email.split("@")[0]
    });

    if (!result.user) {
      return errorState(result.error);
    }

    await setLocalAuthSession(result.user.id);
    revalidatePath("/", "layout");
    redirect(redirectTo);
  }

  const admin = createSupabaseAdminClient();

  if (!admin) {
    return errorState("Signup requires SUPABASE_SERVICE_ROLE_KEY so accounts can be confirmed immediately.");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      username,
      display_name: displayName || email.split("@")[0]
    }
  }).catch((error: unknown) => {
    logSupabaseAuthError("Supabase admin sign up request failed", error);
    return {
      data: {
        user: null
      },
      error: new Error("Could not reach Supabase Auth. Check network access and Supabase env.")
    };
  });

  if (error) {
    logSupabaseAuthError("Supabase sign up failed", error);
    return errorState(mapSignUpErrorMessage(error));
  }

  if (!data.user) {
    return errorState("Could not create account.");
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: data.user.id,
      username,
      display_name: displayName || email.split("@")[0],
      points_balance: 1000
    },
    { onConflict: "id" }
  );

  if (profileError) {
    return errorState(profileError.code === "23505" ? "Username is already taken." : profileError.message);
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (signInError) {
    return errorState("Account created, but automatic login failed. Try logging in.");
  }

  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function signOut() {
  if (hasSupabaseConfig()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } else {
    await clearLocalAuthSession();
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function updateProfile(_previousState: AuthActionState = idleState, formData: FormData) {
  void _previousState;
  const supabase = hasSupabaseConfig() ? await createSupabaseServerClient() : null;
  const user = supabase
    ? (await supabase.auth.getUser()).data.user
    : await (async () => {
        const cookieStore = await cookies();
        const localUserId = cookieStore.get(localAuthCookieName)?.value;
        return localUserId ? { id: localUserId, email: null } : null;
      })();

  if (!user) redirect("/login?next=/settings/profile");

  const displayName = readText(formData, "display_name");
  const bio = readText(formData, "bio");
  let avatarUrl: string | null = null;

  try {
    avatarUrl = normalizeOptionalUrl(readText(formData, "avatar_url"));
  } catch (error) {
    return errorState(error instanceof Error ? error.message : "Profile details are invalid.");
  }

  if (displayName.length > 60) {
    return errorState("Display name must be 60 characters or fewer.");
  }

  if (bio.length > 280) {
    return errorState("Bio must be 280 characters or fewer.");
  }

  if (!supabase) {
    const currentProfile = await getLocalProfileByUserId(user.id);

    try {
      await updateLocalProfile({
        id: user.id,
        username: currentProfile?.username ?? null,
        display_name: displayName || "ThaiMarket user",
        avatar_url: avatarUrl,
        bio: bio || null
      });
    } catch (error) {
      return errorState(error instanceof Error ? error.message : "Could not update profile.");
    }

    revalidatePath("/profile");
    revalidatePath("/settings/profile");
    revalidatePath("/", "layout");

    return successState("Profile updated.");
  }

  const { data: currentProfile, error: currentProfileError } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle<{ username: string | null }>();

  if (currentProfileError && currentProfileError.code !== "PGRST116") {
    return errorState(currentProfileError.message);
  }

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      username: currentProfile?.username ?? null,
      display_name: displayName || user.email?.split("@")[0] || "ThaiMarket user",
      avatar_url: avatarUrl,
      bio: bio || null,
      updated_at: new Date().toISOString()
    },
    { onConflict: "id" }
  );

  if (error) {
    return errorState(error.code === "23505" ? "Username is already taken." : error.message);
  }

  revalidatePath("/profile");
  revalidatePath("/settings/profile");
  revalidatePath("/", "layout");

  return successState("Profile updated.");
}
