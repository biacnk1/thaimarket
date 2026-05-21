export type AppDataMode = "local" | "supabase";

function readMode(value: string | undefined): AppDataMode {
  return value?.trim().toLowerCase() === "supabase" ? "supabase" : "local";
}

export function getAppDataMode(): AppDataMode {
  return readMode(process.env.APP_DATA_MODE ?? process.env.NEXT_PUBLIC_APP_DATA_MODE);
}

export function isLocalMode() {
  return getAppDataMode() === "local";
}

export function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function canUseSupabase() {
  return getAppDataMode() === "supabase" && hasSupabaseConfig();
}

export function getSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase env is incomplete. Set APP_DATA_MODE=local for local-first dev or provide Supabase keys."
    );
  }

  return {
    url,
    anonKey
  };
}

export function hasSupabaseServerConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function getSupabaseServerEnv() {
  const { url, anonKey } = getSupabasePublicEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for server-side Supabase operations.");
  }

  return {
    url,
    anonKey,
    serviceRoleKey
  };
}
