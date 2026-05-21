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
),
market_rollup as (
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
    m.creator_user_id,
    creator_profile.display_name as creator_display_name,
    creator_profile.username as creator_username,
    coalesce(creator_profile.profile_picture_url, creator_profile.avatar_url) as creator_profile_picture_url,
    coalesce(creator_profile.profile_picture_url, creator_profile.avatar_url) as creator_avatar_url,
    m.created_at,
    coalesce(pr.total_predictions, 0)::int as total_predictions,
    coalesce(pr.total_volume, 0)::int as total_volume,
    coalesce(pr.total_predictions, 0)::int as total_votes,
    coalesce(pr.yes_count, 0)::int as yes_count,
    coalesce(pr.no_count, 0)::int as no_count,
    coalesce(pr.yes_count, 0)::int as yes_votes,
    coalesce(pr.no_count, 0)::int as no_votes,
    coalesce(pr.yes_count, 0)::int as yes_votes_count,
    coalesce(pr.no_count, 0)::int as no_votes_count,
    coalesce(pr.yes_amount, 0)::int as yes_amount,
    coalesce(pr.no_amount, 0)::int as no_amount,
    coalesce(pr.yes_amount, 0)::int as yes_points,
    coalesce(pr.no_amount, 0)::int as no_points,
    coalesce(pr.yes_amount, 0)::int as yes_points_volume,
    coalesce(pr.no_amount, 0)::int as no_points_volume
  from public.markets m
  left join prediction_rollup pr on pr.market_id = m.id
  left join public.profiles creator_profile on creator_profile.id = m.creator_user_id
)
select
  market_rollup.*,
  case
    when market_rollup.total_votes = 0 then 0
    else round(
      market_rollup.yes_count::numeric
      / market_rollup.total_votes::numeric
      * 100
    )::int
  end as yes_percentage,
  case
    when market_rollup.total_votes = 0 then 0
    else 100 - round(
      market_rollup.yes_count::numeric
      / market_rollup.total_votes::numeric
      * 100
    )::int
  end as no_percentage
from market_rollup;

grant select on public.market_stats to anon, authenticated;
