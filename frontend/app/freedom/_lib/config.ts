import { getAddress, isAddress, type Address } from "viem";

// Everything the freedom machine needs to know about its environment lives here.
// NEXT_PUBLIC_* values are inlined at build time, so they must be written out literally.

export const CHAIN_ID = 4663;
export const CHAIN_NAME = "Robinhood Chain";
export const EXPLORER_URL = "https://robinhoodchain.blockscout.com";
export const PUBLIC_RPC_URL = "https://rpc.mainnet.chain.robinhood.com";
export const MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11" as const;

const alchemyKey = (process.env.NEXT_PUBLIC_ALCHEMY_KEY || "").trim();

// The public RPC is rate limited (HTTP 429 on big JSON-RPC batches), so reads go out in
// batches of about ten. An Alchemy key, if set, replaces it. Restrict that key to the site's
// domain in the Alchemy dashboard, because anything NEXT_PUBLIC ends up in the browser.
export const RPC_URL = alchemyKey
  ? `https://robinhood-mainnet.g.alchemy.com/v2/${alchemyKey}`
  : PUBLIC_RPC_URL;
export const RPC_LABEL = alchemyKey ? "Alchemy" : "Robinhood Chain public RPC";
export const RPC_BATCH_SIZE = 10;

// Robinhood's registry and price API. It sends no CORS headers today, so a browser on another
// origin cannot read it and the page falls back to the bundled copies in _data/. Point this at a
// same-origin proxy of https://api.robinhood.com to get live data.
export const RH_API_BASE = (process.env.NEXT_PUBLIC_RH_API_BASE || "https://api.robinhood.com").replace(/\/+$/, "");

// House rules, not standards. The page says so and lets people change the ceiling.
export const DEFAULT_SMALL_USD = 10;
export const PLAN_CAP = 10;
export const LAST_KNOWN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
// Used only if gas estimation fails. A standalone Stock Token transfer measured 52k to 85k gas.
export const FALLBACK_GAS_PER_SEND = 85_000n;

export type VaultConfig =
  | { status: "unset" }
  | { status: "invalid"; raw: string }
  | { status: "set"; address: Address };

function readVault(): VaultConfig {
  const raw = (process.env.NEXT_PUBLIC_VAULT_ADDRESS || "").trim();
  if (!raw) return { status: "unset" };
  // Mixed case must carry a valid EIP-55 checksum; all-lowercase is accepted as is.
  const strictOk = isAddress(raw, { strict: true });
  const lowerOk = /^0x[0-9a-f]{40}$/.test(raw);
  if (!strictOk && !lowerOk) return { status: "invalid", raw };
  const address = getAddress(raw);
  if (/^0x0{40}$/i.test(address)) return { status: "invalid", raw };
  return { status: "set", address };
}

// The raffle vault does not exist yet. While this is "unset", every send action is disabled.
export const VAULT: VaultConfig = readVault();
