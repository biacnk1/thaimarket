import { fail } from "@/lib/api/responses";

export async function POST() {
  return fail("Votes have been replaced by point-backed predictions. Use /api/predictions.", 410);
}
