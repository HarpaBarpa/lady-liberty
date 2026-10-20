# /freedom: the freedom machine (prototype)

A page that finds a wallet's small Robinhood Stock Token balances on Robinhood Chain (ID 4663)
and lets the person send the ones they choose to the raffle vault. It follows the design in
"Dust detection and one click sweep" (plain ERC-20 transfers only, Robinhood's registry as the
allow-list, one Multicall3 scan, two doors).

The look follows the live site in `site/` ("Climb to the Torch"): its tokens, Fraunces, Bricolage
Grotesque and DM Mono, the crown-and-flame mark, the granite pedestal band and the copper-ringed
plaque. `public/freedom/` holds the two site assets it reuses (vault art and favicon).

The vault does not exist yet, so every send action is disabled and the page says
"Vault not deployed yet". Nothing in this folder deploys a contract or sends a transaction.

## Two doors

- **Check an address** (no wallet library loads). Paste an address, see the scan, then send each
  token from your own wallet: a MetaMask link, an EIP-681 QR code, or copy buttons for every field.
  Exchange and address-poisoning warnings sit next to the details they protect.
- **Connect a wallet** (wagmi is code-split and only loads on this door). Connecting requests
  accounts only. Network switching happens only on a click. The review screen re-reads balances,
  re-runs the test send and shows each decoded `transfer(vault, amount)`, the full vault address,
  totals, the fee and "Sent tokens can't be returned". After the final click, each token gets its
  own `eth_sendTransaction` prompt with Skip and Stop. `wallet_sendCalls` is offered only when
  `wallet_getCapabilities` reports `atomic.status === "supported"` for 4663, never for `ready`.

## What the code guarantees

- The only call ever sent to a wallet is `transfer(vault, amount)` (selector `0xa9059cbb`, no ETH)
  on an allow-listed token. `_lib/send.ts` rebuilds and decodes every call right before the prompt.
  There is no approve, permit, Permit2, signature or EIP-7702 code path.
- The scanner only calls Multicall3, allow-listed Stock Tokens and pinned Chainlink feeds
  (each feed's `description()` must match the pinned string). Look-alike tokens are never read.
- Nothing is pre-ticked. "Select all small balances" never includes larger holdings. A plan holds
  at most 10 tokens.
- No wallet is touched before the person presses Connect (`reconnectOnMount` is off), and a run
  stops if the wallet disconnects, changes account or changes network.

## Configuration (all optional, set at build time)

| Variable | Effect |
|---|---|
| `NEXT_PUBLIC_VAULT_ADDRESS` | The raffle vault. Unset means every send action is disabled. Mixed case must be a valid EIP-55 checksum. |
| `NEXT_PUBLIC_ALCHEMY_KEY` | Uses Alchemy instead of the rate-limited public RPC. Restrict the key to the site's domain, since it ends up in the browser. |
| `NEXT_PUBLIC_RH_API_BASE` | Base URL for Robinhood's `/rhj/assets` and `/rhj/prices`. See the CORS note below. |

## Data and prices

`_data/` holds the bundled fallbacks: `registry.json` (195 tokens, built from the 2026-10-20 CSV
export of `/rhj/assets`), `prices.json` (a `/rhj/prices` snapshot) and `feeds.json` (32 Chainlink
"Robinhood <SYM> / USD" feeds plus ETH / USD, pinned with their on-chain descriptions). Refresh with
`npm run freedom:data` (or `npm run freedom:data -- --csv <file>` for the registry) and review the
diff, because the registry is the allow-list.

Prices have three states: fresh, last known (market closed, halted, or saved earlier) and
unavailable. Chainlink comes first; otherwise the Robinhood bid times the token's multiplier.
Saved prices older than seven days count as unavailable.

**CORS:** `api.robinhood.com` sends no `Access-Control-Allow-Origin` header today, so from the
browser the live registry and quotes fail and the page uses the bundled copies (it says so under
"How this was checked"). `output: "export"` rules out Next rewrites, so live data needs a
same-origin proxy (for example a Vercel rewrite of `/rh/:path*` to `https://api.robinhood.com/:path*`)
with `NEXT_PUBLIC_RH_API_BASE` pointing at it. The Chainlink directory and the chain RPC do allow CORS.

## Still open

- No indexer or status API yet. "Check for my send" and the transaction-hash checker read
  allow-listed `Transfer` logs directly from the chain as a stand-in.
- No L2 sequencer uptime check, and US market holidays are not modelled in the price states.
- No WalletConnect (needs a project ID). Phones without an injected wallet get an
  "Open this page in MetaMask" link.
- Real-wallet behaviour on chain 4663 (QR parsing, deep links, `getCapabilities`) still needs the
  device test matrix from the report. The connected flow was exercised with a mock EIP-6963
  wallet that rejects every send, never with a real wallet.
- The entry rule (dollars to entries) is not decided, so the page shows value, not entries.
