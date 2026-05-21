import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { demoMarketStats, type DemoMarketStat } from "@/lib/markets/demo";

export type LocalVoteSide = "yes" | "no";

export type LocalMarketRequest = {
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
  sync_status?: "local_dev";
};

export type LocalMarketStat = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: "open" | "closed" | "resolved";
  result: "yes" | "no" | null;
  closes_at: string | null;
  created_at: string;
  total_votes: number;
  yes_count: number;
  no_count: number;
  yes_percentage: number;
  sync_status?: "local_dev";
};

export type LocalComment = {
  id: string;
  market_id: string;
  body: string;
  user_id: string;
  created_at: string;
  sync_status?: "local_dev";
};

export type LocalAuthUser = {
  id: string;
  email: string;
  password: string;
  created_at: string;
  app_metadata: Record<string, unknown>;
  user_metadata: {
    username?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
  };
};

export type LocalProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  reputation: number;
  points_balance: number;
  created_at: string;
  updated_at: string;
};

type LocalStore = {
  marketRequests: LocalMarketRequest[];
  approvedMarkets: LocalMarketStat[];
  comments: LocalComment[];
  marketVotes: Record<string, Record<string, LocalVoteSide>>;
  authUsers: LocalAuthUser[];
  profiles: LocalProfile[];
};

const localDataDir = path.join(process.cwd(), ".data");
const localDataFile = path.join(localDataDir, "thaimarket-local.json");

const globalState = globalThis as typeof globalThis & {
  thaiMarketLocalStoreQueue?: Promise<unknown>;
};

function createEmptyStore(): LocalStore {
  return {
    marketRequests: [],
    approvedMarkets: [],
    comments: [],
    marketVotes: {},
    authUsers: [],
    profiles: []
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeStore(value: unknown): LocalStore {
  if (!isRecord(value)) {
    return createEmptyStore();
  }

  return {
    marketRequests: Array.isArray(value.marketRequests)
      ? (value.marketRequests as LocalMarketRequest[])
      : [],
    approvedMarkets: Array.isArray(value.approvedMarkets)
      ? (value.approvedMarkets as LocalMarketStat[])
      : [],
    comments: Array.isArray(value.comments) ? (value.comments as LocalComment[]) : [],
    marketVotes: isRecord(value.marketVotes)
      ? (value.marketVotes as Record<string, Record<string, LocalVoteSide>>)
      : {},
    authUsers: Array.isArray(value.authUsers)
      ? (value.authUsers as LocalAuthUser[])
      : [],
    profiles: Array.isArray(value.profiles) ? (value.profiles as LocalProfile[]) : []
  };
}

function queueStoreWork<T>(work: () => Promise<T>) {
  const previous = globalState.thaiMarketLocalStoreQueue ?? Promise.resolve();
  const next = previous.then(work, work);
  globalState.thaiMarketLocalStoreQueue = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

async function readStore() {
  await mkdir(localDataDir, { recursive: true });

  try {
    const raw = await readFile(localDataFile, "utf8");
    return normalizeStore(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      const emptyStore = createEmptyStore();
      await writeFile(localDataFile, JSON.stringify(emptyStore, null, 2), "utf8");
      return emptyStore;
    }

    console.error("Failed to read local dev store, resetting it:", error);
    return createEmptyStore();
  }
}

async function writeStore(store: LocalStore) {
  await mkdir(localDataDir, { recursive: true });
  await writeFile(localDataFile, JSON.stringify(store, null, 2), "utf8");
}

function sortByCreatedAtDesc<T extends { created_at: string }>(items: T[]) {
  return [...items].sort(
    (left, right) =>
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );
}

function mergeVotes(
  market: Pick<
    LocalMarketStat,
    "total_votes" | "yes_count" | "no_count"
  >,
  votesByUser: Record<string, LocalVoteSide> | undefined
) {
  const localVotes = Object.values(votesByUser ?? {});
  const localYesCount = localVotes.filter((vote) => vote === "yes").length;
  const localNoCount = localVotes.length - localYesCount;
  const totalVotes = market.total_votes + localVotes.length;
  const yesCount = market.yes_count + localYesCount;
  const noCount = market.no_count + localNoCount;
  const yesPercentage = totalVotes === 0 ? 0 : Math.round((yesCount / totalVotes) * 100);

  return {
    total_votes: totalVotes,
    yes_count: yesCount,
    no_count: noCount,
    yes_percentage: yesPercentage
  };
}

function withVotes(
  market: DemoMarketStat | LocalMarketStat,
  votesByUser: Record<string, LocalVoteSide> | undefined
): LocalMarketStat {
  return {
    ...market,
    ...mergeVotes(market, votesByUser)
  };
}

function getBaseMarket(store: LocalStore, marketId: string) {
  return (
    store.approvedMarkets.find((market) => market.id === marketId) ??
    demoMarketStats.find((market) => market.id === marketId) ??
    null
  );
}

function toPublicLocalUser(user: LocalAuthUser) {
  return {
    id: user.id,
    email: user.email,
    app_metadata: user.app_metadata,
    user_metadata: user.user_metadata,
    created_at: user.created_at
  };
}

function defaultLocalProfile(user: LocalAuthUser): LocalProfile {
  const now = new Date().toISOString();

  return {
    id: user.id,
    username: user.user_metadata.username ?? null,
    display_name: user.user_metadata.display_name ?? user.email.split("@")[0],
    avatar_url: user.user_metadata.avatar_url ?? null,
    bio: null,
    reputation: 0,
    points_balance: 1000,
    created_at: now,
    updated_at: now
  };
}

function findProfileByUserId(store: LocalStore, userId: string) {
  const user = store.authUsers.find((item) => item.id === userId);

  if (!user) return null;

  let profile = store.profiles.find((item) => item.id === userId);

  if (!profile) {
    profile = defaultLocalProfile(user);
    store.profiles.push(profile);
  }

  profile.points_balance ??= 1000;

  return profile;
}

function createAuthUser(input: {
  email: string;
  password: string;
  username: string | null;
  display_name: string | null;
  avatar_url?: string | null;
}) {
  const now = new Date().toISOString();
  const id = `local-user-${input.email.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const user: LocalAuthUser = {
    id,
    email: input.email.toLowerCase(),
    password: input.password,
    created_at: now,
    app_metadata: {},
    user_metadata: {
      username: input.username,
      display_name: input.display_name ?? input.email.split("@")[0],
      avatar_url: input.avatar_url ?? null
    }
  };

  return user;
}

export async function ensureLocalTesterUser() {
  return queueStoreWork(async () => {
    const store = await readStore();
    const email = "tester123@gmail.com";
    let user = store.authUsers.find((item) => item.email === email);

    if (!user) {
      user = createAuthUser({
        email,
        password: "test123",
        username: "tester123",
        display_name: "Tester 123"
      });
      store.authUsers.push(user);
    } else {
      user.password = "test123";
      user.user_metadata.username ??= "tester123";
      user.user_metadata.display_name ??= "Tester 123";
    }

    findProfileByUserId(store, user.id);
    await writeStore(store);

    return toPublicLocalUser(user);
  });
}

export async function createLocalAuthUser(input: {
  email: string;
  password: string;
  username: string | null;
  display_name: string | null;
}) {
  return queueStoreWork(async () => {
    const store = await readStore();
    const email = input.email.toLowerCase();

    if (store.authUsers.some((user) => user.email === email)) {
      return {
        user: null,
        error: "Email is already registered."
      };
    }

    if (input.username && store.profiles.some((profile) => profile.username === input.username)) {
      return {
        user: null,
        error: "Username is already taken."
      };
    }

    const user = createAuthUser({
      ...input,
      email
    });

    store.authUsers.push(user);
    store.profiles.push(defaultLocalProfile(user));
    await writeStore(store);

    return {
      user: toPublicLocalUser(user),
      error: null
    };
  });
}

export async function findLocalAuthUserByCredentials(email: string, password: string) {
  if (email.toLowerCase() === "tester123@gmail.com" && password === "test123") {
    await ensureLocalTesterUser();
  }

  return queueStoreWork(async () => {
    const store = await readStore();
    const user = store.authUsers.find(
      (item) => item.email === email.toLowerCase() && item.password === password
    );

    return user ? toPublicLocalUser(user) : null;
  });
}

export async function findLocalAuthUserByLoginIdentifier(identifier: string, password: string) {
  const normalized = identifier.trim().toLowerCase();

  if ((normalized === "tester123" || normalized === "tester123@gmail.com") && password === "test123") {
    await ensureLocalTesterUser();
  }

  return queueStoreWork(async () => {
    const store = await readStore();
    const profile = store.profiles.find((item) => item.username === normalized);
    const user = store.authUsers.find((item) => {
      const username = item.user_metadata.username?.toLowerCase();

      return (
        item.password === password &&
        (item.email === normalized || username === normalized || item.id === profile?.id)
      );
    });

    return user ? toPublicLocalUser(user) : null;
  });
}

export async function getLocalAuthUserById(userId: string) {
  return queueStoreWork(async () => {
    const store = await readStore();
    const user = store.authUsers.find((item) => item.id === userId);
    return user ? toPublicLocalUser(user) : null;
  });
}

export async function getLocalProfileByUserId(userId: string) {
  return queueStoreWork(async () => {
    const store = await readStore();
    const profile = findProfileByUserId(store, userId);
    await writeStore(store);
    return profile;
  });
}

export async function localUsernameExists(username: string) {
  return queueStoreWork(async () => {
    const store = await readStore();
    return store.profiles.some((profile) => profile.username === username);
  });
}

export async function updateLocalProfile(input: {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}) {
  return queueStoreWork(async () => {
    const store = await readStore();
    const user = store.authUsers.find((item) => item.id === input.id);

    if (!user) return null;

    const usernameTaken = input.username
      ? store.profiles.some((profile) => profile.id !== input.id && profile.username === input.username)
      : false;

    if (usernameTaken) {
      throw new Error("Username is already taken.");
    }

    let profile = findProfileByUserId(store, input.id);

    if (!profile) return null;

    profile = {
      ...profile,
      username: input.username,
      display_name: input.display_name,
      avatar_url: input.avatar_url,
      bio: input.bio,
      updated_at: new Date().toISOString()
    };

    user.user_metadata.username = profile.username;
    user.user_metadata.display_name = profile.display_name;
    user.user_metadata.avatar_url = profile.avatar_url;

    store.profiles = store.profiles.map((item) => (item.id === input.id ? profile : item));
    await writeStore(store);

    return profile;
  });
}

export async function getLocalMarkets() {
  return queueStoreWork(async () => {
    const store = await readStore();
    const markets = [
      ...store.approvedMarkets.map((market) =>
        withVotes(market, store.marketVotes[market.id])
      ),
      ...demoMarketStats.map((market) => withVotes(market, store.marketVotes[market.id]))
    ];

    return sortByCreatedAtDesc(markets);
  });
}

export async function createLocalMarket(data: {
  title: string;
  description: string | null;
  category: string;
  closes_at: string | null;
}) {
  return queueStoreWork(async () => {
    const store = await readStore();
    const market: LocalMarketStat = {
      id: `local-market-${Date.now()}`,
      title: data.title,
      description: data.description,
      category: data.category,
      status: "open",
      result: null,
      closes_at: data.closes_at,
      created_at: new Date().toISOString(),
      total_votes: 0,
      yes_count: 0,
      no_count: 0,
      yes_percentage: 0,
      sync_status: "local_dev"
    };

    store.approvedMarkets.unshift(market);
    await writeStore(store);

    return market;
  });
}

export async function getLocalMarketById(marketId: string, voterId?: string) {
  return queueStoreWork(async () => {
    const store = await readStore();
    const market = getBaseMarket(store, marketId);

    if (!market) {
      return null;
    }

    return {
      ...withVotes(market, store.marketVotes[marketId]),
      user_vote: voterId ? store.marketVotes[marketId]?.[voterId] ?? null : null
    };
  });
}

export async function submitLocalVote(input: {
  marketId: string;
  voterId: string;
  side: LocalVoteSide;
}) {
  return queueStoreWork(async () => {
    const store = await readStore();
    const market = getBaseMarket(store, input.marketId);

    if (!market) {
      return null;
    }

    store.marketVotes[input.marketId] ??= {};
    store.marketVotes[input.marketId][input.voterId] = input.side;
    await writeStore(store);

    return {
      ...withVotes(market, store.marketVotes[input.marketId]),
      user_vote: input.side
    };
  });
}

export async function getLocalComments(marketId: string) {
  return queueStoreWork(async () => {
    const store = await readStore();
    return sortByCreatedAtDesc(
      store.comments.filter((comment) => comment.market_id === marketId)
    );
  });
}

export async function addLocalComment(input: {
  marketId: string;
  userId: string;
  body: string;
}) {
  return queueStoreWork(async () => {
    const store = await readStore();
    const market = getBaseMarket(store, input.marketId);

    if (!market) {
      return null;
    }

    const comment: LocalComment = {
      id: `local-comment-${Date.now()}`,
      market_id: input.marketId,
      user_id: input.userId,
      body: input.body,
      created_at: new Date().toISOString(),
      sync_status: "local_dev"
    };

    store.comments.unshift(comment);
    await writeStore(store);

    return comment;
  });
}

export async function getLocalProfilesByUserIds(userIds: string[]) {
  return queueStoreWork(async () => {
    const store = await readStore();
    const ids = new Set(userIds);

    return store.profiles.filter((profile) => ids.has(profile.id));
  });
}

export async function getLocalProfileByUsername(username: string) {
  return queueStoreWork(async () => {
    const store = await readStore();
    return store.profiles.find((profile) => profile.username === username) ?? null;
  });
}

export async function getLocalMarketRequests() {
  return queueStoreWork(async () => {
    const store = await readStore();
    return sortByCreatedAtDesc(store.marketRequests);
  });
}

export async function addLocalMarketRequest(data: {
  question: string;
  description: string | null;
  category: string;
  closes_at: string;
  requester_user_id?: string | null;
}) {
  return queueStoreWork(async () => {
    const store = await readStore();
    const request: LocalMarketRequest = {
      id: `local-request-${Date.now()}`,
      ...data,
      status: "pending",
      requester_user_id: data.requester_user_id ?? null,
      reviewed_by: null,
      reviewed_at: null,
      admin_note: null,
      created_at: new Date().toISOString(),
      sync_status: "local_dev"
    };

    store.marketRequests.unshift(request);
    await writeStore(store);

    return request;
  });
}

export async function approveLocalMarketRequest(id: string) {
  return queueStoreWork(async () => {
    const store = await readStore();
    const request = store.marketRequests.find(
      (item) => item.id === id && item.status === "pending"
    );

    if (!request) {
      return null;
    }

    request.status = "approved";
    request.reviewed_at = new Date().toISOString();
    request.reviewed_by = "local-admin";

    let market = store.approvedMarkets.find(
      (item) => item.id === `local-market-${request.id}`
    );

    if (!market) {
      market = {
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
        sync_status: "local_dev"
      };

      store.approvedMarkets.unshift(market);
    }

    await writeStore(store);

    return {
      request,
      market
    };
  });
}

export async function rejectLocalMarketRequest(id: string, adminNote: string | null = null) {
  return queueStoreWork(async () => {
    const store = await readStore();
    const request = store.marketRequests.find((item) => item.id === id);

    if (!request || request.status === "approved") {
      return null;
    }

    request.status = "rejected";
    request.reviewed_at = new Date().toISOString();
    request.reviewed_by = "local-admin";
    request.admin_note = adminNote;

    await writeStore(store);

    return request;
  });
}
