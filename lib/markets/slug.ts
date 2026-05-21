export function createMarketSlug(title: string, id?: string | null) {
  const base = title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

  const suffix = id ? id.replace(/-/g, "").slice(0, 8) : "";
  return [base || "market", suffix].filter(Boolean).join("-");
}
