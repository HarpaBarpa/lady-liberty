# 🗽 LibertyTorch Launch Runbook

**Do these in order. Coin launch is LAST.**

---

## Phase 1 — Pre-Launch (Do Now)

### 1. Get a Fly.io Account (Free)
1. Go to [fly.io](https://fly.io) → Sign up (GitHub login is fastest)
2. Run: `fly auth login`
3. **Save the auth token in the vault as "Fly.io Token"**

### 2. Set Up the Watcher VPS
```bash
# Install flyctl
curl -fsSL https://fly.io/install.sh | sh
export PATH="$HOME/.fly/bin:$PATH"

# From the repo root
cd code
fly launch --name libertytorch-watcher --dockerfile watcher/Dockerfile --region ewr --no-deploy

# Set secrets (get RAFFLE_ADDR and LIBERTY_TOKEN after Phase 2)
fly secrets set ROBINHOOD_RPC=https://rpc.mainnet.chain.robinhood.com
fly secrets set CHAIN_ID=4663
fly secrets set RAFFLE_ADDR=<raffle_address>
fly secrets set LIBERTY_TOKEN=<liberty_token_address>
fly secrets set WATCHER_KEY=<watcher_private_key>

# Deploy
fly deploy
```

### 3. Verify Watcher is Running
```bash
fly logs libertytorch-watcher
# Should see: "LibertyTorch Watcher" + "Watcher running"
```

---

## Phase 2 — Launch Day: Deploy Contracts

**Do this when you're ready to go live. Token must already exist.**

### Prerequisites
- $LIBERTY token address (from Torch Launchpad)
- Watcher key funded with gas
- ~0.001 ETH for deployment gas

### Deploy
```bash
cd code

LIBERTY_TOKEN=0x... \
PROTOCOL_FEE_RECIPIENT=0x... \
ETH_USD_FEED=0x... \
npx hardhat run scripts/deploy.ts --network robinhood
```

### Save These Addresses
```
LinkRegistry:    <address from deploy output>
LibertyVault:    <address from deploy output>
LibertyRaffle:   <address from deploy output>
```

### Update Watcher Secrets
```bash
fly secrets set RAFFLE_ADDR=<raffle_address> -a libertytorch-watcher
fly secrets set LIBERTY_TOKEN=<liberty_token_address> -a libertytorch-watcher
fly deploy -a libertytorch-watcher
```

### Update Site Config
Edit `site/js/config.js` and `frontend/public/js/config.js`:
```js
const TOKEN_ADDRESS = "0x...";   // $LIBERTY token
const VAULT_ADDRESS = "0x...";    // LibertyVault
const RAFFLE_ADDRESS = "0x...";  // LibertyRaffle
```

Then deploy:
```bash
vercel --prod
```

---

## Phase 3 — Pre-Coin Setup (Raffle Must Be Working)

### 1. Seed the Prize Pool
```bash
npx hardhat run scripts/fund-pool.ts --network robinhood
```

### 2. Register Initial Eligible Wallets
```bash
npx hardhat run scripts/register-holders.ts --network robinhood
```

### 3. Test the Draw
```bash
# Check status
npx hardhat run scripts/check.ts --network robinhood

# Trigger draw manually if ready
npx hardhat run scripts/draw.ts --network robinhood
```

### 4. Verify on the Site
- Open libertytorch.online
- Connect wallet
- Should show "Eligible" or "X entries"

---

## Phase 4 — Coin Launch (LAST STEP)

Only do this after Phase 3 is confirmed working.

1. Deploy $LIBERTY on Torch Launchpad → app.torchpad.fun/launch
2. Copy the new token address immediately
3. Update all configs with the new address (see Phase 2)
4. Update watcher secrets with LIBERTY_TOKEN
5. Announce on socials

---

## Key Commands

```bash
# Check raffle status
npx hardhat run scripts/check.ts --network robinhood

# Fund pool
npx hardhat run scripts/fund-pool.ts --network robinhood

# Manual draw (if keeper misses)
npx hardhat run scripts/draw.ts --network robinhood

# Watcher logs
fly logs libertytorch-watcher

# Restart watcher
fly restart libertytorch-watcher
```

## Gas Budget
- Deploy: ~0.0003 ETH
- Watcher daily: ~0.0002 ETH (2-3 txs/hour at Robinhood gas)
- Keep deployer funded with at least 0.001 ETH

## If Something Goes Wrong
- **Draw not firing?** → Check fly logs, check if pool ≥ $50
- **Watcher down?** → `fly restart libertytorch-watcher`
- **Pool not filling?** → 2% of all token transfers goes there automatically
