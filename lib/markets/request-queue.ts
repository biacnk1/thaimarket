export type QueuedMarketRequest = {
  id: string;
  question: string;
  description: string | null;
  category: string;
  closes_at: string;
  status: "pending" | "approved" | "rejected";
  requester_user_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_note: string | null;
  created_at: string;
  sync_status?: "local_demo";
};

export type LocalMarketStat = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: "open" | "closed" | "resolved";
  result: "yes" | "no" | null;
  closes_at: string;
  created_at: string;
  total_votes: number;
  yes_count: number;
  no_count: number;
  yes_percentage: number;
  sync_status?: "local_demo";
};

const globalStore = globalThis as typeof globalThis & {
  thaiMarketRequestQueue?: QueuedMarketRequest[];
  thaiMarketApprovedMarkets?: LocalMarketStat[];
};

export function getLocalMarketRequests() {
  globalStore.thaiMarketRequestQueue ??= [];
  return globalStore.thaiMarketRequestQueue;
}

export function getLocalApprovedMarkets() {
  globalStore.thaiMarketApprovedMarkets ??= [];
  return globalStore.thaiMarketApprovedMarkets;
}

export function addLocalMarketRequest(data: {
  question: string;
  description: string | null;
  category: string;
  closes_at: string;
}) {
  const request: QueuedMarketRequest = {
    id: `demo-request-${Date.now()}`,
    ...data,
    status: "pending",
    requester_user_id: null,
    reviewed_by: null,
    reviewed_at: null,
    admin_note: null,
    created_at: new Date().toISOString(),
    sync_status: "local_demo"
  };

  getLocalMarketRequests().unshift(request);
  return request;
}

export function approveLocalMarketRequest(id: string) {
  const request = getLocalMarketRequests().find((item) => item.id === id);

  if (!request) return null;
  const existingMarket = getLocalApprovedMarkets().find((market) => market.id === `local-market-${request.id}`);

  request.status = "approved";
  request.reviewed_at = new Date().toISOString();
  request.reviewed_by = "local-admin";

  if (existingMarket) {
    return {
      request,
      market: existingMarket
    };
  }

  const market: LocalMarketStat = {
    id: `local-market-${request.id}`,
    title: request.question,
    description: request.description,
    category: request.category,
    status: "open",
    result: null,
    closes_at: request.closes_at,
    created_at: request.reviewed_at,
    total_votes: 0,
    yes_count: 0,
    no_count: 0,
    yes_percentage: 0,
    sync_status: "local_demo"
  };

  getLocalApprovedMarkets().unshift(market);

  return {
    request,
    market
  };
}
