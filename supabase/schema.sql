-- ThaiMarket MVP schema
-- Run this in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  bio text,
  reputation integer not null default 0,
  points_balance integer not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists points_balance integer;

update public.profiles
set points_balance = 1000
where points_balance is null;

alter table public.profiles
  alter column points_balance set default 1000,
  alter column points_balance set not null;

create table if not exists public.admin_users (
  username text primary key check (username ~ '^[a-z0-9_]{3,24}$'),
  created_at timestamptz not null default now()
);

insert into public.admin_users (username)
values ('test123')
on conflict (username) do nothing;

create table if not exists public.markets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'General',
  status text not null default 'open' check (status in ('open', 'closed', 'resolved')),
  result text check (result in ('yes', 'no') or result is null),
  resolved_outcome text check (resolved_outcome in ('YES', 'NO') or resolved_outcome is null),
  resolved_at timestamptz,
  close_date timestamptz,
  slug text,
  closes_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.markets
  add column if not exists status text not null default 'open',
  add column if not exists result text,
  add column if not exists resolved_outcome text,
  add column if not exists resolved_at timestamptz,
  add column if not exists close_date timestamptz,
  add column if not exists slug text,
  add column if not exists closes_at timestamptz;

update public.markets
set close_date = coalesce(close_date, closes_at)
where close_date is null and closes_at is not null;

create or replace function public.slugify_market_title(value text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(value, 'market')), '[^a-z0-9]+', '-', 'g'))
$$;

update public.markets
set slug = concat(
  coalesce(nullif(public.slugify_market_title(title), ''), 'market'),
  '-',
  replace(id::text, '-', '')::text
)
where slug is null or slug = '';

alter table public.markets
  alter column slug set not null;

create unique index if not exists markets_slug_key on public.markets (slug);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'markets_status_core_loop_check'
  ) then
    alter table public.markets
      add constraint markets_status_core_loop_check
      check (status in ('open', 'closed', 'resolved'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'markets_resolved_outcome_check'
  ) then
    alter table public.markets
      add constraint markets_resolved_outcome_check
      check (resolved_outcome in ('YES', 'NO') or resolved_outcome is null);
  end if;
end;
$$;

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

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  market_id uuid not null references public.markets(id) on delete cascade,
  side text not null check (side in ('YES', 'NO')),
  amount integer not null check (amount > 0),
  result_status text not null default 'pending' check (result_status in ('pending', 'won', 'lost')),
  payout_amount integer not null default 0 check (payout_amount >= 0),
  created_at timestamptz not null default now()
);

create index if not exists predictions_user_created_at_idx
on public.predictions (user_id, created_at desc);

create index if not exists predictions_market_created_at_idx
on public.predictions (market_id, created_at desc);

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
with prediction_rollup as (
  select
    p.market_id,
    count(p.id)::int as total_predictions,
    coalesce(sum(p.amount), 0)::int as total_volume,
    count(p.id) filter (where p.side = 'YES')::int as yes_count,
    count(p.id) filter (where p.side = 'NO')::int as no_count,
    coalesce(sum(p.amount) filter (where p.side = 'YES'), 0)::int as yes_amount,
    coalesce(sum(p.amount) filter (where p.side = 'NO'), 0)::int as no_amount
  from public.predictions p
  group by p.market_id
)
select
  m.id,
  m.title,
  m.description,
  m.category,
  m.status,
  m.result,
  m.resolved_outcome,
  m.resolved_at,
  coalesce(m.close_date, m.closes_at) as close_date,
  coalesce(m.close_date, m.closes_at) as closes_at,
  m.slug,
  m.created_at,
  coalesce(pr.total_predictions, 0)::int as total_predictions,
  coalesce(pr.total_volume, 0)::int as total_volume,
  coalesce(pr.total_predictions, 0)::int as total_votes,
  coalesce(pr.yes_count, 0)::int as yes_count,
  coalesce(pr.no_count, 0)::int as no_count,
  coalesce(pr.yes_amount, 0)::int as yes_amount,
  coalesce(pr.no_amount, 0)::int as no_amount,
  case
    when coalesce(pr.total_volume, 0) = 0 then 0
    else round(
      coalesce(pr.yes_amount, 0)::numeric
      / pr.total_volume::numeric
      * 100
    )::int
  end as yes_percentage
from public.markets m
left join prediction_rollup pr on pr.market_id = m.id;

grant select on public.market_stats to anon, authenticated;

alter table public.markets enable row level security;
alter table public.votes enable row level security;
alter table public.comments enable row level security;
alter table public.predictions enable row level security;
alter table public.market_requests enable row level security;
alter table public.profiles enable row level security;
alter table public.admin_users enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_market_requests_updated_at on public.market_requests;
create trigger set_market_requests_updated_at
before update on public.market_requests
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'username', ''),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      split_part(new.email, '@', 1)
    ),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row
execute function public.handle_new_user_profile();

create or replace function public.is_admin_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
    or exists (
      select 1
      from public.profiles profile
      inner join public.admin_users admin_user
        on admin_user.username = profile.username
      where profile.id = p_user_id
    )
$$;

grant execute on function public.is_admin_user(uuid) to anon, authenticated, service_role;
grant select on public.admin_users to authenticated, service_role;

drop policy if exists "Admins can read admin users" on public.admin_users;
create policy "Admins can read admin users"
on public.admin_users
for select
using (public.is_admin_user(auth.uid()));

drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
on public.profiles
for select
using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Markets are publicly readable" on public.markets;
create policy "Markets are publicly readable"
on public.markets
for select
using (true);

drop policy if exists "MVP admins can create approved markets" on public.markets;
drop policy if exists "Admins can create approved markets" on public.markets;
create policy "Admins can create approved markets"
on public.markets
for insert
with check (public.is_admin_user(auth.uid()));

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

drop policy if exists "Users can read their own predictions" on public.predictions;
create policy "Users can read their own predictions"
on public.predictions
for select
using (auth.uid() = user_id);

drop policy if exists "Admins can read all predictions" on public.predictions;
create policy "Admins can read all predictions"
on public.predictions
for select
using (public.is_admin_user(auth.uid()));

drop policy if exists "Anyone can submit market requests" on public.market_requests;
drop policy if exists "Authenticated users can submit market requests" on public.market_requests;
create policy "Authenticated users can submit market requests"
on public.market_requests
for insert
with check (auth.uid() = requester_user_id and status = 'pending');

drop policy if exists "Requesters can read their own market requests" on public.market_requests;
create policy "Requesters can read their own market requests"
on public.market_requests
for select
using (requester_user_id = auth.uid());

drop policy if exists "MVP admins can read all market requests" on public.market_requests;

drop policy if exists "Admins can read market requests" on public.market_requests;
create policy "Admins can read market requests"
on public.market_requests
for select
using (public.is_admin_user(auth.uid()));

drop policy if exists "Admins can update market requests" on public.market_requests;
create policy "Admins can update market requests"
on public.market_requests
for update
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

drop policy if exists "MVP admins can approve market requests" on public.market_requests;

create or replace function public.market_stats_snapshot(p_market_id uuid)
returns jsonb
language sql
stable
as $$
  select to_jsonb(ms)
  from public.market_stats ms
  where ms.id = p_market_id
$$;

create or replace function public.place_prediction(
  p_market_id uuid,
  p_side text,
  p_amount integer,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market public.markets%rowtype;
  v_balance integer;
  v_prediction public.predictions%rowtype;
begin
  if p_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_side not in ('YES', 'NO') then
    raise exception 'Choose YES or NO';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than 0';
  end if;

  select *
  into v_market
  from public.markets
  where id = p_market_id
  for update;

  if not found then
    raise exception 'Market not found';
  end if;

  if v_market.status <> 'open' then
    raise exception 'Market is not open';
  end if;

  if coalesce(v_market.close_date, v_market.closes_at) is not null
    and coalesce(v_market.close_date, v_market.closes_at) <= now() then
    raise exception 'Market close date has passed';
  end if;

  insert into public.profiles as profile (id, points_balance)
  values (p_user_id, 1000)
  on conflict (id) do update
  set points_balance = coalesce(profile.points_balance, 1000);

  update public.profiles
  set
    points_balance = points_balance - p_amount,
    updated_at = now()
  where id = p_user_id
    and points_balance >= p_amount
  returning points_balance into v_balance;

  if not found then
    raise exception 'Insufficient points';
  end if;

  insert into public.predictions (user_id, market_id, side, amount)
  values (p_user_id, p_market_id, p_side, p_amount)
  returning * into v_prediction;

  return jsonb_build_object(
    'prediction', to_jsonb(v_prediction),
    'balance', v_balance,
    'market', public.market_stats_snapshot(p_market_id)
  );
end;
$$;

create or replace function public.resolve_market(
  p_market_id uuid,
  p_outcome text,
  p_admin_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market public.markets%rowtype;
  v_winner_count integer;
  v_loser_count integer;
  v_payout_total integer;
begin
  if p_admin_id is null then
    raise exception 'Admin access required';
  end if;

  if p_outcome not in ('YES', 'NO') then
    raise exception 'Choose YES or NO';
  end if;

  select *
  into v_market
  from public.markets
  where id = p_market_id
  for update;

  if not found then
    raise exception 'Market not found';
  end if;

  if v_market.status = 'resolved' then
    raise exception 'Market is already resolved';
  end if;

  update public.markets
  set
    status = 'resolved',
    resolved_outcome = p_outcome,
    resolved_at = now(),
    result = lower(p_outcome)
  where id = p_market_id
  returning * into v_market;

  update public.predictions
  set
    result_status = case when side = p_outcome then 'won' else 'lost' end,
    payout_amount = case when side = p_outcome then amount * 2 else 0 end
  where market_id = p_market_id
    and result_status = 'pending';

  with winner_payouts as (
    select
      user_id,
      sum(payout_amount)::int as payout
    from public.predictions
    where market_id = p_market_id
      and result_status = 'won'
    group by user_id
  )
  update public.profiles profile
  set
    points_balance = profile.points_balance + winner_payouts.payout,
    updated_at = now()
  from winner_payouts
  where profile.id = winner_payouts.user_id;

  select
    count(*) filter (where result_status = 'won')::int,
    count(*) filter (where result_status = 'lost')::int,
    coalesce(sum(payout_amount), 0)::int
  into v_winner_count, v_loser_count, v_payout_total
  from public.predictions
  where market_id = p_market_id;

  return jsonb_build_object(
    'market', public.market_stats_snapshot(p_market_id),
    'winner_count', v_winner_count,
    'loser_count', v_loser_count,
    'payout_total', v_payout_total
  );
end;
$$;

revoke all on function public.place_prediction(uuid, text, integer, uuid) from public;
revoke all on function public.resolve_market(uuid, text, uuid) from public;
grant execute on function public.place_prediction(uuid, text, integer, uuid) to service_role;
grant execute on function public.resolve_market(uuid, text, uuid) to service_role;

-- MVP seed data
/*
Legacy seed block disabled. It predates slugs and point-backed predictions.
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
*/

insert into public.markets (title, description, category, slug, close_date, closes_at)
values
  (
    'Will Bitcoin break $150,000 before the end of 2026?',
    'A market for tracking public sentiment around Bitcoin, liquidity, ETF flows, and institutional demand.',
    'Crypto',
    'bitcoin-150k-2026',
    '2026-12-31T00:00:00Z',
    '2026-12-31T00:00:00Z'
  ),
  (
    'Will Thailand legalize casino resorts before 2028?',
    'Resolution should follow public law or official government approval for legal casino resort operations in Thailand.',
    'Thailand',
    'thailand-casino-resorts-2028',
    '2028-01-01T00:00:00Z',
    '2028-01-01T00:00:00Z'
  ),
  (
    'Will a major AI lab release a new frontier model in 2026?',
    'A sentiment market for AI release cycles, product launches, and competition between frontier model providers.',
    'AI',
    'major-ai-frontier-model-2026',
    '2026-12-31T00:00:00Z',
    '2026-12-31T00:00:00Z'
  )
on conflict (slug) do nothing;
