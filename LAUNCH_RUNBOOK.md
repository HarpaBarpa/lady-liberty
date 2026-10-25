# 🗽 LibertyTorch — Launch Runbook

## Trigger Phrase

Any human message containing **"libertytorch"** (any casing) triggers the full startup checklist. When triggered, the agent must:
1. Read this file completely
2. Read `/root/.openclaw/workspace/projects/liberty/Liberty.MD`
3. Read `/root/.openclaw/workspace/memory/YYYY-MM-DD.md` for the last 3 days
4. Check the current state of every item in the checklist below
5. Report honestly where we stand — what's done, what's missing, what's next

---

## Phase 0 — Pre-Flight Verification (Agent: Run Every Time)

```bash
# 1. Robinhood Chain alive?
curl -s https://rpc.mainnet.chain.robinhood.com \
  -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | grep -o '"result":"0x[^"]*"'

# 2. Deployer wallet funded?
cd code
node -e "
const { ethers } = require('ethers');
const p = new ethers.JsonRpcProvider('https://rpc.mainnet.chain.robinhood.com');
p.getBalance('0x5F5E4ca54956D8Bd8Ad224835adD0A2bb0B6A438').then(b => console.log(ethers.formatEther(b), 'ETH'));
p.getFeeData().then(f => console.log('Gas:', ethers.formatUnits(f.gasPrice||0n, 'gwei'), 'gwei'));
"

# 3. Site live?
curl -sL -o /dev/null -w "%{http_code}  %{url_effective}\n" https://libertytorch.online/

# 4. Site has real addresses or still PENDING?
curl -sL https://libertytorch.online/js/config.js | grep -E "PENDING|0x[0-9a-fA-F]{40}"
# If output contains "PENDING" → contracts not deployed, site is a shell

# 5. Watcher/keeper running?
# After Hetzner VPS is set up (Phase 2): ssh in and check
# For now: this will be "NOT RUNNING"
```

---

## Phase 1 — Contracts (Run When $LIBERTY Token Address Is Known)

### 1a. Deploy Contracts

**Prerequisites:**
- $LIBERTY token deployed on Torchpad → have the 0x address
- Deployer wallet has gas (>0.001 ETH minimum, current: ~0.055 ETH)
- `.env` contains `TORCH_DEPLOYER_KEY` (already set)

```bash
cd /root/.openclaw/workspace/projects/liberty/code

# Load env
source .env 2>/dev/null || true

# Deploy all three contracts. Uses address(0) for ETH/USD feed = $1/ETH fallback.
LIBERTY_TOKEN=<TOKEN_ADDRESS_FROM_TORCH> \
PROTOCOL_FEE_RECIPIENT=0x5F5E4ca54956D8Bd8Ad224835adD0A2bb0B6A438 \
ETH_USD_FEED=0x0000000000000000000000000000000000000000 \
npx hardhat run scripts/deploy.ts --network robinhood

# Output saved to code/deployments.json
# RECORD THESE ADDRESSES:
#   LINK_REGISTRY:  _______
#   LIBERTY_VAULT:  _______
#   LIBERTY_RAFFLE: _______
```

### 1b. Seed Prize Pool

```bash
cd /root/.openclaw/workspace/projects/liberty/code
RAFFLE_ADDR=<RAFFLE_ADDRESS> \
ETH_AMOUNT=0.05 \
npx hardhat run scripts/fund-pool.ts --network robinhood
```

### 1c. Run Health Check

```bash
cd /root/.openclaw/workspace/projects/liberty/code
ROBINHOOD_RPC=https://rpc.mainnet.chain.robinhood.com \
RAFFLE_ADDR=<RAFFLE_ADDRESS> \
VAULT_ADDR=<VAULT_ADDRESS> \
LINK_REG_ADDR=<LINK_REGISTRY_ADDRESS> \
npx hardhat run scripts/check.ts --network robinhood
```

---

## Phase 2 — Hetzner VPS for Keeper (Replaces Fly.io)

**Why Hetzner:** Single VPS, no Docker, no proprietary config. Systemd keeps the keeper alive. ~€3.50/mo, 2GB RAM, 20GB disk.

### 2a. Provision VPS

1. Go to [hetzner.com/cloud](https://www.hetzner.com/cloud) → sign up
2. Create server: **CX22** (2 vCPU, 4GB RAM, 40GB, ~€3.99/mo), region: Ashburn, VA (us-east) or Nuremberg
3. OS: Ubuntu 24.04 LTS
4. Add SSH key during creation
5. Save the IP address

### 2b. Bootstrap (Run after SSH'ing in)

```bash
# SSH in
ssh root@<VPS_IP>

# Install Node 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs git

# Clone repo
git clone https://github.com/HarpaBarpa/lady-liberty.git /opt/libertytorch
cd /opt/libertytorch/code

# Install deps + build watcher
npm ci
npm run watcher:build

# Create .env (FILL IN REAL ADDRESSES AFTER CONTRACT DEPLOY)
cat > .env << 'ENVEOF'
ROBINHOOD_RPC=https://rpc.mainnet.chain.robinhood.com
CHAIN_ID=4663
TORCH_DEPLOYER_KEY=<DEPLOYER_PRIVATE_KEY>
LIBERTY_TOKEN=<TOKEN_ADDRESS>
VAULT_ADDR=<VAULT_ADDRESS>
LIBERTY_RAFFLE=<RAFFLE_ADDRESS>
WATCHER_KEY=<WATCHER_PRIVATE_KEY>
ENVEOF

# Secure the .env
chmod 600 .env

# Create systemd service
cat > /etc/systemd/system/libertytorch-keeper.service << 'UNITEOF'
[Unit]
Description=LibertyTorch Keeper
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
User=root
WorkingDirectory=/opt/libertytorch/code
ExecStart=/usr/bin/node dist/watcher/watcher.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/opt/libertytorch/code/.env

[Install]
WantedBy=multi-user.target
UNITEOF

systemctl daemon-reload
systemctl enable --now libertytorch-keeper
systemctl status libertytorch-keeper
```

### 2c. Verify Keeper Running

```bash
# Check logs
journalctl -u libertytorch-keeper -f --no-pager
# Should see: "LibertyTorch Keeper" header with contract addresses, then "Keeper running"
```

---

## Phase 3 — Update Site Config + Verify Connect Wallet Flow

### 3a. Update contract addresses in `site/js/config.js`

⚠️ **Do this BEFORE sharing the CA publicly.** The site must have real addresses before users try to connect.

```javascript
contracts: {
    LIBERTY_TOKEN: "<TOKEN_ADDRESS_FROM_TORCH>",
    LINK_REGISTRY: "<LINK_REGISTRY_ADDRESS>",
    LIBERTY_VAULT: "<VAULT_ADDRESS>",
    LIBERTY_RAFFLE: "<RAFFLE_ADDRESS>",
},
```

### 3b. Verify Connect Wallet button

Confirm the hero "🔗 Connect Wallet" button is visible and correctly styled (btn-copper on dark background). See Phase 0.

### 3c. Verify dust deposit flow

Before launch, test the full deposit flow in-browser:
1. Connect primary wallet → should prompt for Robinhood Chain switch
2. Link a secondary wallet → EIP-712 signature, no gas
3. Deposit dust → approve token → call `vault.depositDust()`

All three require real contract addresses (no PENDING values) to succeed.

### 3d. Deploy

```bash
cd /root/.openclaw/workspace/projects/liberty/site
# Get Vercel token from Vault: Vercel Full Access
./deploy.sh <VERCEL_TOKEN>
```

### Verify Live

```bash
curl -sL https://libertytorch.online/js/config.js | grep "0x[0-9a-fA-F]\{40\}"
# Should show ALL REAL ADDRESSES, NO "PENDING"
```

---

## Phase 4 — Post-Launch Verification

```bash
# 1. Site shows real pool data
# Open https://libertytorch.online in browser, connect wallet, check:
#   - Prize pool shows as funded (not "—")
#   - Raffle status is alive
#   - "Eligible" shown for registered accounts

# 2. Keeper is processing blocks
journalctl -u libertytorch-keeper --since "5 min ago" --no-pager | grep -E "Catching|registered|Draw|Bell"
```

---

## VPS Commands

```bash
# Restart keeper
systemctl restart libertytorch-keeper

# View live logs
journalctl -u libertytorch-keeper -f

# Check status
systemctl status libertytorch-keeper

# Update from git
cd /opt/libertytorch && git pull && cd code && npm ci && npm run watcher:build && systemctl restart libertytorch-keeper
```

---

## Checklist — Final State

- [ ] $LIBERTY token deployed on Torchpad → token address known
- [ ] 3 contracts deployed (LinkRegistry, LibertyVault, LibertyRaffle)
- [ ] Prize pool seeded (≥0.02 ETH, recommended 0.05)
- [ ] Hetzner VPS provisioned
- [ ] Keeper running on VPS (systemd, auto-restart)
- [ ] Keeper .env contains all real addresses (no PENDING values)
- [ ] `site/js/config.js` updated with real addresses (PENDING → real addresses, done BEFORE sharing CA)
- [ ] "🔗 Connect Wallet" button visible and correctly styled in hero section
- [ ] Dust deposit flow verified in-browser (connect → link → deposit, no gas on link step)
- [ ] Site deployed (`./deploy.sh`) and verified live
- [ ] Browser test: connect wallet, pool shows funded, eligible status works
- [ ] DEX aggregator API key acquired (0x or 1inch) — post-launch nice-to-have
- [ ] Dust liquidation swap wired into keeper — once DEX API key is available

---

## Post-Launch Improvements (do these after first draw fires)

These are cosmetic/UX improvements — not blockers, but worth doing once the raffle is live and there are real draws to show.

### 1. Show participant count in live draw panel
Currently the torch live-draw panel shows "Supported tokens" (vault count). Wire in the actual eligible participant count from the raffle contract.

**contracts.js change:** Add `getEligibleAccounts()` to the raffle ABI and fetch it in `readContracts()`.

```solidity
"function getEligibleAccounts() view returns (address[])"
```

**app.js change:** Read `data.raffle.eligibleAccounts.length` and display it in the `data-draw-parts` element (rename label if needed).

### 2. Show winners after each draw
After a draw fires, display the winning addresses from `getWinners(raffleId)` in the live draw panel.

**contracts.js change:** Add `getWinners(uint256 _raffleId)` to the raffle ABI, fetch in `readContracts()` keyed by raffleId.

**app.js change:** In the poll loop, after updating pool/round, fetch winners for the current raffleId and display them. Consider:
- Showing just short addresses (e.g. `0x4A2B…8f3C`) in a "Last winners" row
- Highlighting if the connected wallet is among them ("You won 1st place!")
- A simple table: Rank | Wallet | Share %

### 3. Historical winners table (optional)
Store last 5 raffleIds and show a scrollable history of winners. Useful social proof once there are real participants.

### 4. Make winners display personal
Once winners are shown, add logic to check if `signerAddr` matches any winner address and display a personal message: "🎉 You won [rank] place! Claim your ETH."

### 5. Upgrade to Chainlink VRF (before pools grow large)
Replace `keccak256(block.prevrandao, block.timestamp, block.number, poolCents, raffleId)` with Chainlink VRF for provably fair randomness. Requires a VRF coordinator contract on Robinhood Chain — check with Chainlink or Robinhood team. Eliminates miner/sequencer manipulation risk entirely. Relevant when prize pools become large enough to incentivize attack.

### 6. Liberty Bell adaptive trigger
The 1-in-72 fixed odds means large jackpots accumulate faster without proportionally higher trigger rates. Options:
- Raise `MIN_JACKPOT_CENTS` as the pool grows to slow accumulation
- Use Chainlink VRF to vary the Bell's trigger odds based on jackpot size (ensuring expected value stays proportional to pool size)

---

## Gas Budget

| Operation | Approx Cost (Robinhood) |
|-----------|------------------------|
| Deploy 3 contracts | ~0.0003 ETH |
| Seed pool | ~0.0001 ETH |
| registerAccount (each) | ~0.00005 ETH |
| checkAndDraw (hourly) | ~0.00008 ETH |
| Keeper daily | ~0.001 ETH |

**Deployer wallet current balance:** ~0.055 ETH — fine for launch + weeks of operation.