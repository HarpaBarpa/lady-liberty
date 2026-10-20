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

**No pigeons.** The original RWAFFLE pigeon mascot is gone.

---

## $LIBERTY Token

Launched via Torch Launchpad on Robinhood Chain in one transaction. No custom Solidity needed.

**Key facts:**
- Supply: 1,000,000,000 fixed (no mint function)
- Buy tax: 3% (only on buys, fixed forever — Torch enforces this)
- Sell tax: 0% (Torch never taxes sells)
- Liquidity: locked forever via Torch launchpad
- No owner, no pause, no blacklist
- Address ends in `1111` (signature of a real Torch launch)

**Tokenomics (finalized):**
- **Buy tax: 3% total**, split:
  - 0.90% → Torch Protocol (30% of tax)
  - 0.50% → $LIBERTY Buyback & Burn (creator split)
  - 1.35% → RWA Raffle Vault (creator split — core utility)
  - 0.25% → Development / Marketing (creator split)
- Pair asset: $TORCH ("fuel the torch" narrative)
- Dev buy: 2% of supply (~0.05 ETH at launch)
- Anti-snipe: ON

**Torch constraints (non-negotiable):**
- 30% of all tax goes to Torch
- 70% of all tax goes to creator wallet
- Starting MC options: Degen (1 ETH) / Launch (2.5 ETH) / Steady (5 ETH)
- Recommended: **Launch (2.5 ETH)**

---

## Raffle — The Core Utility

**Hold to Enter. Dust to Boost. Every Hour.**

Every hour, three winners split the ETH prize vault.

| Parameter | Value |
|---|---|
| **Eligibility** | Hold any amount of $LIBERTY |
| **Entry boost** | Send any ERC-20 token to vault → USD value (oracle) → extra entry weight |
| **Draw frequency** | Hourly |
| **Winners per draw** | 3 |
| **Prize split** | 1st: 50% · 2nd: 30% · 3rd: 20% |
| **Prize currency** | ETH — sent directly to winners' wallets |
| **Vault funding** | 1.35% buy tax (auto) + dust coin deposits |

- Gas for dust deposits: paid by project where possible (frictionless entry)
- Vault has two funding streams: (1) 1.35% of every buy tax, (2) dust token deposits
- Prizes paid in ETH — no conversion, no swap

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

- **Frontend** (`frontend/`) — Next.js 16 app. Landing page with: hero, tokenomics, raffle section, waitlist, community, footer. Whitepaper at `/whitepaper`. Live at `libertytorch.online`.
- **Landing page** (`site/`) — static HTML "Climb to the Torch" concept page. Run with `python tools/serve.py` locally.
- **Launch artwork** (`design/artwork/`) — 8 social media formats in the Lady Liberty anime style. Pigeon-free.
- **Tokenomics analysis** (`TOKENOMICS.md`) — breakdown: flywheel, tax revenue projections, decisions.
- **Launch instructions** (`BUILD.md`) — step-by-step Torch launch guide.
- **Architecture spec** (`SPEC.md`) — system design for the full LibertyTorch ecosystem.

---

## Deployment Status

- **Domain:** `libertytorch.online` registered on Namecheap ✅
- **Frontend:** Built and live at `libertytorch.online` via Vercel ✅
- **GitHub repos:**
  - `HarpaBarpa/lady-liberty` — public, primary repo
  - `MJ1804/libertytorch` — public, Vercel-connected (auto-deploys on push)
- **Vercel project:** `libertytorch` under `mj1804s-projects` team ✅
- **NEXT_PUBLIC_LIBERTY_TOKEN_ADDRESS:** set as `PENDING_LAUNCH` in Vercel env vars ✅
- **$LIBERTY:** not launched yet

---

## Launch Checklist

### Before Launch
- [x] Register `libertytorch.online` — Martin, Namecheap
- [x] Deploy frontend to Vercel — `libertytorch.online` live
- [x] Write and publish whitepaper — `libertytorch.online/whitepaper`
- [x] Add `NEXT_PUBLIC_LIBERTY_TOKEN_ADDRESS` env var to Vercel
- [x] Finalize tokenomics: 3% buy tax, Torch 0.90% / Buyback 0.50% / Raffle 1.35% / Dev 0.25%
- [x] Finalize raffle mechanics: hold-to-enter, dust boosts, hourly, 3 winners, 50/30/20, ETH prizes
- [ ] Deposit ETH on Robinhood Chain (~0.00015 ETH for launch fee)
- [ ] Launch $LIBERTY via Torch → save address (ends `1111`)

### After Token Launch
- [ ] Update `NEXT_PUBLIC_LIBERTY_TOKEN_ADDRESS` env var on Vercel with real address
- [ ] Redeploy on Vercel
- [ ] Set up dust deposit vault address + oracle integration (post-launch)
- [ ] Social launch: Twitter/X, Telegram
- [ ] CoinGecko listing application

---

## Open Decisions

- [x] Final tokenomics: 3% buy tax, split confirmed
- [x] Raffle mechanics: hold-to-enter + dust boost, hourly, 3 winners, ETH prizes
- [x] Raffle vault address: TBD (post-launch build)
- [x] Social accounts: Twitter/X handle, Telegram group
- [ ] Robinhood Chain RPC URL + chain ID
- [ ] Dust deposit vault smart contract + oracle (CoinGecko pricing)

---

## Open Questions (Torch / Robinhood Chain)

- Robinhood Chain RPC URL + chain ID — need for dust vault contract deployment
- Current $TORCH price — to estimate actual USD revenue projections
- Where to buy ETH on Robinhood Chain

---

## What's NOT (RWAFFLE is gone)

The original concept included RWAFFLE — a custom raffle system where users sent crypto dust to earn raffle tickets. **That direction is abandoned.** LibertyTorch is the token + brand + on-site raffle utility. RWAFFLE smart contracts in `code/` are not being pursued.

---

*Last updated: 2026-10-20*
