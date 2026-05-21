# ThaiMarket MVP

Web-based public prediction board prototype for Thai events.

This project is intentionally lightweight:

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Postgres/Auth
- Vercel deploy-ready
- No wallet
- No real money
- No order book
- No blockchain

## What is included

```txt
app/page.tsx                                      Public prediction board
app/admin/requests/page.tsx                      Admin review queue
app/api/market-requests/route.ts                 Submit/list market requests
app/api/admin/market-requests/[id]/approve       Approve request into market
app/api/markets/route.ts                         Market feed
app/api/markets/[id]/route.ts                    Market detail
app/api/votes/route.ts                           Vote endpoint
app/api/comments/route.ts                        Comments endpoint
lib/supabase/server.ts                           Server Supabase client
supabase/schema.sql                              Tables, view, RLS policies, seed data
.env.example                                     Environment variables
```

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Local-first dev mode

By default the app now boots in local mode:

```env
APP_DATA_MODE=local
NEXT_PUBLIC_APP_DATA_MODE=local
```

What local mode does:

- Saves market requests, approvals, votes, and comments to `.data/thaimarket-local.json`
- Keeps the full board flow usable without Supabase
- Persists local dev data across Next.js reloads

## Supabase setup

1. Create a Supabase project.
2. Open SQL Editor.
3. Run the full schema:

```txt
supabase/schema.sql
```

4. Switch `.env.local` to Supabase mode and copy project values:

```env
APP_DATA_MODE=supabase
NEXT_PUBLIC_APP_DATA_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Optional for admin-only server actions:

```env
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_EMAILS=
```

The MVP currently allows public market-request review/approval so testers can play without auth. Before production, replace the MVP policies in `supabase/schema.sql` with admin-only policies and wire Supabase Auth.

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "initial thaimarket mvp"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Import in Vercel

1. Open Vercel.
2. Import GitHub repo.
3. Add env vars:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy.

### 3. Tester links

Give testers:

```txt
https://<your-vercel-project>.vercel.app/
```

Admin review queue:

```txt
https://<your-vercel-project>.vercel.app/admin/requests
```

### Important deploy note

Local fallback data only exists inside the dev server process. On Vercel, testers need the Supabase schema and env vars above so requests, approvals, and markets persist across users.

## API routes

### GET `/api/markets`

Returns all markets with computed sentiment.

### GET `/api/markets/[id]`

Returns one market. If user is logged in, also returns `user_vote`.

### POST `/api/votes`

Requires authenticated user.

```json
{
  "market_id": "uuid",
  "side": "yes"
}
```

### GET `/api/comments?market_id=uuid`

Returns comments for a market.

### POST `/api/comments`

Requires authenticated user.

```json
{
  "market_id": "uuid",
  "body": "My opinion..."
}
```

### POST `/api/market-requests`

Creates a pending market request.

```json
{
  "question": "Will Thailand pass 40M visitors in 2026?",
  "description": "Resolve from official tourism reports.",
  "category": "Thailand",
  "closes_at": "2026-12-31T00:00:00.000Z"
}
```

### GET `/api/market-requests`

Returns market requests for admin review.

### POST `/api/admin/market-requests/[id]/approve`

Approves a request and creates a public market.

## Next step

Recommended next implementation order:

1. Add real Supabase Auth login page
2. Lock `/admin/requests` and approval API to admin users
3. Add comments UI
4. Add email/Slack notification when a request is approved
5. Replace MVP public admin policies with role-based policies


## Troubleshooting

### Cannot find module 'autoprefixer'

Run:

```bash
npm install
```

If the error remains:

```bash
npm install -D autoprefixer
```

This project uses Tailwind CSS through PostCSS, so `autoprefixer` is required as a dev dependency.
