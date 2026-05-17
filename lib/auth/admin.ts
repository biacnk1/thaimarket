type AdminCandidate = {
  email?: string | null;
  app_metadata?: Record<string, unknown>;
} | null;

export function isAdminUser(user: AdminCandidate) {
  if (!user) return false;

  const role = user.app_metadata?.role;
  if (role === "admin") return true;

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return Boolean(user.email && adminEmails.includes(user.email.toLowerCase()));
}
