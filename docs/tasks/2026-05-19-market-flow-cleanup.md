# Task: Market Flow Persistence + Auth Email Limit Check + Code Cleanup

## Scope
Work only on the market creation/request/approval flow, auth signup email behavior, cleanup, and future SEO/GEO readiness.

Do NOT review the whole project context.
Do NOT redesign unrelated UI.
Do NOT add large new features.
Do NOT reply step-by-step after every change.

Run the task until completed, test it, then summarize only:
1. What changed
2. Files changed
3. How to test
4. Any remaining risk

## Current Problem

### 1. Market request flow may not persist correctly
The market creation/request flow seems partially implemented, but markets may disappear after running for a while.

Please verify:
- submit market writes to Supabase table, not local state/mock data
- pending market requests persist after refresh/restart
- approve action reads from Supabase
- approve action creates/publishes a real market row
- reject action stores status/reason correctly if available
- production must not use local fallback for request/approve

Check these tables if they exist:
- market_requests
- markets
- market_stats view if used

If schema is missing or incorrect, provide SQL migration separately in a clear block.

Expected statuses:
- pending
- approved
- rejected

## Required Behavior

### Submit Request
When a user submits a market:
- insert into `market_requests`
- status = `pending`
- include user id if authenticated
- include created_at
- return success/failure clearly

### Admin Approve
When admin approves:
- read the request from `market_requests`
- create row in `markets`
- update request status to `approved`
- do not duplicate if already approved
- handle errors safely

### Admin Reject
When admin rejects:
- update request status to `rejected`
- store reject reason if column exists
- do not delete the original request

## 2. Signup email limit issue

Yesterday signup showed something like:
“email limit succeeded” / signup blocked by email limit.

Investigate whether this comes from:
- Supabase Auth email confirmation rate limit
- app-side error handling
- wrong environment variable
- repeated signup attempts
- redirect/callback issue
- SMTP not configured in Supabase

Improve error handling so the UI shows a useful message.

Do not bypass Supabase security.
Do not hardcode service role key in client code.
Do not expose private env variables.

Check:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY only server-side
- auth callback route if used
- signup function error message mapping

Expected result:
- user sees clear error
- console/server logs are useful
- no secret keys exposed

## 3. Clean Code

Refactor only where needed.

Goals:
- remove dead demo/local fallback code from production paths
- separate Supabase server/client helpers if currently mixed
- keep API route logic readable
- avoid duplicated Supabase client creation
- improve error messages
- keep types simple but explicit

Suggested structure if compatible:

/lib/supabase/client.ts
/lib/supabase/server.ts
/lib/markets/requests.ts
/lib/markets/approve.ts
/app/api/market-requests/route.ts
/app/api/market-requests/[id]/approve/route.ts
/app/api/market-requests/[id]/reject/route.ts

Do not over-engineer.

## 4. SEO / GEO Readiness Planning

Do not fully implement advanced SEO yet unless very small.

Prepare code so later we can add:
- dynamic metadata per market page
- Open Graph image/title/description
- sitemap
- robots.txt
- structured data
- clean market slugs
- GEO/LLM-readable content sections

If easy, add basic metadata only:
- app title
- description
- canonical-friendly structure

Do not spend too much time here. Main priority is data persistence and auth issue.

Important working style:
After I give you a task, do not reply after every tiny step.
Analyze, implement, test/check, fix issues, and only respond once when the task is complete.
Only stop early if you need missing credentials, destructive confirmation, or critical clarification.

## Test Checklist

After changes, run:

```bash
npm run lint
npm run build