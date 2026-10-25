import { erc20Abi, parseAbiItem, parseEventLogs, type Address, type Hash, type PublicClient } from "viem";
import { sameAddress } from "./address";
import type { Registry, StockToken } from "./registry";

// Read-only checks for the no-connect door, standing in for the indexer's status API until it
// exists. Only Transfer logs emitted by allow-listed token contracts count: any contract can emit
// a convincing Transfer event without moving anything.

const transferEvent = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");

// Chain 4663 makes roughly ten blocks a second, so this looks back a little over a day.
const LOOKBACK_BLOCKS = 1_000_000n;

export type Arrival = { token: StockToken; amount: bigint; hash: Hash };

export async function findRecentSends(
  client: PublicClient,
  token: StockToken,
  from: Address,
  vault: Address,
): Promise<Arrival[]> {
  const latest = await client.getBlockNumber();
  const logs = await client.getLogs({
    address: token.address,
    event: transferEvent,
    args: { from, to: vault },
    fromBlock: latest > LOOKBACK_BLOCKS ? latest - LOOKBACK_BLOCKS : 0n,
    toBlock: latest,
  });
  return logs.map((l) => ({ token, amount: l.args.value ?? 0n, hash: l.transactionHash }));
}

export async function checkTransaction(
  client: PublicClient,
  registry: Registry,
  hash: Hash,
  from: Address,
  vault: Address,
): Promise<{ found: boolean; status: "success" | "reverted"; arrivals: Arrival[]; otherSender: boolean }> {
  const receipt = await client.getTransactionReceipt({ hash });
  const tokens = new Map(registry.tokens.map((t) => [t.address.toLowerCase(), t]));
  const logs = parseEventLogs({ abi: erc20Abi, eventName: "Transfer", logs: receipt.logs, strict: true });
  const toVault = logs.filter((l) => tokens.has(l.address.toLowerCase()) && sameAddress(l.args.to, vault));
  const arrivals = toVault
    .filter((l) => sameAddress(l.args.from, from))
    .map((l) => ({ token: tokens.get(l.address.toLowerCase())!, amount: l.args.value, hash }));
  return {
    found: true,
    status: receipt.status,
    arrivals,
    otherSender: toVault.length > arrivals.length,
  };
}
