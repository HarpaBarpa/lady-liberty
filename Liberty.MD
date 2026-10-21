# LibertyTorch — Project Spec
**Last updated:** 2026-10-21
**Version:** 2.1

---

## What It Is

LibertyTorch is a **decentralized multi-asset raffle protocol** deployed on Robinhood Chain (chainId: 4663). The protocol accepts any ERC-20 token as dust deposits, prices each one independently via Chainlink, and runs an hourly weighted raffle. Holding $LIBERTY earns a base entry. Linking secondary wallets and depositing dust earns bonus entries.

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

**3 smart contracts:**

| Contract | File | Purpose |
|---|---|---|
| LinkRegistry | `LinkRegistry.sol` | EIP-712 wallet linking (primary ↔ secondary, max 5) |
| LibertyVault | `LibertyVault.sol` | Dust deposits, per-token Chainlink feeds, entry calculation |
| LibertyRaffle | `LibertyRaffle.sol` | Hourly draw + Liberty Bell jackpot + prize distribution |

**Frontend:** Single-page site at `libertytorch.online` — live on-chain data via `contracts.js` reads directly from deployed contracts. Browser wallet (Rabby/Metamask) required to connect.

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
- **Dust deposit:** Secondary calls `depositDust(primary, dustToken, amount)` — tokens pulled into vault, 2% fee deducted, entries credited to primary. **Secondary must be linked to primary in LinkRegistry (strict enforcement).**
- **Entry math:**
  - `entries_W = min(floor(usdCents(W) / 50), 5)` per linked wallet per cycle
  - `totalEntries(primary) = 1 (base) + Σ entries_W`
  - Max 26 entries per primary per cycle (1 base + 5 wallets × 5 entries)
- **Per-token price feeds:** Each supported token has its own Chainlink/USD feed. `address(0)` = $1.00 fallback (for testing or 1:1 pegged tokens).
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

**Deploy script:** `scripts/deploy.ts`
```bash
LIBERTY_TOKEN=0x... \
PROTOCOL_FEE_RECIPIENT=0x... \
ETH_USD_FEED=0x... \
npx hardhat run scripts/deploy.ts --network robinhood
```

**Deployer address:** `0x1c3d93A1B471B4245E0a81878F052267446aaCfD` (Torch wallet)
**Deployer balance:** ~0.00092 ETH (Oct 21, 2026)

**Already deployed:**
- LinkRegistry: `0x6AeE4702002a768B3e9c626030D8d1370904CCCB` ✅

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

### Security model

| Concern | How it's handled |
|---|---|
| Fake deposits → entries | Impossible. The vault only credits entries when actual tokens are transferred in. |
| Wallet attribution | `depositDust(primary, token, amount)` requires `primary` hint to match an EIP-712-signed link in LinkRegistry. Wrong hint → revert. |
| Compromised watcher key | Worst case: registers ineligible wallets for 1 base entry each. Cannot create dust entries (those are on-chain). Cannot bypass cooldown. Cannot drain the prize pool. |
| Double-crediting deposits | On-chain: contributions are per-cycle; entries recomputed fresh each cycle. Off-chain: dedup by txHash-logIndex. |
| Entry cap bypass | Vault enforces max 5 entries per linked wallet per cycle and max 25% of total entries per draw on-chain. |
| Missed blocks during downtime | Watcher catches up from `lastProcessedBlock` on restart, rescans all known holders, and will never double-process (dedup keys). |

---

## Known Limitations

1. **Holder registration requires watcher process** — the raffle cannot read $LIBERTY balances on-chain from other wallets. Until a $LIBERTY/USD feed exists or the token is integrated into the vault, an off-chain process must call `registerAccount()` / `deregisterAccount()`. The watcher handles this, but it must run continuously on a VPS or hosted worker.
2. **Draw randomness:** Uses `keccak256(block.prevrandao, block.timestamp, block.number, poolCents, raffleId)` — pseudorandom, not provably fair. Acceptable for community raffle; not suitable for high-stakes applications. Upgrade path: Chainlink VRF if/when available on Robinhood Chain.
3. **ETH/USD feed:** If `ETH_USD_FEED = address(0)`, ETH is priced at $1 (not market value). A real Chainlink ETH/USD feed address should be set at deploy time.
4. **Production hosting:** The watcher needs an always-on host (Fly.io, Railway, or a VPS). It needs the deployer key (for `registerAccount`), ~0.001 ETH for gas, and process monitoring with auto-restart.
5. **$LIBERTY/USD price unavailable on-chain** — the watcher uses a token-count threshold (≥1000 $LIBERTY = eligible). A proper USD-denominated check needs either a Chainlink $LIBERTY/USD feed or a DEX TWAP oracle.

---

## Environment Variables

| Variable | Description |
|---|---|
| `ROBINHOOD_RPC` | RPC URL: `https://rpc.mainnet.chain.robinhood.com` |
| `CHAIN_ID` | 4663 |
| `LIBERTY_TOKEN` | $LIBERTY token address (required for vault + raffle deploy) |
| `TORCH_DEPLOYER_KEY` | Deployer private key (Torch wallet) |
| `ETH_USD_FEED` | Chainlink ETH/USD feed (optional, default: address(0) = $1 fallback) |

---

## File Structure

```
code/
  contracts/
    LinkRegistry.sol     — wallet linking
    LibertyVault.sol     — dust deposits + per-token feeds
    LibertyRaffle.sol    — hourly draw + Liberty Bell jackpot + prize distribution
    MockERC20.sol       — test mock
  scripts/
    deploy.ts           — Hardhat deploy script
    check.ts             — check raffle status + canDraw
    fund-pool.ts         — seed prize pool with ETH
    draw.ts             — manually trigger a draw
    register-holders.ts  — pre-register known eligible wallets
  test/
    LibertyRaffle.test.ts — all 35 passing tests
  watcher/
    watcher.ts          — production watcher/keeper (3 jobs)
    Dockerfile          — container image for hosting
  hardhat.config.ts
  watcher.tsconfig.json
  .env

site/
  index.html            — main landing page
  deploy.html           — browser-based contract deployer
  whitepaper/index.html — whitepaper
  js/
    config.js           — product parameters + contract addresses
    contracts.js        — live chain data layer (ethers.js v6)
    app.js              — page UI, live data wiring
    wallet.js           — wallet linking ledger
    rules.js            — arithmetic utilities
  css/styles.css

docs/
  ARCHITECTURE.md       — contract architecture details

LAUNCH_RUNBOOK.md       — step-by-step launch checklist
```

---

## Next Steps

1. **Get Fly.io account** → fly.io → Sign up → save token in vault as "Fly.io Token"
2. **Deploy watcher** → `fly launch` + set secrets → `fly deploy`
3. **Launch $LIBERTY on Torch** → `app.torchpad.fun/launch` → Quick Launch → pay 0.00015 ETH → save token address
4. **Deploy vault + raffle** → paste token address → run deploy script
5. **Add dust token feeds** → `vault.addSupportedToken(tokenAddr, feedAddr)` for each supported token
6. **Seed prize pool + test draw** → fund with ETH, run `scripts/check.ts`, trigger `scripts/draw.ts`
7. **Verify on site** → connect wallet at `libertytorch.online`
8. **Launch coin** (LAST STEP) → deploy on Torch Launchpad → announce
