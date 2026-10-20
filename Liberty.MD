# RWAFFLE × Lady Liberty 🗽🔥

**$LIBERTY** | Launching on **Torch** · Robinhood Chain

---

## What Is This?

RWAFFLE turns worthless crypto dust into a second chance at winning big. Instead of leaving tiny, forgotten token balances sitting in your wallet, simply send your unwanted crypto to the RWAFFLE smart contract and automatically receive raffle tickets based on their eligible value.

**No wallet connections. No sign-ups. No complicated swaps. Just send and you're in.**

Powered by **Lady Liberty**, a portion of the proceeds fuels **$LIBERTY buybacks**, creating a direct connection between platform activity and the token's value. It's a simple idea: **liberate your dust, fuel the torch, and give forgotten crypto a shot at a new life.**

---

## How It Works

### Step 1 — Send
Users send unwanted ERC-20 tokens to the RWAFFLE smart contract's public deposit address — just like a normal crypto transfer. Any compatible wallet works.

### Step 2 — Earn Tickets
Behind the scenes:
1. An automated blockchain indexer monitors incoming `Transfer` events
2. It identifies the token, amount, and sender's wallet
3. It checks whether the token is supported and fetches live market prices
4. It automatically credits raffle tickets to the sender's wallet address
   - Example: sending $2 worth of supported dust → **200 tickets** (at 100 tickets per dollar)

### Step 3 — Check
Users visit **RWAFFLE.com**, paste their wallet address, and instantly see their current ticket balance, deposit history, and past winnings. **No connecting. No signing. No account.**

### Step 4 — Win
When a raffle ends, a smart contract uses **verifiable on-chain randomness** to select a winning ticket. The prize is sent directly to the winner's original wallet address — automatically. No claim step.

---

## $LIBERTY Token

$LIBERTY is the heart of the ecosystem. It's not just a meme — it has real utility:

- **Buyback mechanism:** A portion of every RWAFFLE prize pool goes toward buying $LIBERTY from the open market
- **Creator tax:** 70% of the 4% buy tax on $LIBERTY trades flows to the creator wallet, which is committed to funding the RWAFFLE prize pool
- **Ties platform activity to token value:** More dust sent → more raffles → more buybacks → upward pressure on $LIBERTY
- **Your wallet = your raffle account** — wallet address becomes your identity automatically

---

## The Flywheel

```
User sends dust → RWAFFLE contract
         ↓
Indexer credits tickets
         ↓
Draw runs → winners paid in kind + 10% → $LIBERTY buyback
         ↓
$LIBERTY buy pressure
         ↓
Creator tax ($TORCH) from $LIBERTY trades → feeds prize pool
         ↓
Bigger prize pool → more visibility → more deposits
         ↓
More dust + more $LIBERTY buys → more tax → LOOP
```

---

## Supported Tokens

Initially supported tokens will include major ERC-20s. Unsupported tokens sent to the contract will not earn tickets. Transfers from centralized exchanges may not correctly attribute tickets — **self-custody wallets only.**

*Full supported token list to be published at launch.*

---

## Key Details

| | |
|---|---|
| **Platform** | Torch (Robinhood Chain) |
| **Token** | $LIBERTY (ERC-20, via Torch launchpad) |
| **Supply** | 1,000,000,000 fixed (no mint) |
| **Buy tax** | 4% (fixed forever, only on buys) |
| **Tax to Torch** | 30% of tax |
| **Tax to us** | 70% of tax → creator wallet → RWAFFLE prize pool |
| **Pair asset** | $TORCH |
| **Liquidity** | Locked forever via Torch launchpad |
| **Registry** | On-chain ticket registry (wallet = raffle account) |
| **Randomness** | Chainlink VRF (verifiable on-chain) |
| **Frontend** | RWAFFLE.com (read-only, no wallet needed) |
| **Indexer** | Off-chain, monitors Robinhood Chain events |

---

## Open Decisions (Still Being Decided)

- Robinhood Chain RPC URL + chain ID
- Chainlink VRF availability on Robinhood Chain
- Supported token list + contract addresses
- Final payout split (draft: 35/20/12/8/6/5/4/3/2/1 = 96%, 4% TBC)
- Who receives the 2% protocol fee
- Oracle price feed details

---

*Last updated: 2026-10-20*
