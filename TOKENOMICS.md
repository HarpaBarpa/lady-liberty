# $LIBERTY Tokenomics Breakdown

**Launch platform:** Torch Launchpad → Robinhood Chain  
**Token address ends:** `1111`  
**Date:** 2026-10-20

---

## 1. Hard Constraints (Torch, non-negotiable)

These are baked into Torch — we don't get to change them.

| Parameter | Value |
|---|---|
| **Total supply** | 1,000,000,000 (fixed — no mint function exists) |
| **Smart contract** | No owner, no pause, no blacklist |
| **Liquidity** | 100% of supply into Uniswap v4 pool at launch, locked forever |
| **Buy tax** | 1–10% (set at launch, fixed forever, **only on buys**) |
| **Sell tax** | None (Torch only taxes buys, never sells) |
| **Tax to Torch** | 30% of all tax collected |
| **Tax to us** | 70% of all tax — we choose where: Creator / Burn / Holders / Liquidity |
| **Anti-snipe** | ON by default (80% tax → normal in 15–30s) |
| **Launch fee** | 0.00015 ETH (Quick launch) |
| **Dev buy** | Optional — buy supply at launch price, no tax |

---

## 2. Decisions We Need to Make

### 2.1 Preset — Starting Market Cap

| Preset | Starting MC | What it means |
|---|---|---|
| **Degen** | 1 ETH | Most tokens/ETH early, fastest price moves, highest risk |
| **Launch** | 2.5 ETH | Balanced — the default |
| **Steady** | 5 ETH | Calmer chart, more ETH in pool as it grows |

**Recommendation: Launch (2.5 ETH).**
- Not as pump-and-dump as Degen
- "Launch Complete" at 10x = 25 ETH market cap (~$50k at today's ETH), which feels achievable
- Liberty isn't a degen token — it's a real project with utility
- Steady is too conservative for a community token launch

---

### 2.2 Buy Tax Rate

**Decision: 3% Total Buy Tax**
- 1.00% to Torch protocol
- 1.00% to $LIBERTY buyback & burn
- 0.85% to RWA raffle funding
- 0.15% to Development / marketing

*(Note: Torch Launchpad only allows a 50/50 split between burn and creator at the contract level, so the 0.85% and 0.15% will be routed through the creator allocation and split manually.)*

---

### 2.3 Tax Destination

**Decision: 50% Burn / 50% Creator**
- Torch Launchpad strictly enforces this split structure.
- The 50% to Creator will be used to fund the RWA raffle (0.85% of volume) and Dev/Marketing (0.15% of volume).

---

### 2.4 Pair Asset

| Option | Rationale |
|---|---|
| **ETH** | Most liquidity, simplest, matches all Torch defaults |
| **$TORCH** | "Fuel the torch" narrative fits perfectly, attracts Torch community, earns $TORCH exposure |
| **USDG** | Stablecoin pair, less volatility |

**Recommendation: $TORCH.**
- "Fuel the torch" isn't just a tagline — pairing with $TORCH makes it literal
- Torch community already holds $TORCH = instant market
- Bought $LIBERTY with $TORCH = they're literally fueling our torch
- Tax payouts in $TORCH = even more torch fuel
- The narrative is too tight to pass up

---

### 2.5 Dev Buy

Optional: buy a portion of supply at launch price, no tax.

**Recommendation: Dev buy 2% of supply.**
- 20,000,000 $LIBERTY at launch price
- At 2.5 ETH MC: costs ~0.05 ETH (~$100)
- Gives us a small war chest for RWAFFLE prize pool seeding
- Can be sold strategically to fund operations later
- Small enough that it doesn't look greedy
- **Do NOT skip this** — having zero tokens means zero skin in the game

---

## 3. The Flywheel (Why This Works)

```
User sends dust → RWAFFLE contract
         ↓
RWAFFLE awards tickets
         ↓
Draw runs → winners paid + 10% buyback of $LIBERTY
         ↓
$LIBERTY buy pressure → price rises
         ↓
Creator tax revenue ($TORCH) from $LIBERTY trading → feeds prize pool
         ↓
Bigger prize pool → more RWAFFLE visibility
         ↓
More dust deposits → more buybacks
         ↓
More $LIBERTY demand → more trading → more tax → LOOP
```

The creator tax + RWAFFLE buyback = **two sources of buy pressure**, both feeding each other.

---

## 4. Proposed Tokenomics (Summary)

| Parameter | Decision | Why |
|---|---|---|
| **Preset** | Launch (2.5 ETH) | Balanced risk/reward |
| **Buy tax** | 3% | 1% Torch, 1% burn, 0.85% raffle, 0.15% dev |
| **Tax destination** | Creator (split post-launch) | Split manually to fund raffle/dev |
| **Pair asset** | $TORCH | "Fuel the torch" narrative |
| **Dev buy** | 2% of supply | ~0.05 ETH, skin in the game |
| **Anti-snipe** | ON | Default — protects launch |
| **Quick launch fee** | 0.00015 ETH | Payable from any Robinhood Chain wallet |

---

## 5. Revenue Projections (Conservative)

Assumptions: 2.5 ETH launch, daily volume settles to 2–5 ETH after launch hype.

| Scenario | Daily volume | Monthly tax (our 70%) | Monthly RWAFFLE prize pool (if 50% of tax) |
|---|---|---|---|
| Low | 1 ETH/day | ~8.4 $TORCH | ~4.2 $TORCH |
| Base | 3 ETH/day | ~25.2 $TORCH | ~12.6 $TORCH |
| Strong | 10 ETH/day | ~84 $TORCH | ~42 $TORCH |

These numbers grow as $LIBERTY price grows — the same volume at 10x MC = 10x the tax revenue in dollar terms.

---

## 6. What We Commit to Publicly

For the launch announcement and token page:

1. **"70% of buy tax feeds the RWAFFLE prize pool"** — transparent, verifiable on-chain
2. **"Paired with $TORCH — literally fueling the torch"** — narrative alignment
3. **"No sell tax, no mint, liquidity locked forever"** — safety bullets
4. **"Dev buy: 2% — skin in the game, not a cash grab"** — honest about our position

---

## 7. Open Questions (Still Need Answers)

- [ ] Robinhood Chain RPC + chain ID — need this before launch
- [ ] Current $TORCH price — to estimate actual USD values
- [ ] ETH on Robinhood Chain — where to buy/deposit
- [ ] RWAFFLE.com domain — registered yet?
- [ ] Timing — launch token first, then RWAFFLE contract, or simultaneous?

---

*This is a draft. Nothing is locked until Martin says "launch."*