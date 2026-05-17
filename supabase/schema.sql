-- ThaiMarket MVP schema
-- Run this in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.markets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'General',
  status text not null default 'open' check (status in ('open', 'closed', 'resolved')),
  result text check (result in ('yes', 'no') or result is null),
  closes_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  side text not null check (side in ('yes', 'no')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (market_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) <= 500),
  created_at timestamptz not null default now()
);

create table if not exists public.market_requests (
  id uuid primary key default gen_random_uuid(),
  question text not null check (char_length(question) between 12 and 180),
  description text,
  category text not null check (category in ('Thailand', 'Politics', 'Crypto', 'AI', 'Economy')),
  closes_at timestamptz not null,
  requester_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop view if exists public.market_stats;

create view public.market_stats as
select
  m.id,
  m.title,
  m.description,
  m.category,
  m.status,
  m.result,
  m.closes_at,
  m.created_at,
  count(v.id)::int as total_votes,
  count(v.id) filter (where v.side = 'yes')::int as yes_count,
  count(v.id) filter (where v.side = 'no')::int as no_count,
  case
    when count(v.id) = 0 then 0
    else round(
      count(v.id) filter (where v.side = 'yes')::numeric
      / count(v.id)::numeric
      * 100
    )::int
  end as yes_percentage
from public.markets m
left join public.votes v on v.market_id = m.id
group by m.id;

alter table public.markets enable row level security;
alter table public.votes enable row level security;
alter table public.comments enable row level security;
alter table public.market_requests enable row level security;

drop policy if exists "Markets are publicly readable" on public.markets;
create policy "Markets are publicly readable"
on public.markets
for select
using (true);

drop policy if exists "MVP admins can create approved markets" on public.markets;
create policy "MVP admins can create approved markets"
on public.markets
for insert
with check (true);

drop policy if exists "Votes are publicly readable" on public.votes;
create policy "Votes are publicly readable"
on public.votes
for select
using (true);

drop policy if exists "Users can insert their own votes" on public.votes;
create policy "Users can insert their own votes"
on public.votes
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own votes" on public.votes;
create policy "Users can update their own votes"
on public.votes
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Comments are publicly readable" on public.comments;
create policy "Comments are publicly readable"
on public.comments
for select
using (true);

drop policy if exists "Users can insert their own comments" on public.comments;
create policy "Users can insert their own comments"
on public.comments
for insert
with check (auth.uid() = user_id);

drop policy if exists "Anyone can submit market requests" on public.market_requests;
create policy "Anyone can submit market requests"
on public.market_requests
for insert
with check (status = 'pending');

drop policy if exists "Requesters can read their own market requests" on public.market_requests;
create policy "Requesters can read their own market requests"
on public.market_requests
for select
using (requester_user_id = auth.uid());

drop policy if exists "MVP admins can read all market requests" on public.market_requests;
create policy "MVP admins can read all market requests"
on public.market_requests
for select
using (true);

drop policy if exists "Admins can read market requests" on public.market_requests;
create policy "Admins can read market requests"
on public.market_requests
for select
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can update market requests" on public.market_requests;
create policy "Admins can update market requests"
on public.market_requests
for update
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "MVP admins can approve market requests" on public.market_requests;
create policy "MVP admins can approve market requests"
on public.market_requests
for update
using (true)
with check (true);

-- MVP seed data
insert into public.markets (title, description, category, closes_at)
values
  (
    'Bitcoin จะทะลุ $150,000 ก่อนสิ้นปี 2026 หรือไม่?',
    'ตลาดนี้วัด sentiment ของคนต่อรอบใหญ่ของ Bitcoin หลัง ETF, macro liquidity และ institutional demand.',
    'Crypto',
    '2026-12-31T00:00:00Z'
  ),
  (
    'ไทยจะมี casino ถูกกฎหมายก่อนปี 2028 หรือไม่?',
    'อิงจากทิศทางนโยบายรัฐ การท่องเที่ยว รายได้ภาษี และแรงต้านทางสังคมในประเทศไทย.',
    'Thailand',
    '2028-01-01T00:00:00Z'
  ),
  (
    'OpenAI จะปล่อย GPT-6 ภายในปีนี้หรือไม่?',
    'ตลาดนี้วัดความคาดหวังต่อ AI frontier model รุ่นถัดไป ทั้งจากข่าว release cycle และการแข่งขันในตลาด AI.',
    'AI',
    '2026-12-31T00:00:00Z'
  )
on conflict do nothing;
