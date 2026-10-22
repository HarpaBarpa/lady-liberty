# LibertyTorch — Project Spec
**Last updated:** 2026-10-22
**Version:** 2.3

---

## What It Is

LibertyTorch is a **decentralized multi-asset raffle protocol** deployed on Robinhood Chain (chainId: 4663). The protocol accepts any ERC-20 token as dust deposits, prices each one independently via Chainlink, and runs an hourly weighted raffle. Holding ≥$10 in $LIBERTY earns a base entry. Linking secondary wallets and depositing dust earns bonus entries.

**The Liberty Bell:** A separate jackpot that grows at 4% of every successful draw, triggering independently at 1-in-72 odds per eligible hourly check. Any registered holder has a shot at the bell — same cooldown, same eligible pool, separate prize.

**Brand:** Lady Liberty — the Statue of Liberty as a friendly anime character, torch raised high, mint green flame (#6EE786). She stands for the underdog, the leftover, the dust.

---

## Architecture

```
Torch Launchpad   →   $LIBERTY token (ERC-20)
                           │
                           ├── LinkRegistry (wallet linking)
                           ├── LibertyVault (dust deposits, per-token pricing)
                           └── LibertyRaffle (hourly draw + Liberty Bell jackpot)
```

**Smart contracts:**

| Contract | File | Purpose |
|---|---|---|
| LinkRegistry | `LinkRegistry.sol` | EIP-712 wallet linking (primary ↔ secondary, max 5) |
| LibertyVault | `LibertyVault.sol` | Dust deposits, per-token Chainlink feeds, entry calculation |
| LibertyRaffle | `LibertyRaffle.sol` | Hourly draw + Liberty Bell jackpot + prize distribution |
| RWAFFLE | `RWAFFLE.sol` | Legacy contract — not in active use; superseded by LibertyVault + LibertyRaffle |

**Frontend:** Single-page site at `libertytorch.online` — live on-chain data via `contracts.js` reads directly from deployed contracts. Browser wallet (Rabby/Metamask) required to connect.

**Legal:** `site/legal/tos.html` (Terms of Service) and `site/legal/privacy.html` (Privacy Policy) — both compliant with New York State and U.S. federal law (CCPA, NY SHIELD Act, AAA arbitration in New York County).

---

## Smart Contracts

### LinkRegistry
- **Constructor:** none (Ownable, no args)
- **Linking:** Primary calls `linkWallet(primary, secondary, timestamp, sig)` — secondary signs EIP-712 `LinkRequest` via `signTypedData`. Nonce replay protection.
- **Limits:** Max 5 secondary wallets per primary.
- **Removal:** Primary can `unlinkWallet(primary, secondary)` at any time.
- **Views:** `isLinkedTo(primary, secondary)`, `getLinkedWallets(primary)`, `getLinkNonce(primary)`

### LibertyVault
- **Constructor:** `(linkRegistry, libertyToken, protocolFeeRecipient)`
- **Dust deposit path 1 — `depositDust`:** Secondary calls `depositDust(primary, dustToken, amount)` — tokens pulled into vault, 2% fee deducted, entries credited to primary. **Secondary must be linked to primary in LinkRegistry (strict enforcement).**
- **Dust deposit path 2 — `notifyDeposit`:** For integrations that can't use `depositDust` directly (e.g., the freedom machine). User sends a plain ERC-20 `transfer()` to the vault, then calls `notifyDeposit(primary, dustToken)` to claim entries. 1% anti-spam fee (half the normal rate — user already paid gas). Checkpoint tracking prevents double-counting. Caller is bound to `primary` via LinkRegistry.
- **Entry math:**
  - `entries_W = min(floor(usdCents(W) / 50), 5)` per linked wallet per cycle
  - `totalEntries(primary) = 1 (base) + Σ entries_W`
  - Max 26 entries per primary per cycle (1 base + 5 wallets × 5 entries)
- **Per-token price feeds:** Each supported token has its own Chainlink/USD feed. `address(0)` = $1.00 fallback.
  - `addSupportedToken(token, feed)` — add token + feed
  - `setTokenFeed(token, feed)` — update feed
  - `getTokenFeed(token)` — read feed
  - Price math: `cents = (amount × latestAnswer) / 10^(decimals + 6)`
- **Admin:** `addSupportedToken`, `removeSupportedToken`, `setTokenFeed`, `withdrawToken`
- **Cycle:** 1 hour (CYCLE_DURATION = 3600s). Entries reset each cycle.

### LibertyRaffle
- **Constructor:** `(vault, linkRegistry, libertyToken, ethUsdFeed)`
- **Registration:** `registerAccount(wallet)` / `registerAccounts([...])` — owner only. Base entry (1 per wallet) requires $LIBERTY ≥ $10 at time of registration.
- **Draw:** `checkAndDraw()` — anyone can call. Fires when:
  - `block.timestamp ≥ lastDrawTime + drawInterval`
  - `prizePoolCents ≥ minPoolCents` ($50)
  - ≥ 1 eligible account
  - Not paused
  - Pool below floor → skips, rolls over funds
  - **On success:** 4% of pool → Liberty Bell jackpot. Remainder distributed to winners.
- **Weighted selection:** Each registered account has 1 + vault dust entries. 10 unique winners drawn by weighted random. Winner + all linked wallets enter 24h cooldown.
- **Payout draft (96% of pool):** [35%, 20%, 12%, 8%, 6%, 5%, 4%, 3%, 2%, 1%]
- **Prize:** Paid in ETH (or any ERC-20 via `claimPrize`). If ETH_USD_FEED is `address(0)`, $1/ETH fallback.
- **Funding:** ETH via `receive()` or `fundPrizePoolETH()`. ERC-20 via `fundPrizePoolERC20`.
- **Admin:** `setMinPoolCents`, `setDrawInterval`, `pause/unpause`, `sweepToken` (ERC-20 only, blocks ETH).

### Liberty Bell Jackpot
- **Trigger:** `checkJackpot()` — anyone can call. Fires independently at each eligible hourly window:
  - `block.timestamp ≥ lastJackpotCheckTime + drawInterval`
  - `jackpotPoolCents ≥ MIN_JACKPOT_CENTS` ($50)
  - ≥ 1 eligible account not in cooldown
  - Not paused
  - No existing winner pending claim
- **Odds:** Fixed 1-in-72 independent probability per check (not influenced by participant count). Uses `uint256(keccak256(block.prevrandao, block.timestamp, block.number, jackpotPoolCents, jackpotId)) % 72`.
- **Jackpot pool:** Receives 4% of every successful draw's prize pool (`JACKPOT_CONTRIBUTION_BPS = 400`). Resets to 0 when triggered, accumulates otherwise.
- **Winner selection:** Weighted random from eligible accounts (same weighting as regular raffle: 1 base + dust entries).
- **Prize:** Paid in ETH or ERC-20 via `claimJackpotPrize(token)`. Subject to shared 24h cooldown.
- **Cooldown:** Shared with regular raffle — winner + all linked wallets blocked from both the next draw AND the next jackpot check for 24 hours.
- **State:** `jackpotPoolCents`, `jackpotTriggered`, `jackpotWinner`, `jackpotId`, `lastJackpotCheckTime`

---

## Deployment

**Deploy order:**
1. LinkRegistry (no constructor args)
2. LibertyVault (3 args)
3. LibertyRaffle (4 args)
4. Post-deploy: `vault.addSupportedToken(token, feed)` for each dust token

**Deploy script:** `code/scripts/deploy.ts`
```bash
cd code
LIBERTY_TOKEN=0x... \
PROTOCOL_FEE_RECIPIENT=0x... \
ETH_USD_FEED=0x... \
npx hardhat run scripts/deploy.ts --network robinhood
```

**Deployer address:** `0x5F5E4ca54956D8Bd8Ad224835adD0A2bb0B6A438` (key in Vault as "New Deployer Wallet Key")
**Deployer balance:** ~0.054 ETH (Oct 22, 2026)

**Pre-deploy checklist:** See `SCRIPTS.md` — full staged runbook for post-token-deploy steps including Fly.io secrets, site config update, pool seeding, and health check.

---

## Watcher & Keeper Architecture

A self-hosted Node.js watcher (`code/watcher/watcher.ts`) runs alongside the contracts. It does NOT use any third-party indexing service.

### Three jobs

1. **Holder watcher** — monitors `Transfer` events on the $LIBERTY token via direct RPC polling. When a wallet's balance crosses the threshold (≥1000 $LIBERTY), it calls `raffle.registerAccount()`. When it drops, it calls `raffle.deregisterAccount()`. Runs a full rescan of all known holders every 5 minutes to correct any drift.
2. **Draw keeper** — calls `raffle.checkAndDraw()` at each eligible hourly window. `checkAndDraw()` is permissionless (anyone can call it), but the watcher ensures it fires reliably.
3. **Jackpot keeper** — calls `raffle.checkJackpot()` at each eligible hourly window. Same independence as the draw keeper — fires regardless of whether the regular draw has fired.

### Persistent state (survives restarts)

- `watcher-state.json`: last processed block, known holder registry, last draw/jackpot times
- `watcher-dedup.json`: set of `txHash-logIndex` keys (no double-processing)
- On restart, the watcher catches up from `lastProcessedBlock` → current block, then runs a full rescan of all tracked holders

### Fly.io deployment

- **App name:** `libertytorch-watcher`
- **Region:** ewr (Newark, NJ)
- **Machines:** 2 (shared-cpu-1x, 256MB RAM, ~$2.19/mo)
- **Status:** Deployed, running. Awaiting `LIBERTY_TOKEN`, `RAFFLE_ADDR`, `WATCHER_KEY` secrets (injected after contract deployment).
- **Pre-set secrets:** `ROBINHOOD_RPC`, `CHAIN_ID`

### Security model

| Concern | How it's handled |
|---|---|
| Fake deposits → entries | Impossible. The vault only credits entries when actual tokens are transferred in. |
| Wallet attribution | `depositDust(primary, token, amount)` requires `primary` hint to match an EIP-712-signed link in LinkRegistry. Wrong hint → revert. |
| `notifyDeposit` double-counting | Checkpoint tracking (`_depositCheckpoint`) advances on every call — only fresh token arrivals count. |
| Compromised watcher key | Worst case: registers ineligible wallets for 1 base entry each. Cannot create dust entries (those are on-chain). Cannot bypass cooldown. Cannot drain the prize pool. |
| Double-crediting deposits | On-chain: contributions are per-cycle; entries recomputed fresh each cycle. Off-chain: dedup by txHash-logIndex. |
| Entry cap bypass | Vault enforces max 5 entries per linked wallet per cycle and max 25% of total entries per draw on-chain. |
| Missed blocks during downtime | Watcher catches up from `lastProcessedBlock` on restart, rescans all known holders, and will never double-process (dedup keys). |

---

## Known Limitations

1. **Holder registration requires watcher process** — the raffle cannot read $LIBERTY balances on-chain from other wallets. Until a $LIBERTY/USD feed exists or the token is integrated into the vault, an off-chain process must call `registerAccount()` / `deregisterAccount()`. The watcher handles this, but it must run continuously.
2. **Draw randomness:** Uses `keccak256(block.prevrandao, block.timestamp, block.number, poolCents, raffleId)` — pseudorandom, not provably fair. Acceptable for community raffle; not suitable for high-stakes applications. Upgrade path: Chainlink VRF if/when available on Robinhood Chain.
3. **ETH/USD feed unavailable on Robinhood Chain:** No Chainlink ETH/USD feed address has been confirmed on Robinhood Chain. Deploy with `ETH_USD_FEED = address(0)` for $1/ETH fallback. Prize pool thresholds and payouts will be in non-USD terms until a real feed is available.
4. **$LIBERTY/USD price unavailable on-chain** — the watcher uses a token-count threshold (≥1000 $LIBERTY ≈ ≥$10 at launch prices). A proper USD-denominated check needs either a Chainlink $LIBERTY/USD feed or a DEX TWAP oracle.

---

## Environment Variables

| Variable | Description |
|---|---|
| `ROBINHOOD_RPC` | RPC URL: `https://rpc.mainnet.chain.robinhood.com` |
| `CHAIN_ID` | 4663 |
| `LIBERTY_TOKEN` | $LIBERTY token address (from Torch Launchpad — not yet deployed) |
| `TORCH_DEPLOYER_KEY` | Deployer private key — **`.env` only**, `.gitignore`d, never committed |
| `ETH_USD_FEED` | Chainlink ETH/USD feed (optional, default: `address(0)` = $1 fallback) |

**Security model:** `hardhat.config.ts` imports `dotenv/config` and auto-loads `.env`. The deployer key is never in source code, never in Git history (scrubbed Oct 22, 2026), and never pushed to GitHub. All scripts read from `process.env` or `ethers.getSigners()`.

---

## File Structure

```
code/
  contracts/
    LinkRegistry.sol     — wallet linking (EIP-712)
    LibertyVault.sol     — dust deposits + per-token feeds + notifyDeposit
    LibertyRaffle.sol    — hourly draw + Liberty Bell jackpot + prize distribution
    MockERC20.sol       — test mock
    RWAFFLE.sol         — legacy, not in active use
  scripts/
    deploy.ts           — deploy all 3 contracts
    check.ts            — health check (read-only, env vars + on-chain)
    fund-pool.ts        — seed prize pool with ETH
    draw.ts             — manually trigger a draw
    register-holders.ts  — pre-register known eligible wallets
  test/
    LibertyRaffle.test.ts — 35 passing tests
  watcher/
    watcher.ts          — production watcher/keeper (3 jobs)
    Dockerfile          — container image for hosting
  hardhat.config.ts     — dotenv auto-loads .env
  .env                  — TORCH_DEPLOYER_KEY, ROBINHOOD_RPC, CHAIN_ID (.gitignore)
  .gitignore            — .env*, node_modules/, artifacts/, cache/

site/
  index.html            — main landing page
  deploy.html           — browser-based contract deployer (gate disabled)
  legal/
    tos.html            — Terms of Service (NY/US law, AAA arbitration)
    privacy.html        — Privacy Policy (CCPA, NY SHIELD Act compliant)
  js/
    config.js           — product parameters + contract addresses
    contracts.js        — live chain data layer (ethers.js v6)
    app.js              — page UI, live data wiring
    wallet.js           — wallet linking ledger
    rules.js            — arithmetic utilities
  css/styles.css

frontend/
  app/
    whitepaper/
      page.tsx          — Next.js whitepaper (v1.2, synced to spec)
  public/
    whitepaper/
      index.html        — static whitepaper

SCRIPTS.md              — staged post-deploy runbook (Fly.io, pool seeding, etc.)
LAUNCH_RUNBOOK.md       — original launch checklist
TOKENOMICS.md           — tokenomics reference
```

---

## v2.3 Changes (Oct 22, 2026)

- **Torch tap target repositioned** (`site/css/styles.css`, commit `46b1073`): Changed from `left: 12%; top: 0.5%; width: 15%` to `right: 10%; top: 2%; width: 28%`. Original coordinates placed the tap zone in the upper-left of the hero image, well away from the Lady Liberty flame which sits in the upper-right of the illustration. New positioning uses `right`-anchored coordinates to provide a wide, generous hit zone covering the flame area across all viewport sizes.
- **`deployPassword` removed** from `site/js/config.js` and `site/deploy.html`. Access gate in `deploy.html` set to `DISABLE_GATE = true`. No credential fields remain in client-side JavaScript.
- **Legal pages added:**
  - `site/legal/tos.html` — Terms of Service, NY State/USA governing law, AAA arbitration in New York County, smart contract risk disclosures, full disclaimer of warranties and limitation of liability
  - `site/legal/privacy.html` — Privacy Policy, zero-data-collection architecture, no cookies/analytics, CCPA rights, NY SHIELD Act compliance
  - Both linked in `site/index.html` footer
- **Whitepaper v1.2 synced to spec:** 3 winners → 10 winners, 50/30/20 split → 35/20/12/8/6/5/4/3/2/1, Liberty Bell section added, ≥$10 eligibility, 24h cooldown, min pool $50, oracle pricing, risk section expanded. Footer legal links added.
- **Git history scrubbed (Oct 22, 2026):** Compromised private key `0x55805...` replaced with `REDACTED_COMPROMISED_KEY` across all 72 rewritten commits. GitHub PAT also confirmed absent from rewritten history. Force-pushed to `github.com/HarpaBarpa/lady-liberty`.
- **`SCRIPTS.md` added:** Staged runbook for all post-deploy steps — Fly.io secrets, contract deployment, site config update, prize pool seeding with threshold guidance, holder registration, health check, Chainlink feed note.
- **`frontend/app/whitepaper/page.tsx`:** Now reflects Liberty Bell, correct raffle mechanics, updated tokenomics, and legal links.

## v2.2 Changes (Oct 22, 2026 — earlier this session)

- **New deployer wallet:** `0x5F5E4ca54956D8Bd8Ad224835adD0A2bb0B6A438` (key in Vault as "New Deployer Wallet Key", funded ~0.054 ETH)
- **Key security hardened:** `.env` is `.gitignore`d, `dotenv` loads it automatically, key never touches source code
- **`notifyDeposit()` added to LibertyVault:** alternative deposit path for the freedom machine frontend — users send plain `transfer()` then call `notifyDeposit()` to claim entries. 1% anti-spam fee, checkpoint-tracking prevents double-counting, LinkRegistry validates ownership
- **`check.ts` fixed:** no longer hardcodes any private key
- **Fly.io watcher deployed:** 2 machines at `libertytorch-watcher.fly.dev`, secrets ready (needs LIBERTY_TOKEN/RAFFLE_ADDR/WATCHER_KEY after deploy)
- **Freedom machine prototype reviewed** (`claude/eloquent-newton-b68b18`): scan, preflight, send guard architecture accepted; `notifyDeposit()` bridges it with the vault
- **Buy tax revised to 3% (50/50 Burn/Creator):** Torch 1.00% / Buyback & Burn 1.00% / Raffle 0.85% / Dev+Marketing 0.15%. Torch Launchpad only allows a burn/creator split at contract level, so the 0.85% + 0.15% route through the Creator allocation and are split manually post-launch.
- **Torch tap bug fixed:** `.torch-spot` hotspot and `.quip` bubble had no `z-index`, so they rendered behind the hero artwork on some viewports — the tap "did nothing". Added `z-index` and removed the masking `overflow: hidden` that clipped the quip bubble.

## Security Incident — Oct 21, 2026 (On Record)

On October 21, 2026, the previous deployer private key (`0x5580599790c417a85a378e5391b2ae60f0ee7e06cbbcda9cbd59de6b7f5a7967`) was inadvertently exposed in a GitHub commit (`79434db`) and used to drain the associated wallet of ~3,147,750 ODDS + 0.00009204 ETH within 67 seconds. The incident was reported to Ampere support.

**Remediation taken:**
- Key rotated immediately — new wallet funded and key stored in Vault
- `check.ts` rewritten to read from `process.env` only
- `.env` / `.gitignore` / `dotenv` security model implemented
- Git history scrubbed (Oct 22, 2026) — scrubbed commits: `79434db`, `fb4d034`, `59fbfec`, `9f718a5`
- Old LinkRegistry (`0x6AeE4702002a768B3e9c626030D8d1370904CCCB`) is stale — all 3 contracts will be deployed fresh with the new key

## Next Steps

1. **Reactivate domain** → check Namecheap account → re-enable `libertytorch.online` if suspended
2. **Launch $LIBERTY on Torch** → `app.torchpad.fun/launch` → Launch preset (2.5 ETH MC) → 3% buy tax (50% Burn / 50% Creator) → buy 2% dev supply → pay 0.00015 ETH fee → save token address
3. **Deploy vault + raffle** → paste token address → see `SCRIPTS.md` for full command
4. **Inject watcher secrets** → `fly secrets set LIBERTY_TOKEN=... RAFFLE_ADDR=... WATCHER_KEY=... -a libertytorch-watcher` → `fly deploy -a libertytorch-watcher`
5. **Update site config** → edit `site/js/config.js` with deployed addresses → push → Vercel auto-deploys
6. **Seed prize pool** → default is 0.01 ETH (below $50 threshold at $1/ETH fallback) — set `ETH_AMOUNT=0.05` for a healthy starting pool
7. **Register eligible wallets** → edit `code/scripts/register-holders.ts` → `npx hardhat run scripts/register-holders.ts --network robinhood`
8. **Health check** → `npx hardhat run scripts/check.ts --network robinhood` → if canDraw = true, `scripts/draw.ts`
