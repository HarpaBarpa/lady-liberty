import { getAddress, isAddress, type Address } from "viem";
import { CHAIN_ID, RH_API_BASE } from "./config";
import snapshot from "../_data/registry.json";

// The allow-list. A token counts only if its contract address is in Robinhood's own
// /rhj/assets registry. Symbols and names are display labels: the issuer can change them
// on-chain, and anyone can deploy a look-alike "AAPL" at a different address.

export type StockToken = {
  address: Address;
  symbol: string;
  name: string; // without the " • Robinhood Token" suffix
  decimals: number;
  multiplier: string; // ERC-8056 UI multiplier as a decimal string
};

export type Registry = {
  tokens: StockToken[];
  source: "live" | "bundled";
  asOf: string; // ISO date or timestamp
};

type RawToken = { address: string; symbol: string; name: string; decimals: number; multiplier: string };

function clean(raw: RawToken[]): StockToken[] {
  const seen = new Set<string>();
  const out: StockToken[] = [];
  for (const t of raw) {
    if (!isAddress(t.address, { strict: false })) continue;
    if (!Number.isInteger(t.decimals) || t.decimals < 0 || t.decimals > 36) continue;
    const address = getAddress(t.address);
    const key = address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      address,
      symbol: String(t.symbol),
      name:
        String(t.name)
          .replace(/\s*•\s*Robinhood Token\s*$/i, "")
          .replace(/[\s,]+$/, "")
          .trim() || String(t.symbol),
      decimals: t.decimals,
      multiplier: /^\d+(\.\d+)?$/.test(t.multiplier) ? t.multiplier : "1",
    });
  }
  return out.sort((a, b) => a.symbol.localeCompare(b.symbol));
}

export function bundledRegistry(): Registry {
  return { tokens: clean(snapshot.tokens as RawToken[]), source: "bundled", asOf: snapshot.asOf ?? "" };
}

type AssetsResponse = {
  assets?: {
    tokenSymbol: string;
    tokenName: string;
    tokenDecimals: number;
    currentMultiplier: string;
    status: string;
    deployments?: { contractAddress: string; chainId: number }[];
  }[];
};

export async function loadRegistry(timeoutMs = 4000): Promise<Registry> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${RH_API_BASE}/rhj/assets`, { signal: ctrl.signal, headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as AssetsResponse;
    const raw: RawToken[] = [];
    for (const a of data.assets ?? []) {
      if (a.status !== "ASSET_STATUS_ACTIVE") continue;
      const dep = a.deployments?.find((d) => d.chainId === CHAIN_ID);
      if (!dep) continue;
      raw.push({
        address: dep.contractAddress,
        symbol: a.tokenSymbol,
        name: a.tokenName,
        decimals: a.tokenDecimals,
        multiplier: a.currentMultiplier,
      });
    }
    const tokens = clean(raw);
    // An empty or tiny answer is more likely an outage than a real delisting.
    if (tokens.length < 10) throw new Error("registry answer too small");
    return { tokens, source: "live", asOf: new Date().toISOString() };
  } catch {
    // Expected today: api.robinhood.com sends no CORS headers, so browsers block the read.
    return bundledRegistry();
  } finally {
    clearTimeout(timer);
  }
}

export function indexByAddress(reg: Registry): Map<string, StockToken> {
  return new Map(reg.tokens.map((t) => [t.address.toLowerCase(), t]));
}

export function isAllowListed(reg: Registry, address: string): boolean {
  return reg.tokens.some((t) => t.address.toLowerCase() === address.toLowerCase());
}
