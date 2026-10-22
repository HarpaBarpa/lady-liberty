# LibertyTorch — Staged Post-Deploy Scripts
# Run these AFTER: token launched + contracts deployed + addresses known

---

## 1. Fly.io Secrets + Deploy (run after you have all three contract addresses)

```bash
# ─────────────────────────────────────────────────────────
# Step 1: Set all secrets on the running watcher/keeper
# ─────────────────────────────────────────────────────────
fly secrets set \
  ROBINHOOD_RPC=https://rpc.mainnet.chain.robinhood.com \
  CHAIN_ID=4663 \
  LIBERTY_TOKEN=<LIBERTY_TOKEN_ADDRESS> \
  VAULT_ADDR=<VAULT_ADDRESS> \
  LIBERTY_RAFFLE=<LIBERTY_RAFFLE_ADDRESS> \
  TORCH_DEPLOYER_KEY=<DEPLOYER_PRIVATE_KEY> \
  WATCHER_KEY=<WATCHER_PRIVATE_KEY> \
  -a libertytorch-watcher

# ─────────────────────────────────────────────────────────
# Step 2: Redeploy to pick up new secrets
# ─────────────────────────────────────────────────────────
fly deploy -a libertytorch-watcher

# ─────────────────────────────────────────────────────────
# Step 3: Verify
# ─────────────────────────────────────────────────────────
fly logs libertytorch-watcher | grep -E "Keeper|LibertyTorch|error|ERROR"
```

Expected: `"LibertyTorch Keeper"` header + `"Keeper running"` (no ERROR lines).

The keeper runs FOUR jobs on one machine:
1. **Holder watcher** — tracks $LIBERTY balances, registers/deregisters eligible accounts
2. **Draw keeper** — fires `checkAndDraw()` every hour
3. **Jackpot keeper** — fires `checkJackpot()` every hour (Liberty Bell)
4. **Dust liquidator** — after every draw, pulls dust from vault to dev wallet (swap + split pending DEX API setup)

---

## 2. Contract Deployment (run when you have the token address from Torch)

```bash
cd code

# Replace <TOKEN_ADDRESS> with the address from Torch Launchpad
# Replace <PROTOCOL_FEE_RECIPIENT> with your deployer address (0x5F5E4ca54956D8Bd8Ad224835adD0A2bb0B6A438)
# Replace <ETH_USD_FEED> with Chainlink ETH/USD feed — use 0x0 for $1/ETH fallback

LIBERTY_TOKEN=<TOKEN_ADDRESS> \
PROTOCOL_FEE_RECIPIENT=<DEPLOYER_ADDRESS> \
ETH_USD_FEED=0x0000000000000000000000000000000000000000 \
npx hardhat run scripts/deploy.ts --network robinhood

# Deploys: LinkRegistry → LibertyVault → LibertyRaffle
# Saves addresses to code/deployments.json
```

**Note:** Vault protocol fee is **3%** (300 bps), matching the frontend config.

---

## 3. Update Site Config (run after deployment)

Edit `site/js/config.js` and replace the PENDING values:

```javascript
contracts: {
  LIBERTY_TOKEN: "<TOKEN_ADDRESS_FROM_TORCH>",
  LIBERTY_VAULT: "<VAULT_ADDRESS_FROM_DEPLOY>",
  LIBERTY_RAFFLE: "<RAFFLE_ADDRESS_FROM_DEPLOY>",
  LINK_REGISTRY: "<LINK_REGISTRY_ADDRESS_FROM_DEPLOY>",
  // keep the rest as-is
},
```

Then commit and push (GitHub auto-deploy NOT connected — use deploy.sh):
```bash
cd site && ./deploy.sh <VERCEL_TOKEN>
```

---

## 4. Seed Prize Pool (run after contracts deployed)

**⚠️ Amount matters:** pool needs ≥$50 to fire a draw.

| Amount | Approx @ $3,500/ETH | Fires draw? |
|--------|---------------------|-------------|
| 0.015 ETH | ~$52 | ✅ Barely |
| 0.02 ETH | ~$70 | ✅ Healthy |
| 0.05 ETH | ~$175 | ✅ Solid start |
| 0.10 ETH | ~$350 | ✅ Credible |

Current default in fund-pool.ts: **0.01 ETH — below threshold, won't fire.**

```bash
cd code
RAFFLE_ADDR=<LIBERTY_RAFFLE_ADDRESS> \
ETH_AMOUNT=0.05 \
npx hardhat run scripts/fund-pool.ts --network robinhood
```

---

## 5. Register Eligible Holders (optional)

Edit `code/scripts/register-holders.ts`:
```typescript
const ACCOUNTS: string[] = [
  "0x...", // known eligible addresses
];
```

```bash
cd code
RAFFLE_ADDR=<LIBERTY_RAFFLE_ADDRESS> \
npx hardhat run scripts/register-holders.ts --network robinhood
```

---

## 6. Health Check

```bash
cd code
ROBINHOOD_RPC=https://rpc.mainnet.chain.robinhood.com \
RAFFLE_ADDR=<LIBERTY_RAFFLE_ADDRESS> \
VAULT_ADDR=<VAULT_ADDRESS> \
npx hardhat run scripts/check.ts --network robinhood
```

---

## Dust Liquidation — How It Works

After every successful draw, the keeper automatically:
1. Pulls all accumulated dust tokens from `LibertyVault` to your Torch deployer wallet
2. Swaps the dust for ETH (DEX aggregator integration pending — needs 0x or 1inch API key)
3. Splits the proceeds: **50% → `LibertyRaffle.fundPrizePoolETH()` (prize pool)** | **50% → your Torch wallet (dev income)**

The dust swap step is stubbed in the keeper until a DEX aggregator API key is configured.
Once ready, add the swap call inside `liquidateDust()` in `watcher.ts`.

---

## Chainlink Feed Note

No confirmed ETH/USD feed on Robinhood Chain yet. Deploy uses `address(0)` = $1/ETH fallback.
Upgrade when a feed is available via `set-feed.ts`.

---

## Pre-Launch Checklist

- [ ] $LIBERTY token launched on Torch Launchpad
- [ ] Contracts deployed (`deploy.ts`)
- [ ] Fly.io secrets set + redeployed
- [ ] `site/js/config.js` updated + deployed (`./deploy.sh`)
- [ ] Prize pool seeded (≥0.02 ETH)
- [ ] Health check passes
- [ ] Domain reactivated on Namecheap
