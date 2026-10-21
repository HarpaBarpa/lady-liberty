# LibertyTorch — Project Spec
**Last updated:** 2026-10-21
**Version:** 2.0

---

## What It Is

LibertyTorch is a **decentralized multi-asset raffle protocol** deployed on Robinhood Chain (chainId: 4663). The protocol accepts any ERC-20 token as dust deposits, prices each one independently via Chainlink, and runs an hourly weighted raffle. Holding $LIBERTY earns a base entry. Linking secondary wallets and depositing dust earns bonus entries.

**Brand:** Lady Liberty — the Statue of Liberty as a friendly anime character, torch raised high, mint green flame (#6EE786). She stands for the underdog, the leftover, the dust.

---

## Architecture

```
Torch Launchpad   →   $LIBERTY token (ERC-20)
                           │
                           ├── LinkRegistry (wallet linking)
                           ├── LibertyVault (dust deposits, per-token pricing)
                           └── LibertyRaffle (hourly draw, prizes)
```

**3 smart contracts:**

| Contract | File | Purpose |
|---|---|---|
| LinkRegistry | `LinkRegistry.sol` | EIP-712 wallet linking (primary ↔ secondary, max 5) |
| LibertyVault | `LibertyVault.sol` | Dust deposits, per-token Chainlink feeds, entry calculation |
| LibertyRaffle | `LibertyRaffle.sol` | Hourly draw, weighted selection, prize distribution |

**Frontend:** Single-page site at `libertytorch.online` — live on-chain data via `contracts.js` → reads directly from deployed contracts. Browser wallet (Rabby/Metamask) required to connect.

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
- **Weighted selection:** Each registered account has 1 + vault dust entries. 10 unique winners drawn by weighted random. Winner + all linked wallets enter 24h cooldown.
- **Payout draft (96% of pool):** [35%, 20%, 12%, 8%, 6%, 5%, 4%, 3%, 2%, 1%]
- **Prize:** Paid in ETH (or any ERC-20 via `claimPrize`). If ETH_USD_FEED is `address(0)`, $1/ETH fallback.
- **Funding:** ETH via `receive()` or `fundPrizePoolETH()`. ERC-20 via `fundPrizePoolERC20`.
- **Admin:** `setMinPoolCents`, `setDrawInterval`, `pause/unpause`, `sweepToken` (ERC-20 only, blocks ETH).

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
TORCH_DEPLOYER_KEY=0x... \
ROBINHOOD_RPC=https://rpc.mainnet.chain.robinhood.com \
CHAIN_ID=4663 \
npx hardhat run scripts/deploy.ts --network robinhood
```

**Deployer address:** `0x1c3d93A1B471B4245E0a81878F052267446aaCfD` (Torch wallet)
**Deployer balance:** ~0.00092 ETH (Oct 21, 2026)

**Already deployed:**
- LinkRegistry: `0x6AeE4702002a768B3e9c626030D8d1370904CCCB` ✅

---

## Known Limitations

1. **Indexer required for $LIBERTY base entry:** The vault cannot read $LIBERTY balances on-chain from other wallets. An off-chain indexer (e.g., The Graph subgraph, Chainlink automation, or custom backend) must watch for $LIBERTY transfers and call `raffle.registerAccount(wallet)` when balance ≥ $10.
2. **No secondary→primary reverse map:** The vault relies on the `depositDust` caller's `primary` hint, which is verified against the LinkRegistry. A direct registry scan would be needed if the hint is unavailable.
3. **Draw randomness:** Uses `keccak256(block.prevrandao, block.timestamp, block.number, poolCents, raffleId)` — pseudorandom, not provably fair. Acceptable for community raffle; not suitable for high-stakes financial applications.
4. **ETH/USD feed:** If `ETH_USD_FEED = address(0)`, ETH is priced at $1 (not market value). Prize amounts will be wrong if this is not updated with a real feed.
5. **Manual account registration:** No automatic deregistration when $LIBERTY balance drops below $10. Owner must call `deregisterAccount` off-chain.

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
    LibertyRaffle.sol    — hourly draw + prize distribution
    MockERC20.sol       — test mock
  scripts/
    deploy.ts           — Hardhat deploy script
  test/
    LibertyRaffle.test.ts — all 35 passing tests
  hardhat.config.ts
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
```

---

## Next Steps

1. **Launch $LIBERTY on Torch** → `app.torchpad.fun/launch` → Quick Launch → pay 0.00015 ETH → save token address
2. **Deploy vault + raffle** → paste token address → run deploy script
3. **Add dust token feeds** → `vault.addSupportedToken(tokenAddr, feedAddr)` for each supported token
4. **Build indexer** → subgraph or backend to register accounts when $LIBERTY balance ≥ $10
5. **Configure keeper** → cron job or Chainlink Automation to call `raffle.checkAndDraw()` every hour
6. **Fund prize pool** → `raffle.fundPrizePoolETH({ value: ... })` with ETH
