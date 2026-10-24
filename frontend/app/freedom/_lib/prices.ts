import { formatUnits, parseAbi, type Address, type PublicClient } from "viem";
import { CHAIN_ID, LAST_KNOWN_MAX_AGE_MS, RH_API_BASE } from "./config";
import type { StockToken } from "./registry";
import feedsSnapshot from "../_data/feeds.json";
import pricesSnapshot from "../_data/prices.json";

// Prices come in three states, and the page says which one each row is in:
//   fresh        a current price
//   last-known   a real price that may be out of date (market closed, halted, or saved earlier)
//   unavailable  no price recent enough to count
//
// Sources, best first:
//   1. Chainlink "Robinhood <SYM> / USD" feeds on chain 4663. Their answer already includes the
//      token's multiplier, so value = balance x answer.
//   2. Robinhood's /rhj/prices bid for the underlying share, times the registry multiplier.
//   3. The same quote saved into _data/prices.json when the data was last refreshed.

export type PriceState = "fresh" | "last-known" | "unavailable";

export type Price = {
  state: PriceState;
  usd: number | null; // per whole token, multiplier included
  asOf: Date | null;
  source: string | null;
  note: string | null;
};

export const NO_PRICE: Price = { state: "unavailable", usd: null, asOf: null, source: null, note: null };

type Feed = { proxy: string; decimals: number; heartbeat: number; description: string };

const FEEDS = feedsSnapshot.tokens as Record<string, Feed>;
const ETH_FEED = feedsSnapshot.ethUsd as Feed;
const SAVED = pricesSnapshot as { generatedAt: string | null; quotes: Record<string, { bid: string; halted: boolean }> };

const feedAbi = parseAbi([
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  "function description() view returns (string)",
]);

const GRACE_MS = 10 * 60 * 1000;

function lookup<T>(map: Record<string, T>, address: string): T | undefined {
  const key = Object.keys(map).find((k) => k.toLowerCase() === address.toLowerCase());
  return key ? map[key] : undefined;
}

export function hasChainlinkFeed(address: string): boolean {
  return Boolean(lookup(FEEDS, address));
}

// Chainlink's Robinhood equity feeds run 24/5: Sunday 8 pm to Friday 8 pm, New York time.
// Exchange holidays are not modelled; on those days the feed simply stops moving and the
// row shows its last price with the time it was set.
export function isEquityMarketOpen(now: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value;
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  if (weekday === "Sat") return false;
  if (weekday === "Fri" && hour >= 20) return false;
  if (weekday === "Sun" && hour < 20) return false;
  return true;
}

function classify(
  usd: number,
  asOf: Date,
  now: Date,
  freshForMs: number,
  marketOpen: boolean,
  source: string,
  extraNote: string | null,
): Price {
  const age = now.getTime() - asOf.getTime();
  if (!(usd > 0) || !Number.isFinite(usd)) return NO_PRICE;
  if (age > LAST_KNOWN_MAX_AGE_MS) return { ...NO_PRICE, note: "Last price is more than a week old" };
  if (marketOpen && !extraNote && age <= freshForMs + GRACE_MS) {
    return { state: "fresh", usd, asOf, source, note: null };
  }
  const note = extraNote ?? (marketOpen ? "Not updated recently" : "Market closed");
  return { state: "last-known", usd, asOf, source, note };
}

type Quote = { bid: string; halted: boolean; at: Date };

async function liveQuotes(timeoutMs = 4000): Promise<Map<string, Quote> | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${RH_API_BASE}/rhj/prices`, { signal: ctrl.signal, headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      quotes?: { bid: string; isTradingHalt?: boolean; generatedAt?: string; deployments?: { contractAddress: string; chainId: number }[] }[];
    };
    const out = new Map<string, Quote>();
    for (const q of data.quotes ?? []) {
      const dep = q.deployments?.find((d) => d.chainId === CHAIN_ID);
      if (!dep) continue;
      out.set(dep.contractAddress.toLowerCase(), {
        bid: q.bid,
        halted: Boolean(q.isTradingHalt),
        at: q.generatedAt ? new Date(q.generatedAt) : new Date(),
      });
    }
    return out;
  } catch {
    // Blocked by CORS today unless RH_API_BASE points at a proxy.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export type PriceResult = {
  prices: Map<string, Price>; // keyed by lowercase token address
  ethUsd: Price;
  liveQuotes: boolean;
};

export async function priceTokens(client: PublicClient, tokens: StockToken[], now = new Date()): Promise<PriceResult> {
  const marketOpen = isEquityMarketOpen(now);
  const withFeed = tokens.filter((t) => hasChainlinkFeed(t.address));

  // One multicall reads description() and latestRoundData() for every feed we need, plus ETH / USD.
  const feedList: { key: string; feed: Feed }[] = [
    { key: "eth", feed: ETH_FEED },
    ...withFeed.map((t) => ({ key: t.address.toLowerCase(), feed: lookup(FEEDS, t.address)! })),
  ];
  const calls = feedList.flatMap(({ feed }) => [
    { address: feed.proxy as Address, abi: feedAbi, functionName: "description" as const },
    { address: feed.proxy as Address, abi: feedAbi, functionName: "latestRoundData" as const },
  ]);
  const chainlink = new Map<string, Price>();
  try {
    const res = await client.multicall({ contracts: calls, allowFailure: true, batchSize: 16_384 });
    feedList.forEach(({ key, feed }, i) => {
      const desc = res[i * 2];
      const round = res[i * 2 + 1];
      // A feed only counts if it still describes itself as the pair we pinned.
      if (desc.status !== "success" || desc.result !== feed.description) return;
      if (round.status !== "success") return;
      const [, answer, , updatedAt] = round.result as readonly [bigint, bigint, bigint, bigint, bigint];
      if (answer <= 0n || updatedAt === 0n) return;
      const usd = Number(formatUnits(answer, feed.decimals));
      const asOf = new Date(Number(updatedAt) * 1000);
      const open = key === "eth" ? true : marketOpen;
      chainlink.set(key, classify(usd, asOf, now, feed.heartbeat * 1000, open, "Chainlink", null));
    });
  } catch {
    // Leave the map empty; the Robinhood sources below still apply.
  }

  const needsQuote = tokens.filter((t) => (chainlink.get(t.address.toLowerCase())?.state ?? "unavailable") === "unavailable");
  const live = needsQuote.length ? await liveQuotes() : null;

  const prices = new Map<string, Price>();
  for (const t of tokens) {
    const key = t.address.toLowerCase();
    const cl = chainlink.get(key);
    if (cl && cl.state !== "unavailable") {
      prices.set(key, cl);
      continue;
    }
    const mult = Number(t.multiplier) || 1;
    const q = live?.get(key);
    if (q) {
      const p = classify(Number(q.bid) * mult, q.at, now, 15 * 60 * 1000, marketOpen, "Robinhood quote", q.halted ? "Trading halted" : null);
      if (p.state !== "unavailable") {
        prices.set(key, p);
        continue;
      }
    }
    const saved = lookup(SAVED.quotes, t.address);
    if (saved && SAVED.generatedAt) {
      const p = classify(
        Number(saved.bid) * mult,
        new Date(SAVED.generatedAt),
        now,
        0,
        false,
        "Saved Robinhood quote",
        "Saved price",
      );
      prices.set(key, p);
      continue;
    }
    prices.set(key, cl ?? NO_PRICE);
  }

  return { prices, ethUsd: chainlink.get("eth") ?? NO_PRICE, liveQuotes: Boolean(live) };
}
