export type DemoMarketStat = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: "open" | "closed" | "resolved";
  result: "yes" | "no" | null;
  closes_at: string;
  created_at: string;
  total_votes: number;
  yes_count: number;
  no_count: number;
  yes_percentage: number;
};

export const demoMarketStats: DemoMarketStat[] = [
  {
    id: "demo-bitcoin-2026",
    title: "Will Bitcoin break $150,000 before the end of 2026?",
    description:
      "A demo market for tracking public sentiment around Bitcoin, liquidity, ETF flows, and institutional demand.",
    category: "Crypto",
    status: "open",
    result: null,
    closes_at: "2026-12-31T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    total_votes: 128,
    yes_count: 74,
    no_count: 54,
    yes_percentage: 58
  },
  {
    id: "demo-thailand-tourism",
    title: "Will Thailand pass 40 million international visitors in 2026?",
    description:
      "A public forecast for Thailand tourism recovery based on aviation capacity, regional demand, and policy changes.",
    category: "Thailand",
    status: "open",
    result: null,
    closes_at: "2026-12-31T00:00:00Z",
    created_at: "2026-01-02T00:00:00Z",
    total_votes: 96,
    yes_count: 61,
    no_count: 35,
    yes_percentage: 64
  },
  {
    id: "demo-ai-model",
    title: "Will a major AI lab release a new frontier model this year?",
    description:
      "A sentiment market for AI release cycles, product launches, and competition between frontier model providers.",
    category: "AI",
    status: "open",
    result: null,
    closes_at: "2026-12-31T00:00:00Z",
    created_at: "2026-01-03T00:00:00Z",
    total_votes: 77,
    yes_count: 39,
    no_count: 38,
    yes_percentage: 51
  }
];
