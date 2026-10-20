# RWAFFLE × Lady Liberty 🗽🔥

**$LIBERTY** | Launching on **Torch**

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
   - Example: sending $2 worth of supported dust → **200 tickets**

### Step 3 — Check
Users visit **RWAFFLE.com**, paste their wallet address, and instantly see:
- Their current ticket balance
- Deposit history
- Past winnings

**No connecting. No signing. No account.**

### Step 4 — Win
When a raffle ends, a smart contract uses **verifiable on-chain randomness** to select a winning ticket. The prize is sent directly to the winner's original wallet address — automatically. No claim step.

---

## The Technical Cleverness

ERC-20 tokens don't automatically notify the receiving contract when transferred. The backend solves this by:
1. Watching blockchain `Transfer` events directly
2. Recording corresponding tickets in a **verifiable on-chain registry**
3. Using Chainlink VRF for provably fair draws

Users never see any of this — they just send tokens.

---

## $LIBERTY Token

$LIBERTY is the heart of the ecosystem. It's not just a meme — it has real utility:

- **Buyback mechanism:** A portion of every RWAFFLE prize pool goes toward buying $LIBERTY from the open market
- **Ties platform activity to token value:** More dust sent → more raffles → more buybacks → upward pressure on $LIBERTY
- **Your wallet = your raffle account** — wallet address becomes your identity automatically

---

## Supported Tokens

Initially supported tokens will include major ERC-20s. Unsupported tokens sent to the contract will not earn tickets. Transfers from centralized exchanges may not correctly attribute tickets to your wallet — **self-custody wallets only**.

*Full supported token list to be published at launch.*

---

## Key Details

| | |
|---|---|
| **Platform** | Torch (EVM-compatible blockchain) |
| **Token** | $LIBERTY (ERC-20) |
| **Registry** | On-chain ticket registry (wallet = raffle account) |
| **Randomness** | Chainlink VRF (verifiable on-chain randomness) |
| **Frontend** | RWAFFLE.com (read-only, no wallet connection needed) |
| **Indexer** | Off-chain, monitors Torch blockchain events |
| **Wallet Requirement** | Self-custody only (Ledger, MetaMask, etc.) |

---

*Last updated: 2026-10-19*
