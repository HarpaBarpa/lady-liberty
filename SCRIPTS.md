# LibertyTorch — Staged Post-Deploy Scripts
# Run these AFTER: token launched + contracts deployed + addresses known

---

## 1. Fly.io Secrets + Deploy (run after you have RAFFLE_ADDR and LIBERTY_TOKEN)

```bash
# ─────────────────────────────────────────────────────────
# Step 1: Set secrets on the running watcher app
# ─────────────────────────────────────────────────────────
fly secrets set \
  LIBERTY_TOKEN=<LIBERTY_TOKEN_ADDRESS> \
  RAFFLE_ADDR=<LIBERTY_RAFFLE_ADDRESS> \
  WATCHER_KEY=<NEW_DEPLOYER_PRIVATE_KEY> \
  -a libertytorch-watcher

# ─────────────────────────────────────────────────────────
# Step 2: Redeploy the watcher to pick up new secrets
# ─────────────────────────────────────────────────────────
fly deploy -a libertytorch-watcher

# ─────────────────────────────────────────────────────────
# Step 3: Verify the watcher is running correctly
# ─────────────────────────────────────────────────────────
fly logs libertytorch-watcher | grep -E "Watcher|error|ERROR|ready"
```

Expected output from Step 3: `"LibertyTorch Watcher vX.X.X — starting"` + `"Watcher running"` (no ERROR lines).

---

## 2. Contract Deployment (run when you have the token address from Torch)

```bash
cd code

# Replace <TOKEN_ADDRESS> with the address from Torch (ends in 1111)
# Replace <ETH_USD_FEED> with the Chainlink ETH/USD feed address on Robinhood Chain
#   If no feed exists, use "0x0000000000000000000000000000000000000000" (zero address)
#   This falls back to $1/ETH pricing — fine for now, replace when a feed is available.
# Replace <PROTOCOL_FEE_RECIPIENT> with the address to receive 2% vault fees (deployer address recommended)

LIBERTY_TOKEN=<TOKEN_ADDRESS> \
PROTOCOL_FEE_RECIPIENT=<YOUR_DEPLOYER_ADDRESS> \
ETH_USD_FEED=0x0000000000000000000000000000000000000000 \
npx hardhat run scripts/deploy.ts --network robinhood

# This deploys LinkRegistry + LibertyVault + LibertyRaffle
# Saves output to code/deployments.json
```

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

Then commit and push:
```bash
cd ..
git add site/js/config.js
git commit -m "Update contract addresses post-deploy"
git push
# Vercel auto-deploys
```

---

## 4. Seed Prize Pool (run after contracts deployed)

**⚠️ How much ETH to seed with?**

The raffle needs ≥$50 in the pool to fire a draw. ETH/USD pricing is in $.

| Amount | Approx value @ $3,500/ETH | Fires draw? |
|--------|--------------------------|-------------|
| 0.015 ETH | ~$52 | ✅ Just barely |
| 0.02 ETH | ~$70 | ✅ Yes |
| 0.05 ETH | ~$175 | ✅ Yes (healthy start) |
| 0.10 ETH | ~$350 | ✅ Yes (credible) |

Current default in fund-pool.ts: 0.01 ETH (⚠️ below $50 threshold — won't fire)

**To set your amount, either pass it as an env var or edit the default in fund-pool.ts:**

```bash
# Option A: pass as env var (recommended for one-off)
ETH_AMOUNT=0.05 npx hardhat run scripts/fund-pool.ts --network robinhood

# Option B: edit the default in code/scripts/fund-pool.ts
# Change: const amount = process.env.ETH_AMOUNT || "0.01";
# To:     const amount = process.env.ETH_AMOUNT || "0.05";
```

Then run:
```bash
cd code
RAFFLE_ADDR=<RAFFLE_ADDRESS> \
ETH_AMOUNT=0.05 \
npx hardhat run scripts/fund-pool.ts --network robinhood
```

---

## 5. Register Eligible Holders (run after contracts deployed)

If you have a list of known eligible wallets (≥1000 $LIBERTY each), edit `code/scripts/register-holders.ts`:

```typescript
const ACCOUNTS: string[] = [
  "0x...", // your deployer/holder address
  // add more addresses here
];
```

Then run:
```bash
cd code
RAFFLE_ADDR=<RAFFLE_ADDRESS> \
npx hardhat run scripts/register-holders.ts --network robinhood
```

If the ACCOUNTS array is empty, this script skips silently.

---

## 6. Health Check (run at any time post-deploy)

```bash
cd code
ROBINHOOD_RPC=https://rpc.mainnet.chain.robinhood.com \
RAFFLE_ADDR=<RAFFLE_ADDRESS> \
VAULT_ADDR=<VAULT_ADDRESS> \
LINK_REG_ADDR=<LINK_REGISTRY_ADDRESS> \
npx hardhat run scripts/check.ts --network robinhood
```

Expected output shows: deployer balance, raffle status (canDraw), pool size in USD, vault token count, eligible account count.

---

## Chainlink Feed Note

Robinhood Chain does not yet have a confirmed Chainlink ETH/USD feed address publicly documented. The deploy script uses `address(0)` as the ETH/USD feed, which falls back to $1/ETH pricing.

**Impact:** Until a real feed is set, `fundPrizePoolETH()` and prize payouts will be priced at $1/ETH instead of market value. The pool threshold ($50) and draw logic still work — just in non-USD terms.

**To upgrade when a feed is available:**
```bash
# Call setEthUsdFeed on the deployed LibertyRaffle contract
# (owner-only function)
npx hardhat run scripts/set-feed.ts --network robinhood
```

---

## Checklist Before You Launch

- [ ] $LIBERTY token launched on Torch Launchpad (token address in hand)
- [ ] ETH_USD_FEED address confirmed (or use zero address for $1 fallback)
- [ ] Contracts deployed (`deploy.ts`)
- [ ] Fly.io watcher secrets set + redeployed
- [ ] `site/js/config.js` updated + pushed (Vercel deploys)
- [ ] Prize pool seeded (`fund-pool.ts`)
- [ ] Eligible holders registered (`register-holders.ts`) — if any
- [ ] Health check passes (`check.ts`)
- [ ] Domain reactivated on Namecheap (`libertytorch.online` live)
- [ ] Manual test draw fired (`draw.ts`) — optional, `checkAndDraw()` fires automatically via watcher
