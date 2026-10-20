# Project Liberty — Specification

**Token:** $LIBERTY  
**Tagline:** RWAFFLE × Lady Liberty 🗽🔥  
**Launch Platform:** Torch Launchpad → **Robinhood Chain**

---

## 1. Concept & Vision

$LIBERTY transforms forgotten crypto dust into second chances. The ecosystem centers on RWAFFLE — users send unwanted ERC-20 tokens to the RWAFFLE contract and earn raffle tickets automatically. A portion of RWAFFLE proceeds fuel $LIBERTY buybacks, creating a self-sustaining token ecosystem with real utility.

Lady Liberty is the project's symbolic heart: liberation, second chances, turning forgotten things into meaningful wins.

---

## 2. Two-Part Architecture

**Torch handles the token.** The Torch Launchpad launches $LIBERTY on Robinhood Chain in a single transaction — no custom Solidity needed. Liquidity is locked forever, the token has no owner, and the buy tax is fixed at launch.

**RWAFFLE is custom.** The raffle/dust-to-tickets mechanic requires a separate smart contract deployed on Robinhood Chain. This is built after the token launch.

---

## 3. The $LIBERTY Token

**Launched via:** Torch Launchpad (app.torchpad.fun → Launch)  
**Network:** Robinhood Chain  
**Explorer:** robinhoodchain.io  

### Torch Launchpad Properties

| Setting | Torch Constraint |
|---|---|
| Supply | Fixed 1,000,000,000 (no mint) |
| Liquidity | Locked forever — can't be rugged |
| Token address | Ends in `1111` (signature of a real Torch launch) |
| Buy tax | 1–10%, fixed forever at launch |
| Sell tax | None (Torch only taxes buys) |
| Owner | None — no mint, no pause, no blacklist |

### Key Contracts

| Contract | Address |
|---|---|
| $TORCH (platform token) | `0x000050E18ffa3F8F7aD170Eb9CeF160eb3Ed1111` |
| Torch Launchpad Factory | `0x7891eA889899928aFE637e4Cca8106188427776a` |
| $LIBERTY | `0x_____________1111` ← assigned at launch |

### Recommended Tokenomics

| Setting | Recommendation |
|---|---|
| Preset | **Launch** (2.5 ETH starting market cap) |
| Buy tax | **3–5%** |
| Tax destination | **Burn** (simplest, most deflationary narrative) |
| Pair asset | **$TORCH** (aligns with "fuel the torch" story) |
| Dev buy | Optional: 1–5% of supply |
| Anti-snipe | ON (default) |

---

## 4. The RWAFFLE System

### 4.1 Overview

RWAFFLE turns worthless crypto dust into raffle tickets. Users send unsupported tokens to the RWAFFLE contract address. An off-chain indexer monitors Transfer events, prices the tokens, and credits tickets to the sender's wallet address.

**No wallet connection. No sign-up. Just send and you're in.**

### 4.2 Smart Contract (RWAFFLE.sol)

Custom contract, deployed separately to Robinhood Chain.

**Core features:**
- `supportedTokens` registry (whitelist of eligible ERC-20 tokens)
- `tickets` mapping (wallet → ticket count)
- `creditTickets()` — called by indexer wallet only
- `fundPrizePool()` — anyone can add ETH to the prize pool
- `drawRaffle()` — triggerable draw with winner selection

**Randomness:**  
⚠️ keccak256-based randomness is NOT secure for high-value prizes. For production, use Chainlink VRF (if available on Robinhood Chain) or a Commit-Reveal scheme.

**Buyback integration:**
Each draw sends ~10% of the prize to the $LIBERTY token contract for buyback (if the token supports a receive/buyback function).

### 4.3 Off-Chain Indexer

**Responsibilities:**
1. Subscribe to `Transfer` events on Robinhood Chain where `to == RWAFFLE contract`
2. Validate token is in the supported list
3. Fetch token price (CoinGecko API)
4. Calculate USD value → ticket amount
5. Call `RWAFFLE.creditTickets(user, tickets)`

**Indexer wallet:** Dedicated key with permission to call `creditTickets()`. This is NOT the deployer key — restricted to one function only.

### 4.4 Frontend (RWAFFLE.com)

**Read-only** — users paste wallet address, see tickets, history, winnings. No wallet connection, no signatures.

---

## 5. System Flow

```
User sends supported tokens to RWAFFLE contract
         │
         ▼
Indexer detects Transfer event on Robinhood Chain
         │
         ▼
Indexer prices token via CoinGecko API
         │
         ▼
Indexer calls RWAFFLE.creditTickets(wallet, ticketCount)
         │
         ▼
Tickets credited to wallet (wallet = raffle account)
         │
         ▼
After draw interval → drawRaffle() called
         │
         ├── Winner selected (VRF / commit-reveal)
         ├── Prize sent to winner wallet
         └── 10% → $LIBERTY buyback
```

---

## 6. Robinhood Chain

| | |
|---|---|
| Network type | EVM-compatible blockchain |
| Gas token | ETH |
| Explorer | robinhoodchain.io (verify all addresses) |
| Token addresses | All Torch launchpad tokens end in `1111` |
| $TORCH | `0x000050E18ffa3F8F7aD170Eb9CeF160eb3Ed1111` |

---

## 7. Open Questions

1. **Robinhood Chain RPC + chain ID** — need this to deploy RWAFFLE contract
2. **Chainlink VRF on Robinhood Chain?** — needed for secure randomness
3. **Supported tokens for RWAFFLE** — initial list (what ERC-20s exist on Robinhood Chain?)
4. **Buy tax rate and destination** for $LIBERTY
5. **Pair asset:** ETH or $TORCH?
6. **RWAFFLE.com domain** — registered?
7. **Dev buy:** how much of the 1B supply?

---

## 8. Launch Timeline

```
Week 1-2:   Design $LIBERTY tokenomics + Lady Liberty artwork
Week 2:     Launch $LIBERTY via Torch (one transaction)
Week 2-3:   Build RWAFFLE contract + deploy to Robinhood Chain
Week 3:     Build indexer + frontend
Week 4:     Fund initial RWAFFLE prize pool
Week 4:     Launch RWAFFLE.com + social launch
Ongoing:    Community growth, token listings, RWAFFLE expansion
```

---

*Last updated: 2026-10-19*
