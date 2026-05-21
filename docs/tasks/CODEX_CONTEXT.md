# ThaiMarket — Codex Project Memory

## Purpose

This file is meant to be placed in the project repository as a long-term context file for Codex.

Suggested filename:

```text
CODEX_CONTEXT.md
```

Codex should read this before making product, UX, architecture, or implementation decisions.

---

# 1. Project Overview

ThaiMarket is a modern prediction market MVP.

The current product is inspired by:

- Polymarket
- social trading
- reputation systems
- gamified intelligence platforms
- prediction games
- guru / analyst discovery apps
- modern crypto-fintech dashboards

The product should not be treated as only a gambling app.

The long-term direction is:

> Social intelligence + prediction reputation game

Users should feel that they are not only voting on markets, but building public reputation through prediction accuracy.

---

# 2. Current Stack

Current / planned stack:

- Next.js App Router
- TypeScript
- TailwindCSS
- Vercel deploy
- Supabase backend
- Dark modern fintech UI

Current live MVP already exists and has been deployed on Vercel.

The product currently includes:

- homepage
- prediction market cards
- category filters
- search
- market detail panel
- YES / NO voting UI
- probability bars
- market stats
- Create Market button
- Admin entry
- prototype / MVP style data

---

# 3. Current Product Direction

The product is evolving from:

```text
Prediction market
```

into:

```text
Reputation game + social intelligence network
```

The core idea:

Users make predictions. Their prediction accuracy becomes a public reputation asset. Over time, the platform should reveal who is actually good at predicting specific categories.

The app should create a loop where users want to:

- predict
- prove they are right
- compare themselves with others
- climb rankings
- follow smart people
- become recognized as a guru
- return daily to protect or improve their status

---

# 4. Core User Loop

Every major product decision should support this loop:

1. User discovers a market.
2. User predicts YES or NO.
3. The market resolves later.
4. User accuracy score changes.
5. User reputation / rank changes.
6. Community can see performance.
7. Ego / status loop triggers.
8. User returns to improve rank.

Important:

Do not add features that do not strengthen this loop.

Avoid feature bloat.

---

# 5. Current Market Format Decision

For now, use only YES / NO prediction markets.

Do not implement WH questions yet.

Reason:

YES / NO markets are simpler for:

- UX
- scoring
- ranking
- resolution
- moderation
- user understanding
- reputation calculation
- leaderboard logic
- daily participation

WH / multi-option questions may be added later as advanced market types, but not now.

Examples of future advanced market types:

- target price markets
- multiple choice markets
- ranking outcomes
- date / time prediction markets
- probability range markets

For the MVP and early reputation system, binary outcomes are the correct default.

---

# 6. Product Layers

## Layer 1 — Prediction Core

Core prediction market system:

- markets
- YES / NO voting
- market categories
- probability %
- close date
- market status
- outcome resolution
- market history

This is the base engine.

---

## Layer 2 — Reputation System

This is one of the most important future layers.

Planned reputation concepts:

- accuracy score
- weighted accuracy
- streaks
- category specialization
- confidence score
- guru rank
- prediction history
- win / loss record
- public performance profile

This layer creates the trust graph of the platform.

Users should be able to see who is actually good at predicting specific domains.

Examples:

- Crypto Guru
- Politics Guru
- AI Trend Guru
- Economy Guru
- Sports Guru

---

## Layer 3 — Gamification Loop

Planned gamification systems:

- points
- stars
- XP
- daily tasks
- streaks
- achievements
- badges
- level progression
- seasonal ranking
- weekly leaderboard
- category leaderboard

These systems should support retention and status, not exist only as decoration.

---

## Layer 4 — Guru / Social Intelligence Layer

Tester feedback suggested a direction similar to a “Guru Portfolio” section.

Important insight:

> People do not only want to predict. They also want to follow smart predictors.

This is strategically important.

The platform should eventually let users discover and follow high-performing predictors.

Potential Guru Layer features:

- Guru profiles
- public accuracy score
- category expertise
- followers
- prediction history
- top predictions
- recent performance
- best categories
- rising gurus
- most accurate gurus
- most followed gurus
- weekly top performers
- category leaders

Possible leaderboard tabs:

- Most Accurate
- Highest Streak
- Most Followed
- Fastest Rising
- Most Active
- Best Weekly Performance
- Category Leaders

This turns prediction accuracy itself into content.

Users may return not only to vote, but to:

- check rankings
- watch gurus rise or fall
- compare themselves
- follow experts
- defend their own reputation

---

## Layer 5 — Subscription / Premium Layer

Future monetization direction:

Free users:

- basic feed
- basic market view
- simple voting
- limited analytics
- limited profile insights

Paid users:

- advanced analytics
- guru insights
- prediction trends
- sentiment analysis
- category intelligence
- hidden metrics
- advanced filters
- premium guru discovery
- deeper market history

Do not build the full subscription system too early.

Prepare architecture so it can support premium gating later.

---

## Layer 6 — Social Layer

Future social features:

- comments
- reactions
- follow users
- social feed
- prediction sharing
- public profile
- guru feed
- community identity
- tribe behavior

This should come after the core prediction and reputation systems are stable.

---

# 7. UX / UI Direction

The UI should feel like:

- modern fintech
- crypto exchange
- Polymarket-inspired
- premium dark startup product
- data-rich but clean
- alive
- competitive
- social
- intelligence-driven

Avoid:

- generic admin dashboard
- Steam clone
- old Web2 feeling
- overly technical product showcase
- showing implementation details to users

Important:

The product should feel like a real app, not a developer preview.

For example, do not show unnecessary technical fields such as:

- Stack: Next
- Status: MVP

Users do not care about internal stack or MVP state.

Hero stats should communicate activity, trust, and social proof.

Better hero stat ideas:

Option A — Social proof:

- Markets
- Total Votes
- Active Predictors
- Trending Category

Option B — Reputation game:

- Markets
- Total Votes
- Top Accuracy
- Current Season

Option C — Intelligence network:

- Markets
- Signals Today
- Active Analysts
- Consensus Shift

Recommended early choice:

- Markets
- Total Votes
- Active Predictors
- Trending Category

---

# 8. Product Must Feel Alive

The app must not feel dead.

Prioritize adding “alive feeling” before adding many complex features.

Possible UX improvements:

- animated market movement
- trending badges
- activity pulses
- hover glow
- micro-interactions
- recent prediction activity
- “X users predicted today”
- “Hot” markets
- market movement indicators
- daily active signals
- leaderboard preview
- rising guru preview

Even if some data is simulated during early MVP, the interface should communicate that the ecosystem has activity.

---

# 9. Mobile-First Priority

Most expected traffic will come from:

- X / Twitter
- Facebook
- TikTok
- Discord
- Telegram
- shared links

Therefore mobile layout is critical.

Mobile UX should prioritize:

- fast market scanning
- easy YES / NO interaction
- simple profile/rank visibility
- clean category filter
- low cognitive load
- high readability
- sticky bottom navigation in future

---

# 10. Suggested Phase Order

Do not build everything at once.

Recommended order:

## Phase 1 — Core Market MVP

- market list
- market detail
- YES / NO interaction
- categories
- search
- simple stats
- Supabase persistence
- admin create market
- basic outcome status

## Phase 2 — Alive Feeling

- trending markets
- recent activity
- market movement
- better hover states
- animated probability changes
- fake or real activity feed
- improved hero stats

## Phase 3 — Basic Reputation

- user profile
- prediction history
- accuracy score
- win/loss count
- category stats
- simple leaderboard

## Phase 4 — Guru System

- guru profile
- category expertise
- guru ranking
- top predictors
- rising gurus
- follow system later

## Phase 5 — Social Layer

- comments
- reactions
- follow feed
- user-to-user discovery
- sharing

## Phase 6 — Premium Layer

- subscription
- premium analytics
- advanced filters
- guru insights
- hidden metrics

---

# 11. Technical Architecture Principles

Codex should prioritize clean structure and maintainability.

Avoid:

- huge page.tsx files
- hardcoded business logic everywhere
- mixing UI, data, and scoring logic together
- overengineering
- premature realtime systems
- enterprise-level abstractions too early
- complex wallet/payment systems too early
- chat systems too early

Prefer:

- reusable components
- modular feature folders
- isolated business logic
- typed data models
- clean Supabase access layer
- simple but scalable database schema
- clear separation between demo data and production data
- easy migration path from local/mock data to Supabase

---

# 12. Suggested Folder Direction

Codex may propose a better structure after inspecting the repo, but this is the intended direction:

```text
/app
  /api
  /admin
  /markets
/components
  /layout
  /market
  /profile
  /leaderboard
  /ui
/lib
  /supabase
  /markets
  /scoring
  /reputation
  /analytics
/types
/data
  demo-markets.ts
```

Important:

Keep MVP simple, but do not let the code become impossible to extend.

---

# 13. Database Concepts

Future database schema should probably support:

- users
- profiles
- markets
- predictions
- market_categories
- market_outcomes
- reputation_scores
- category_scores
- leaderboard_snapshots
- activity_events
- subscriptions later

Do not implement everything at once.

But when designing current schema, avoid choices that block:

- prediction history
- accuracy score
- category ranking
- user profile
- guru system
- premium analytics

---

# 14. Scoring / Reputation Concepts

Do not rush complex scoring.

Start simple.

Possible basic scoring:

- total predictions
- correct predictions
- accuracy percentage
- current streak
- best streak
- category accuracy
- points earned
- rank

Future weighted score may consider:

- market difficulty
- prediction confidence
- timing of prediction
- unpopular but correct prediction
- category expertise
- consistency
- volume of predictions

Early MVP can start with simple accuracy and evolve later.

---

# 15. Analytics Priority

Add basic analytics early if possible.

Track:

- page views
- market clicks
- YES clicks
- NO clicks
- category clicks
- search usage
- return visits
- session duration
- create market attempts

The goal is to learn what users actually do.

---

# 16. Important Product Risks

Major risks:

- feature explosion
- scope creep
- too much complexity too early
- building social features before core loop works
- building subscription before users care
- overengineering backend
- making product feel like a dashboard instead of a social game
- no activity feeling
- no distribution
- no retention loop
- too much technical language in UI
- weak mobile experience

---

# 17. What Not To Build Yet

Avoid building these too early:

- wallet
- real-money betting
- complex realtime system
- full chat system
- complex notification engine
- full subscription/payment flow
- WH/multi-option markets
- advanced dispute system
- overly complex admin panel
- enterprise architecture
- complicated AI analytics

Build simple and extensible first.

---

# 18. Current Development Focus

Current recommended focus:

1. Replace unnecessary hero stats like “Stack / Next” and “Status / MVP”
2. Add user-facing activity/social proof stats
3. Improve market card polish
4. Make product feel more alive
5. Keep binary YES / NO market format
6. Prepare structure for reputation system
7. Add basic analytics if possible
8. Reduce technical debt
9. Avoid feature explosion

---

# 19. Codex Working Style Instruction

Important instruction for Codex:

When given a task, do not reply after every tiny step.

Instead:

1. Analyze the repo.
2. Plan the changes.
3. Make the changes.
4. Run checks if available.
5. Fix errors if they appear.
6. Continue until the assigned task is complete.
7. Then respond once with a final summary.

Avoid step-by-step status replies because they waste tokens.

Codex should only stop early if:

- credentials are missing
- required environment variables are missing
- the task is ambiguous enough to risk damaging the project
- the requested change is impossible with available files
- a destructive action is required

Otherwise, complete the implementation first, then report.

Preferred final response format:

```text
Done.

Changed:
- ...

Checked:
- ...

Notes:
- ...
```

---

# 20. Suggested Prompt To Use With Codex

Use this prompt when assigning tasks:

```text
Read CODEX_CONTEXT.md first.

Follow the project direction strictly:
- prediction market
- reputation game
- social intelligence network
- mobile-first dark fintech UI
- avoid feature explosion

Important working style:
After I give you a task, do not reply after every tiny step.
Analyze, implement, test/check, fix issues, and only respond once when the task is complete.
Only stop early if you need missing credentials, destructive confirmation, or critical clarification.

Task:
[write task here]
```

---

# 21. Strategic Summary

ThaiMarket should not become a random feature-heavy prediction dashboard.

It should become:

```text
A gamified social intelligence platform where people build reputation by being right before others.
```

The strongest future moat is not only market data.

The strongest moat is:

- prediction history
- user reputation
- category expertise
- guru discovery
- social status
- community trust graph

The product should be built slowly, clearly, and with strong focus on the core loop.
