# /freedom: the freedom machine (prototype)

**Status: prototype for review. Not linked from any page, not deployed, and the raffle vault does
not exist, so every send action is switched off.** Nothing in this folder deploys a contract or
sends a transaction. Please don't merge it until Hampus and MJ1804 have decided whether the dust
raffle is going ahead: README.md and Liberty.MD call that direction abandoned, SPEC.md still
describes it as live.

## What it is

A page that looks at a wallet's Robinhood Stock Token balances on Robinhood Chain (ID 4663), picks
out the small ones, and helps the person send the ones they choose to the raffle vault. Each send is
an ordinary ERC-20 `transfer(vault, amount)` that the person approves in their own wallet. The app
never asks for approvals, permits, Permit2 signatures or EIP-7702 account upgrades, because those
are exactly what wallet drainers use, and a "send us your dust" page that asked for them would look
like one.

The look follows the live site in `site/` ("Climb to the Torch"): its colour tokens, Fraunces,
Bricolage Grotesque and DM Mono, the crown-and-flame mark, the granite pedestal band and the
copper-ringed plaque. `public/freedom/` holds the two site assets it reuses (vault art and favicon).

## Run it

```bash
cd frontend
npm install
npm run dev
```

Then open http://localhost:3000/freedom. Paste any Robinhood Chain address under "Check an address"
to see a real, read-only scan of mainnet. `npm run build` produces the static export as usual.

## How it works, step by step

The person picks one of two doors. Both use the same scan; only the sending differs.

### 1. The scan (both doors)

1. **Allow-list.** `_lib/registry.ts` loads Robinhood's Stock Token registry (`/rhj/assets`), keyed
   by contract address. Symbols are only labels: the issuer can rename tokens and anyone can deploy
   a fake "AAPL". If the live list can't be read (see CORS below), it uses the bundled copy in
   `_data/registry.json` (195 tokens).
2. **Balances.** `_lib/scan.ts` reads `balanceOf` for all 195 tokens in one Multicall3 call
   (`0xcA11bde05977b3631167028862bE2a173976CA11`). That takes about a quarter of a second on the
   public RPC. No wallet and no signature are involved.
3. **Prices.** `_lib/prices.ts` prices only the tokens that have a balance. Chainlink comes first:
   32 Stock Tokens have a "Robinhood <SYM> / USD" feed on chain 4663, and the feed price already
   includes the token's multiplier. Otherwise it uses Robinhood's bid for the share times the
   registry multiplier. Every price is in one of three states: fresh, last known (market closed,
   trading halted, or a saved copy) or unavailable.
4. **Test send.** For every token with a balance it runs `eth_call` of `transfer(...)` from the
   scanned address. Nothing is sent, but a paused token or a blocked address fails here instead of
   in the person's wallet. Until the vault exists the test sends to the address itself.
5. **Fee.** One `estimateGas` times the gas price, converted with Chainlink's ETH / USD feed.
   Roughly 0.0000015 ETH (well under a cent) per send in October 2026.
6. **Groups.** `groupHoldings()` sorts the results into:
   - **Small balances that count**: priced, test send passed, worth more than the fee and less than
     the ceiling ($10 by default, which the person can change on the page).
   - **Larger holdings**: worth the ceiling or more. Never selected for the person.
   - **Not counted right now**: test send failed, no recent price, or worth less than the fee to
     send. Each row says why.

Nothing is ticked by default. "Select all small balances" picks the ten most valuable small ones,
because a plan holds at most ten tokens.

### 2a. Door one: Check an address (no wallet connection)

- The address field checks the EIP-55 checksum and gives a specific error for a typo. This door
  never loads a wallet library.
- After choosing tokens, the person gets one card per token ("Token 2 of 4"), because a link or QR
  code can only carry one transfer. Each card offers a MetaMask link
  (`https://link.metamask.io/send/<token>@4663/transfer?address=<vault>&uint256=<raw amount>`), an
  EIP-681 QR code with the same content, and copy buttons for the network, vault, token contract and
  amount.
- Two warnings sit next to the details they protect. **Send from the address you checked, never
  from an exchange**: entries and any prize belong to whichever address the tokens arrive from.
  **Don't copy the vault address from your wallet history**: address-poisoning scams send tiny
  amounts from look-alike addresses, and a dust raffle is the perfect bait.
- "Check for my send" and the transaction-hash box read `Transfer` logs from the chain to show
  whether a send arrived. They stand in for the indexer that doesn't exist yet.

### 2b. Door two: Connect a wallet

- wagmi only loads when this door is picked. Connecting requests the account address and nothing
  else, and the page never reconnects a wallet on its own.
- If the wallet is on another network, a "Switch to Robinhood Chain" button asks it to switch. That
  only happens on the click.
- **Review.** The chosen balances are read again and test-sent again; anything that now fails is
  dropped with the reason. The review slip shows every send in full: token, contract, exact amount,
  the decoded call `transfer(to: vault, amount: ...)` with its raw data, the full vault address,
  the total value, the total fee and "Sent tokens can't be returned".
- **Send.** The one button ("Send 4 tokens, confirm each in your wallet") starts one wallet prompt
  per token, in order. Rejecting a prompt sends nothing and pauses, with Try again, Skip it and
  continue, or Stop here. Any token still waiting can be skipped. The run stops by itself if the
  wallet disconnects, switches account or leaves Robinhood Chain.
- **One confirmation (optional).** Only when the wallet's `wallet_getCapabilities` reports atomic
  batching as `"supported"` for chain 4663 does a second button offer a single `wallet_sendCalls`
  batch. A wallet that reports `"ready"` would need an account upgrade first, so it is never offered.

### 3. What stops a bad send

- `_lib/send.ts` rebuilds every call right before the wallet prompt and decodes it again: it must be
  `transfer` (selector `0xa9059cbb`) to the configured vault, for the reviewed amount, with no ETH,
  on a token in the allow-list. Anything else throws and nothing is sent.
- The scanner only ever calls Multicall3, allow-listed Stock Tokens and the pinned Chainlink feeds.
  Each feed must still return the `description()` string it was pinned with, or it is ignored.
- With no vault configured, the send buttons, MetaMask links, QR codes and vault copy buttons are
  all switched off, and the page says "Vault not deployed yet".

## Files

| Path | What it does |
|---|---|
| `page.tsx` | Route entry: metadata, fonts, renders `FreedomApp` |
| `freedom.module.css` | All styles, scoped to this route |
| `_components/FreedomApp.tsx` | Header, pedestal hero, vault plaque, the two doors, footer |
| `_components/ScanPanel.tsx` | Runs the scan and shows the three groups and the selection bar |
| `_components/CheckDoor.tsx`, `NoConnectPlan.tsx`, `QrCode.tsx` | The no-connect door |
| `_components/ConnectDoor.tsx`, `ReviewSends.tsx`, `SendRunner.tsx` | The connected door (wagmi lives only here) |
| `_components/VaultBlock.tsx`, `ui.tsx` | Vault address and warning, live region, small shared pieces |
| `_lib/config.ts` | Chain facts, RPC, house rules (ceiling, plan cap) and the vault setting |
| `_lib/chain.ts` | viem chain definition for 4663 with Multicall3 |
| `_lib/registry.ts`, `prices.ts`, `scan.ts` | Allow-list, prices and the scan |
| `_lib/send.ts`, `links.ts`, `arrivals.ts`, `address.ts`, `format.ts` | Send guard, MetaMask and EIP-681 links, arrival checks, address check, formatting |
| `_data/*.json` | Bundled registry, saved quotes and pinned Chainlink feeds |
| `../../scripts/refresh-freedom-data.mjs` | Regenerates `_data/` (`npm run freedom:data`) |

## Configuration (all optional, set at build time)

| Variable | Effect |
|---|---|
| `NEXT_PUBLIC_VAULT_ADDRESS` | The raffle vault. Unset means every send action is off. Mixed case must be a valid EIP-55 checksum. |
| `NEXT_PUBLIC_ALCHEMY_KEY` | Uses Alchemy instead of the rate-limited public RPC. Restrict the key to the site's domain, since it ends up in the browser. |
| `NEXT_PUBLIC_RH_API_BASE` | Base URL for Robinhood's `/rhj/assets` and `/rhj/prices`. See CORS below. |

## Data refresh and CORS

Refresh the bundled data with `npm run freedom:data` (or `npm run freedom:data -- --csv <file>` to
build the registry from a CSV export) and read the diff before committing: the registry is the
allow-list, so a new or renamed token should be a conscious change.

`api.robinhood.com` sends no `Access-Control-Allow-Origin` header, so a browser can't read the live
registry or quotes and the page uses the bundled copies (it says so under "How this was checked").
Because the app uses `output: "export"`, Next rewrites are not available; live data needs a
same-origin proxy, for example a Vercel rewrite of `/rh/:path*` to `https://api.robinhood.com/:path*`
with `NEXT_PUBLIC_RH_API_BASE=/rh`. The Chainlink directory and the chain RPC both allow CORS.

## Testing without a real wallet

The connected door was tested with a fake EIP-6963 wallet pasted into the browser console before
picking the door. It answers account and chain reads, logs every request, and rejects every send
with error 4001, so nothing can reach the chain:

```js
(() => {
  const addr = "0x...any address with Stock Tokens...";
  window.__mockLog = [];
  const provider = {
    request: async ({ method, params }) => {
      window.__mockLog.push({ method, params });
      if (method === "eth_requestAccounts" || method === "eth_accounts") return [addr];
      if (method === "eth_chainId") return "0x1237";
      if (method === "wallet_getCapabilities") return {};
      if (method === "wallet_requestPermissions") return [{ parentCapability: "eth_accounts" }];
      throw Object.assign(new Error("Rejected by the test wallet"), { code: 4001 });
    },
    on() {},
    removeListener() {},
  };
  const info = { uuid: "00000000-0000-4000-8000-000000000000", name: "Test wallet", icon: "data:,", rdns: "test.wallet" };
  const announce = () => window.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail: Object.freeze({ info, provider }) }));
  window.addEventListener("eip6963:requestProvider", announce);
  announce();
})();
```

To see the send screens switched on, put a dummy vault in an untracked `frontend/.env.development.local`
(`NEXT_PUBLIC_VAULT_ADDRESS=0x000000000000000000000000000000000000dEaD`), restart `npm run dev`, and
delete the file afterwards. Use only the test wallet above with it.

## Still open

- No indexer or status API yet, so nothing credits entries. The read-only arrival checks are a stand-in.
- No vault contract. The report recommends receive-only, pull-based prize claims per token, and
  admin functions behind a multisig with a timelock.
- No L2 sequencer uptime check, and US market holidays are not modelled in the price states.
- No WalletConnect (it needs a project ID). Phones without a wallet browser get an "Open this page
  in MetaMask" link.
- Never tried with a real wallet on chain 4663: QR parsing, deep links and `getCapabilities` need
  device testing (Robinhood Wallet first, then MetaMask, Rabby and others).
- The entry rule (dollars to entries) isn't decided, so the page shows value, not entries.
- Legal questions flagged in the research (Stock Tokens can't go to US persons, lottery law,
  Robinhood's brand terms) need an answer before any real deposits.
