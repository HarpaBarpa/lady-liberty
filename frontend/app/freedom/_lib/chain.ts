import { createPublicClient, defineChain, http, type PublicClient } from "viem";
import {
  CHAIN_ID,
  CHAIN_NAME,
  EXPLORER_URL,
  MULTICALL3,
  PUBLIC_RPC_URL,
  RPC_BATCH_SIZE,
  RPC_URL,
} from "./config";

// Robinhood Chain mainnet. viem needs the Multicall3 address in the chain definition,
// otherwise client.multicall throws ChainDoesNotSupportContract.
export const robinhood = defineChain({
  id: CHAIN_ID,
  name: CHAIN_NAME,
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [PUBLIC_RPC_URL] } },
  blockExplorers: { default: { name: "Blockscout", url: EXPLORER_URL } },
  contracts: { multicall3: { address: MULTICALL3 } },
});

export function rpcTransport() {
  // JSON-RPC batches of about ten; viem retries 429 responses with backoff.
  return http(RPC_URL, { batch: { batchSize: RPC_BATCH_SIZE, wait: 16 }, retryCount: 4, retryDelay: 500 });
}

let client: PublicClient | null = null;

export function publicClient(): PublicClient {
  if (!client) client = createPublicClient({ chain: robinhood, transport: rpcTransport() }) as PublicClient;
  return client;
}

export const explorer = {
  address: (a: string) => `${EXPLORER_URL}/address/${a}`,
  token: (a: string) => `${EXPLORER_URL}/token/${a}`,
  tx: (h: string) => `${EXPLORER_URL}/tx/${h}`,
};
