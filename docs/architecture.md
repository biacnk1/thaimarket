# ThaiMarket MVP Architecture

## Product positioning

ThaiMarket is a public prediction board for Thai events and internet culture.

Avoid wording like:
- betting
- gambling
- casino
- crypto trading
- real-money market

Use:
- vote
- signal
- public forecast
- sentiment
- prediction board

## Core model

```txt
markets = questions
votes = signals
comments = discussion
market_stats = computed sentiment
```

## MVP rules

- Anyone can read markets.
- Logged-in users can vote.
- One user can vote once per market.
- Vote can be updated.
- Logged-in users can comment.
- No real money.
- No wallet.
- No blockchain.

## Stack

```txt
Next.js + Supabase + Vercel
```

## Roadmap

### Phase 1
- Static preview
- Supabase schema
- API routes

### Phase 2
- Real market feed
- Auth
- Vote integration

### Phase 3
- Comments
- Admin create market
- Trending markets

### Phase 4
- Realtime updates
- Telegram alerts
- Share cards
