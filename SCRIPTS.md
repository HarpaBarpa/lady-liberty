# LibertyTorch — Script Reference
# Canonical launch runbook: LAUNCH_RUNBOOK.md
# Run these AFTER: token launched + contracts deployed + addresses known

---

## 1. Contract Deployment (run when you have the token address from Torch Pad)

```bash
cd code

# LIBERTY_TOKEN from Torch Launchpad
# PROTOCOL_FEE_RECIPIENT = deployer address (0x5F5E4ca54956D8Bd8Ad224835adD0A2bb0B6A438)
# ETH_USD_FEED = 0x0 for $1/ETH fallback (no Chainlink feed on Robinhood Chain yet)

LIBERTY_TOKEN=<TOKEN_ADDRESS> \
PROTOCOL_FEE_RECIPIENT=0x5F5E4ca54956D8Bd8Ad224835adD0A2bb0B6A438 \
ETH_USD_FEED=0x0000000000000000000000000000000000000000 \
npx hardhat run scripts/deploy.ts --network robinhood

# Deploys: LinkRegistry → LibertyVault → LibertyRaffle
# Saves addresses to code/deployments.json
```

Vault protocol fee: **3%** (300 bps), matching frontend config.

---

## 2. Seed Prize Pool

```bash
cd code
RAFFLE_ADDR=<LIBERTY_RAFFLE_ADDRESS> \
ETH_AMOUNT=0.05 \
npx hardhat run scripts/fund-pool.ts --network robinhood
```

Pool needs ≥$50 to fire a draw. At ETH_USD_FEED=0x0 (fallback), $1 = 1 ETH, so seed ≥50 ETH. **With real chain this will change once a feed is available.**

---

## 3. Register Eligible Holders (optional)

Edit `code/scripts/register-holders.ts` with known wallet addresses, then:
```bash
cd code
RAFFLE_ADDR=<LIBERTY_RAFFLE_ADDRESS> \
npx hardhat run scripts/register-holders.ts --network robinhood
```

---

## 4. Health Check

```bash
cd code
ROBINHOOD_RPC=https://rpc.mainnet.chain.robinhood.com \
RAFFLE_ADDR=<LIBERTY_RAFFLE_ADDRESS> \
VAULT_ADDR=<VAULT_ADDRESS> \
npx hardhat run scripts/check.ts --network robinhood
```

---

## 5. Update Site Config + Deploy

Edit `site/js/config.js` → replace all PENDING values with real addresses, then:
```bash
cd site && ./deploy.sh <VERCEL_TOKEN>
```

Verify: `curl -sL https://libertytorch.online/js/config.js | grep -c PENDING` → should be 0.

---

## 6. Keeper — Hetzner VPS

Full bootstrap script in `LAUNCH_RUNBOOK.md` Phase 2. Quick commands after setup:

```bash
# SSH in
ssh root@<VPS_IP>

# Status
systemctl status libertytorch-keeper

# Logs
journalctl -u libertytorch-keeper -f

# Restart after config change
systemctl restart libertytorch-keeper

# Update from git
cd /opt/libertytorch && git pull && cd code && npm ci && npm run watcher:build && systemctl restart libertytorch-keeper
```

The keeper runs 4 jobs:
1. **Holder watcher** — tracks $LIBERTY balances, registers/deregisters accounts
2. **Draw keeper** — calls `checkAndDraw()` every hour
3. **Jackpot keeper** — calls `checkJackpot()` every hour (Liberty Bell)
4. **Dust liquidator** — after every draw, pulls dust → dev wallet (DEX swap pending API key)

---

## Dust Liquidation

After every successful draw, the keeper:
1. Pulls accumulated dust from `LibertyVault` to deployer wallet
2. Swaps dust for ETH (0x/1inch API pending)
3. Splits: **50% → prize pool** | **50% → dev wallet**

---

## Chainlink Feed

No ETH/USD feed on Robinhood Chain. Deploy uses `address(0)` = $1/ETH fallback. Upgrade when available.

---

## Pre-Launch Checklist

- [ ] $LIBERTY token launched on Torchpad
- [ ] Contracts deployed (`deploy.ts`)
- [ ] `site/js/config.js` updated + deployed
- [ ] Prize pool seeded (≥0.02 ETH)
- [ ] Hetzner VPS provisioned + keeper running
- [ ] Health check passes