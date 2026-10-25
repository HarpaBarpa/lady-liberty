import {
  BaseError,
  ContractFunctionRevertedError,
  encodeFunctionData,
  erc20Abi,
  HttpRequestError,
  parseAbi,
  TimeoutError,
  type Address,
  type PublicClient,
} from "viem";
import { FALLBACK_GAS_PER_SEND, RPC_BATCH_SIZE, VAULT } from "./config";
import { NO_PRICE, priceTokens, type Price } from "./prices";
import type { Registry, StockToken } from "./registry";

// The scanner only ever calls three kinds of contract: Multicall3, the allow-listed Stock
// Tokens, and the pinned Chainlink feeds. It never touches a contract it found in the wallet.

// transfer() plus the custom errors of Robinhood's Stock Token implementation
// (0xb35490d6f9163de4f80d88dc75c3516eb64c5ae2, verified on Sourcify), so reverts can be explained.
export const stockTokenAbi = [
  ...erc20Abi,
  ...parseAbi([
    "error IsPaused()",
    "error Blocked(address account)",
    "error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)",
    "error ERC20InvalidReceiver(address receiver)",
    "error ERC20InvalidSender(address sender)",
  ]),
] as const;

export type Preflight = { ok: true } | { ok: false; reason: string };

export type Holding = {
  token: StockToken;
  raw: bigint;
  price: Price;
  usd: number | null; // whole balance
  preflight: Preflight;
};

export type Scan = {
  address: Address;
  checkedAt: Date;
  tokensChecked: number;
  balanceReadFailures: number;
  holdings: Holding[];
  registrySource: Registry["source"];
  registryAsOf: string;
  liveQuotes: boolean;
  preflightTo: "vault" | "self";
  gasPerSend: bigint;
  gasPrice: bigint | null;
  ethUsd: Price;
};

export function transferData(to: Address, amount: bigint) {
  return encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [to, amount] });
}

function explainRevert(e: unknown, sender: Address): string {
  if (e instanceof BaseError) {
    const reverted = e.walk((err) => err instanceof ContractFunctionRevertedError);
    if (reverted instanceof ContractFunctionRevertedError) {
      const name = reverted.data?.errorName;
      if (name === "IsPaused") return "The issuer has paused this token, so it can't be sent right now.";
      if (name === "Blocked") {
        const who = String(reverted.data?.args?.[0] ?? "").toLowerCase();
        return who === sender.toLowerCase()
          ? "The token issuer has blocked this address from sending it."
          : "The token issuer has blocked the destination address.";
      }
      if (name === "ERC20InsufficientBalance") return "The balance changed while it was being checked. Scan again.";
      if (name === "ERC20InvalidReceiver" || name === "ERC20InvalidSender") return "The token refused this sender or destination.";
    }
    if (e.walk((err) => err instanceof HttpRequestError || err instanceof TimeoutError)) {
      return "The network didn't answer the test send. Scan again in a moment.";
    }
  }
  return "The token refused a test send. It may be paused, or an address may be blocked by its issuer.";
}

// eth_call of transfer(recipient, amount) from the holder. No signature, nothing is sent.
// Before the vault exists the recipient is the holder itself, which still catches a paused
// token or a blocked sender.
async function preflight(client: PublicClient, from: Address, token: StockToken, amount: bigint): Promise<Preflight> {
  const to = VAULT.status === "set" ? VAULT.address : from;
  try {
    const { result } = await client.simulateContract({
      account: from,
      address: token.address,
      abi: stockTokenAbi,
      functionName: "transfer",
      args: [to, amount],
    });
    return result === true ? { ok: true } : { ok: false, reason: "The token reported that the test send failed." };
  } catch (e) {
    return { ok: false, reason: explainRevert(e, from) };
  }
}

async function inChunks<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return out;
}

export async function readBalances(client: PublicClient, owner: Address, tokens: StockToken[]) {
  const res = await client.multicall({
    contracts: tokens.map((t) => ({ address: t.address, abi: erc20Abi, functionName: "balanceOf" as const, args: [owner] as const })),
    allowFailure: true,
    // 195 balanceOf calls fit in one eth_call on chain 4663 (measured: one request, about 250 ms).
    batchSize: 16_384,
  });
  return tokens.map((token, i) => ({
    token,
    raw: res[i].status === "success" ? (res[i].result as bigint) : null,
  }));
}

function usdOf(raw: bigint, decimals: number, price: Price): number | null {
  if (price.usd === null) return null;
  // Float precision is fine for display and the dust rule; amounts sent stay exact bigints.
  return (Number(raw) / 10 ** decimals) * price.usd;
}

export async function scanAddress(
  client: PublicClient,
  registry: Registry,
  owner: Address,
  onProgress: (message: string) => void = () => {},
): Promise<Scan> {
  onProgress(`Reading balances for ${registry.tokens.length} Robinhood Stock Tokens.`);
  const balances = await readBalances(client, owner, registry.tokens);
  const held = balances.filter((b): b is { token: StockToken; raw: bigint } => b.raw !== null && b.raw > 0n);

  onProgress(held.length ? `Found ${held.length} with a balance. Getting prices.` : "No balances found.");
  const priced = held.length ? await priceTokens(client, held.map((h) => h.token)) : null;

  if (held.length) onProgress("Test-sending each token without sending anything, to catch paused or blocked tokens.");
  const checks = await inChunks(held, RPC_BATCH_SIZE, (h) => preflight(client, owner, h.token, h.raw));

  const holdings: Holding[] = held.map((h, i) => {
    const price = priced?.prices.get(h.token.address.toLowerCase()) ?? NO_PRICE;
    return { token: h.token, raw: h.raw, price, usd: usdOf(h.raw, h.token.decimals, price), preflight: checks[i] };
  });

  // Every Stock Token shares one implementation, so one gas estimate stands in for all of them.
  let gasPerSend = FALLBACK_GAS_PER_SEND;
  let gasPrice: bigint | null = null;
  const sample = holdings.find((h) => h.preflight.ok);
  if (sample) {
    const to = VAULT.status === "set" ? VAULT.address : owner;
    const [gas, price] = await Promise.allSettled([
      client.estimateGas({ account: owner, to: sample.token.address, data: transferData(to, sample.raw) }),
      client.getGasPrice(),
    ]);
    if (gas.status === "fulfilled" && gas.value > 0n) gasPerSend = gas.value;
    if (price.status === "fulfilled") gasPrice = price.value;
  }

  return {
    address: owner,
    checkedAt: new Date(),
    tokensChecked: registry.tokens.length,
    balanceReadFailures: balances.filter((b) => b.raw === null).length,
    holdings,
    registrySource: registry.source,
    registryAsOf: registry.asOf,
    liveQuotes: priced?.liveQuotes ?? false,
    preflightTo: VAULT.status === "set" ? "vault" : "self",
    gasPerSend,
    gasPrice,
    ethUsd: priced?.ethUsd ?? NO_PRICE,
  };
}

// Used by the review screen: re-read the chosen balances and run the test send again, so the
// plan reflects the chain as it is now, not as it was at scan time.
export async function recheckHoldings(client: PublicClient, owner: Address, picked: Holding[]): Promise<Holding[]> {
  const balances = await readBalances(client, owner, picked.map((h) => h.token));
  return inChunks(picked, RPC_BATCH_SIZE, async (h) => {
    const raw = balances.find((b) => b.token.address === h.token.address)?.raw ?? null;
    if (raw === null) return { ...h, preflight: { ok: false, reason: "Couldn't read this balance again. Scan again." } };
    if (raw === 0n) return { ...h, raw, usd: 0, preflight: { ok: false, reason: "This balance is now empty." } };
    const check = await preflight(client, owner, h.token, raw);
    return { ...h, raw, usd: usdOf(raw, h.token.decimals, h.price), preflight: check };
  });
}

export function feeWeiPerSend(scan: Scan): bigint | null {
  return scan.gasPrice === null ? null : scan.gasPerSend * scan.gasPrice;
}

export function feeUsdPerSend(scan: Scan): number | null {
  const wei = feeWeiPerSend(scan);
  if (wei === null || scan.ethUsd.usd === null) return null;
  return (Number(wei) / 1e18) * scan.ethUsd.usd;
}

export type Groups = { small: Holding[]; large: Holding[]; notCounted: (Holding & { why: string })[] };

// The dust rule from the design report: allow-listed and priced, under a ceiling the user can
// change, and worth more than the fee to send it. Anything that fails the test send is out.
export function groupHoldings(scan: Scan, smallUsd: number): Groups {
  const feeUsd = feeUsdPerSend(scan);
  const groups: Groups = { small: [], large: [], notCounted: [] };
  const byValue = [...scan.holdings].sort((a, b) => (b.usd ?? -1) - (a.usd ?? -1));
  for (const h of byValue) {
    if (!h.preflight.ok) groups.notCounted.push({ ...h, why: h.preflight.reason });
    else if (h.usd === null) groups.notCounted.push({ ...h, why: "No recent price, so its value can't be counted." });
    else if (feeUsd !== null && h.usd <= feeUsd) groups.notCounted.push({ ...h, why: "Worth less than the fee to send it." });
    else if (h.usd < smallUsd) groups.small.push(h);
    else groups.large.push(h);
  }
  return groups;
}
