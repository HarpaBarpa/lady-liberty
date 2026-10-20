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
- Buy tax: 4% (only on buys, fixed forever — Torch enforces this)
- Sell tax: 0% (Torch never taxes sells)
- Liquidity: locked forever via Torch launchpad
- No owner, no pause, no blacklist
- Address ends in `1111` (signature of a real Torch launch)

**Tokenomics (proposed):**
- Tax destination: Creator → community wallet → community decisions
- Pair asset: $TORCH (fuels the torch narrative)
- Dev buy: 2% of supply (~0.05 ETH at launch)
- Anti-snipe: ON

**Torch constraints (non-negotiable):**
- 30% of all tax goes to Torch
- 70% of all tax goes to creator wallet
- Starting MC options: Degen (1 ETH) / Launch (2.5 ETH) / Steady (5 ETH)
- Recommended: Launch (2.5 ETH)

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

- **Frontend** (`frontend/`) — Next.js 16 app. Landing page with: hero, tokenomics, about, waitlist, community sections. Built for LibertyTorch. Set up for Vercel deployment.
- **Landing page** (`site/`) — static HTML "Climb to the Torch" concept. Run with `python tools/serve.py` locally.
- **Launch artwork** (`design/artwork/`) — 8 social media formats in the Lady Liberty anime style. Pigeon-free.
- **Tokenomics analysis** (`TOKENOMICS.md`) — full breakdown: flywheel, tax revenue projections, decisions.
- **Launch instructions** (`BUILD.md`) — step-by-step Torch launch guide.
- **Architecture spec** (`SPEC.md`) — system design for the full LibertyTorch ecosystem.

---

## Deployment Status

- **Domain:** `libertytorch.online` registered on Namecheap ✅
- **Frontend:** Built and pushed to GitHub, ready for Vercel import
- **Vercel:** Not yet connected — repo is private under HarpaBarpa account

**To get Vercel connected (ACTION NEEDED):**
1. Make the repo public: https://github.com/HarpaBarpa/lady-liberty → Settings → Danger Zone → Change visibility → Public
2. Or: go to Settings → Access Management → add Vercel's GitHub App access to the repo
3. Then import to Vercel: vercel.com/new → Import `HarpaBarpa/lady-liberty` → set root directory to `frontend`
4. Add domain `libertytorch.online` in Vercel → Domains

---

## Launch Checklist

### Before Launch
- [x] Register `libertytorch.online` — Martin, Namecheap
- [ ] Make GitHub repo public OR add Vercel GitHub App access
- [ ] Import frontend to Vercel → point `libertytorch.online` at it
- [ ] Finalize tokenomics: buy tax %, tax destination, pair asset
- [ ] Create Lady Liberty artwork for Torch token page
- [ ] Deposit ETH on Robinhood Chain
- [ ] Launch $LIBERTY via Torch → save address (ends `1111`)

### After Token Launch
- [ ] Set `NEXT_PUBLIC_LIBERTY_TOKEN_ADDRESS` env var on Vercel
- [ ] Get Robinhood Chain RPC URL + chain ID
- [ ] Social launch: Twitter/X, Telegram
- [ ] CoinGecko listing application

---

## Open Decisions

- Final tokenomics (tax %, destination, pair asset)
- Who controls the creator wallet / community fund
- Social accounts: Twitter/X handle, Telegram group
- Community building strategy

---

## Open Questions (Torch / Robinhood Chain)

- Robinhood Chain RPC URL + chain ID
- Current $TORCH price (for USD revenue estimates)
- Where to buy ETH on Robinhood Chain

---

## What's NOT (RWAFFLE is gone)

The original concept included RWAFFLE — a custom raffle system where users sent crypto dust to earn raffle tickets. That direction is abandoned. LibertyTorch is the token + brand only. RWAFFLE smart contracts in `code/` are not being pursued.

---

*Last updated: 2026-10-20*
