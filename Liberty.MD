# LibertyTorch 🗽🔥

**$LIBERTY** | Launching on **Torch** · Robinhood Chain

---

## What Is This?

LibertyTorch is a community token on Torch, built on the Statue of Liberty as its brand and narrative anchor. The idea: liberation, second chances, turning forgotten things into meaningful wins.

$LIBERTY is the token. The brand is Lady Liberty — Statue of Liberty as a friendly anime character, torch raised high, mint green flame. She's the face of the community.

The Torch platform powers everything: the token launch, the liquidity, the trading.

---

## The Brand

**Lady Liberty** — Statue of Liberty reimagined as a friendly anime character. Short sculptural sea-green bob, copper freckles, kind teal eyes, seven-ray patina crown, seafoam toga, holding a torch high. The torch flame in mint green (#6EE786) is the signature visual — the single glowing light source.

**Palette:** harbor teal #174C4F, seafoam #DCF5EB, porcelain #F7FFFB, patina #5FB59B, torch mint #6EE786, copper #B8733A.

**Style:** Hand-inked anime editorial illustration — confident ink contours, selective flat cel shadows, matte surfaces, subtle gouache and paper grain.

**No pigeons.**

---

## $LIBERTY Token

Launched via Torch Launchpad on Robinhood Chain in one transaction.

**Key facts:**
- Supply: 1,000,000,000 fixed (no mint function)
- Buy tax: 3% (only on buys, fixed forever — Torch enforces this)
- Sell tax: 0% (Torch never taxes sells)
- Liquidity: locked forever via Torch launchpad
- No owner, no pause, no blacklist
- Address ends in `1111` (signature of a real Torch launch)

**Tokenomics:**
- **Buy tax: 3% total**, split:
  - 0.90% → Torch Protocol
  - 0.50% → $LIBERTY Buyback & Burn
  - 1.35% → Raffle Vault (core utility)
  - 0.25% → Development / Marketing
- Pair asset: $TORCH
- Dev buy: 2% of supply
- Anti-snipe: ON

**Torch constraints (non-negotiable):**
- 30% of all tax goes to Torch
- 70% of all tax goes to creator wallet
- Starting MC options: Degen (1 ETH) / Launch (2.5 ETH) / Steady (5 ETH)
- Recommended: **Launch (2.5 ETH)**

---

## Raffle — The Core Utility

**Hold to Enter. Dust to Boost. Every Hour.**

Every hour, up to 10 unique winners split the ETH prize vault.

| Parameter | Value |
|---|---|
| **Eligibility** | Hold ≥$10 of $LIBERTY |
| **Base entry** | 1 per eligible wallet |
| **Entry boost** | Deposit ERC-20 dust via site → $0.50 increments → extra entries |
| **Max dust entries** | 5 per linked wallet per cycle (25 max from dust) |
| **Max total entries** | 26 per primary account (1 base + 25 dust) |
| **Max linked wallets** | 5 per primary |
| **Draw frequency** | Hourly |
| **Winners per draw** | Up to 10 unique (no repeats) |
| **Prize split** | 35 / 20 / 12 / 8 / 6 / 5 / 4 / 3 / 2 / 1 (total = 96%) |
| **Pool floor** | $50 minimum — draws skip if below, funds roll over |
| **Cooldown** | 24h per wallet after winning |
| **Prize currency** | ETH — sent directly to winners' wallets |

**How it works:**
1. Hold ≥$10 $LIBERTY → you have 1 base entry
2. Link up to 5 secondary wallets via on-chain signing
3. Deposit dust (any ERC-20) through the site → credited to your primary
4. Each $0.50 of dust = 1 extra entry (max 5 entries per linked wallet)
5. On-chain draw runs hourly — winners + all their linked wallets enter 24h cooldown
6. Prizes arrive in your wallet automatically

The vault contract (`LibertyVault`) tracks dust per cycle. The raffle contract (`LibertyRaffle`) runs the draw. Wallet linking is handled by `LinkRegistry` using EIP-712 signatures.

---

## Smart Contracts

All on Robinhood Chain. Source in `code/contracts/`.

| Contract | Purpose |
|---|---|
| `LinkRegistry.sol` | EIP-712 wallet linking (primary ↔ secondary signing) |
| `LibertyVault.sol` | Dust deposits, entry computation, 2% protocol fee |
| `LibertyRaffle.sol` | Prize pool, hourly draw, cooldown, ETH prize claims |

**Toolchain:** Hardhat 2.29.1, Solidity ^0.8.24, OpenZeppelin ^5.6.1, ethers v6, EVM Cancun target. **35 tests passing.**

---

## Key Addresses

| | |
|---|---|
| **$TORCH** | `0x000050E18ffa3F8F7aD170Eb9CeF160eb3Ed1111` |
| **Torch Launchpad** | `0x7891eA889899928aFE637e4Cca8106188427776a` |
| **$LIBERTY** | `0x___________1111` (assigned at launch) |
| **Explorer** | robinhoodchain.io |
| All Torch tokens end in | `1111` |

---

## What's Built

- **`site/`** — Production static site. Single source of truth for the live site. `js/config.js` holds all raffle params. Deployed to Vercel.
- **`code/`** — Hardhat project with 3 Solidity contracts + test suite (35 passing). Deploy scripts in `scripts/deploy.ts`.
- **`design/artwork/`** — 8 social media formats in the Lady Liberty anime style.
- **`TOKENOMICS.md`** — Flywheel, tax revenue projections, decisions.
- **`BUILD.md`** — Step-by-step Torch launch guide.
- **`code/docs/ARCHITECTURE.md`** — Full system architecture doc.

---

## Deployment Status

- **Domain:** `libertytorch.online` registered on Namecheap ✅
- **Site (production):** Live at `https://libertytorch.online` via Vercel ✅
- **GitHub repo:** `HarpaBarpa/lady-liberty` (public, primary) ✅
- **Vercel project:** `prj_E7IASpe9aFe0cgQQmEmwIIwje03` under `mj1804s-projects` team ✅
- **Whitepaper:** `https://libertytorch.online/whitepaper` ✅
- **Contracts:** All 3 written, compiled, 35/35 tests passing ✅
- **`NEXT_PUBLIC_LIBERTY_TOKEN_ADDRESS`:** set as `PENDING_LAUNCH` in Vercel env vars ✅
- **$LIBERTY:** not launched yet

---

## Launch Checklist

### Before Launch
- [x] Register `libertytorch.online` — Martin, Namecheap
- [x] Deploy static site to Vercel — `libertytorch.online` live
- [x] Write and publish whitepaper — `libertytorch.online/whitepaper`
- [x] Add `NEXT_PUBLIC_LIBERTY_TOKEN_ADDRESS` env var to Vercel (placeholder)
- [x] Finalize tokenomics: 3% buy tax, confirmed splits
- [x] Finalize raffle mechanics: 10 winners, payout draft, $50 floor, 24h cooldown, dust boost
- [x] Write and test all 3 smart contracts (35 tests passing)
- [ ] Deposit ~0.00015 ETH on Robinhood Chain for Torch launch fee
- [ ] Launch $LIBERTY via Torch → save address (ends `1111`)

### After Token Launch
- [ ] Update `NEXT_PUBLIC_LIBERTY_TOKEN_ADDRESS` env var on Vercel with real address
- [ ] Redeploy on Vercel
- [ ] Deploy contracts to Robinhood Chain (LinkRegistry first, then Vault, then Raffle)
- [ ] Wire vault address into site frontend
- [ ] Set up wallet linking UI + dust deposit flow on site
- [ ] Social launch: Twitter/X, Telegram
- [ ] CoinGecko listing application

---

## Open Decisions

- [x] Final tokenomics: 3% buy tax, split confirmed
- [x] Raffle mechanics: 10 winners, payout draft [35/20/12/8/6/5/4/3/2/1], hourly, $50 floor, ETH prizes
- [x] Raffle vault + LinkRegistry + LibertyRaffle contracts: written and tested
- [x] Wallet linking: EIP-712 on-chain registry
- [ ] 4% development allocation use — treasury or further burn?
- [ ] Dust entry expiry: do entries expire at end of cycle or carry?
- [ ] Rules if <10 eligible participants at draw time
- [ ] Whether primary wallet may also contribute its own dust

---

## Torch / Robinhood Chain Notes

- **Chain ID:** 1337 (dev) / production TBD
- **RPC:** `https://rpc.robinhoodchain.io` (or get from Torch docs)
- **Explorer:** `robinhoodchain.io`
- **Where to buy ETH on Robinhood Chain:** Through the Torch DEX after launch, or bridge from another chain

---

## Next Session Instructions

When resuming LibertyTorch work, start by reading this file (`Liberty.MD`) and then:

1. **For contract work:** `cd /root/.openclaw/workspace/projects/liberty/code/`
   - Run tests: `npx hardhat test`
   - Compile: `npx hardhat compile`
   - Deploy to local: `npx hardhat run scripts/deploy.ts`
   - Deploy to Robinhood: set `ROBINHOOD_RPC`, `CHAIN_ID`, `DEPLOYER_KEY` env vars, then `npx hardhat run scripts/deploy.ts --network robinhood`

2. **For site changes:** `cd /root/.openclaw/workspace/projects/liberty/site/`
   - Edit `js/config.js` for raffle params (single source of truth)
   - Deploy: `vercel deploy . --token=<token> --project="prj_E7IASpe9aFe0cgQQmEmwIIwje03" --prod --yes`
   - Or push to `HarpaBarpa/lady-liberty` main branch → Vercel auto-deploys

3. **Git identity for contracts:** Always commit as `MJ1804 <mj1804@users.noreply.github.com>` in the `code/` directory (Vercel deploy key restriction).

4. **Token launch:** Use `BUILD.md` step-by-step. Need: ~0.00015 ETH on Robinhood Chain + $TORCH pair liquidity.

---

*Last updated: 2026-10-21*
