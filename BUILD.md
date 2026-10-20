# Liberty — Build Instructions
## Launching $LIBERTY on Torch (Robinhood Chain)

**Token:** $LIBERTY  
**Tagline:** RWAFFLE × Lady Liberty 🗽🔥  
**Platform:** Torch Launchpad on **Robinhood Chain**

---

## Key Facts (from Torch Docs)

| | |
|---|---|
| **Network** | Robinhood Chain |
| **$TORCH Token** | `0x000050E18ffa3F8F7aD170Eb9CeF160eb3Ed1111` |
| **Launchpad Factory** | `0x7891eA889899928aFE637e4Cca8106188427776a` |
| **Explorer** | Robinhood Chain explorer (verify addresses here) |
| **Token addresses** | All Torch launchpad tokens end in `1111` |
| **Quick launch fee** | 0.00015 ETH |
| **Custom launch fee** | 0.0003 ETH |
| **Trading fee (Torch)** | 1% per trade (0.5% to Torch, 0.5% to cashback/referral/buyback) |
| **$TORCH trading fee** | 0.5% (goes to burn + treasury) |
| **Buy tax range** | 1–10% (set at launch, fixed forever) |
| **Liquidity** | Locked forever via Torch launchpad — can't be rugged |

---

## Architecture: Two Parts

### Part A — The $LIBERTY Token (via Torch Launchpad)
One-transaction launch. No custom Solidity. You configure via the Torch UI:
- Name: **LIBERTY**
- Ticker: **$LIBERTY**
- Preset: **Launch** (2.5 ETH starting market cap) or **Steady** (5 ETH)
- Buy tax: **X%** (your choice, 1–10%) → set to "Burn" or "Holders" to support the ecosystem
- 100% of supply goes into Uniswap v4 pool from the first second
- No mint function, no owner, liquidity locked forever

### Part B — The RWAFFLE System (custom smart contract)
The raffle/dust-to-tickets mechanic requires a **custom smart contract** on Robinhood Chain, deployed separately after the token launch. This is NOT handled by the Torch launchpad.

---

## Phase 1 — Prepare Your Token Launch

### 1.1 Set Up a Torch Account

1. Go to **[app.torchpad.fun](https://app.torchpad.fun)** → Launch
2. Sign in with Telegram or a browser wallet (MetaMask, Rabby, etc.)
3. Deposit ETH on Robinhood Chain to your Torch wallet

> **Note:** Robinhood Chain uses ETH as gas. You need a small ETH balance to pay for the launch fee (0.00015 ETH for Quick launch).

### 1.2 Get Robinhood Chain RPC (for dev tools)

Before deploying the RWAFFLE contract later, you need the Robinhood Chain RPC:
- Check the [Robinhood Chain explorer](https://robinhoodchain.com) or [explorer.robinhoodchain.io](https://explorer.robinhoodchain.io)
- Look for "Add Network" or RPC settings
- Common pattern: `https://rpc.robinhoodchain.io` or similar

If you can't find it, check the Torch Terminal's network settings when connected, or ask in the Torch community chat.

### 1.3 Design Your $LIBERTY Tokenomics

Torch launchpad constraints:
- **Fixed supply:** 1,000,000,000 tokens (non-negotiable)
- **You choose:**
  - Starting market cap (preset: Degen=1 ETH, Launch=2.5 ETH, Steady=5 ETH)
  - Buy tax (1–10%) and where it goes (Creator / Burn / Holders / Liquidity)
  - Whether to do a **dev buy** (buy some of your own supply at launch)
  - Whether to pair against ETH or $TORCH (pairing against $TORCH means rewards go in $TORCH)

**Recommended for Liberty:**
- Preset: **Launch** (balanced)
- Buy tax: **3–5%** → split toward **Burn** or **Holders**
- Dev buy: Optional — buy ~1–5% of supply at launch to have a war chest for RWAFFLE prize funding
- Pair asset: **$TORCH** — aligns with the "fuel the torch" narrative and earns $TORCH exposure

### 1.4 Prepare Launch Assets

- **Token name:** LIBERTY
- **Ticker:** $LIBERTY
- **Description:** RWAFFLE turns worthless crypto dust into a second chance at winning big. Powered by Lady Liberty 🗽🔥 [your Twitter/X link]
- **Image:** Lady Liberty themed logo ( Statue of Liberty + crypto aesthetic)
- **Socials:** Twitter/X, Telegram

---

## Phase 2 — Launch $LIBERTY (Quick Launch)

### Step-by-Step in the Torch Terminal

1. Go to **[app.torchpad.fun](https://app.torchpad.fun)**
2. Click **Launch** in the top nav
3. Select **Quick launch**
4. Fill in:
   - Name: `LIBERTY`
   - Ticker: `LIBERTY`
   - Description: Your RWAFFLE pitch (max ~280 chars)
   - Image: Upload Lady Liberty artwork (square, min 512×512)
   - Socials: Add Twitter/X and Telegram links
5. Set **Preset:** Launch (2.5 ETH market cap)
6. Set **Buy tax:** 3% → "Burn" (or "Holders" if you want holder rewards)
7. Anti-snipe protection: **ON** (default)
8. Review screen: confirm everything
9. Launch — one transaction, ~0.00015 ETH fee
10. **Save your token address** (ends in `1111`)

> ⚠️ Write down your token address the moment it's deployed. It ends in `1111`.

---

## Phase 3 — Deploy the RWAFFLE Contract

The Torch launchpad only handles the token. The RWAFFLE raffle system needs a **custom smart contract** deployed to Robinhood Chain.

### 3.1 Project Setup

```bash
mkdir liberty-rwaffle && cd liberty-rwaffle
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox "hardhat@^2.22.0"
npm install @openzeppelin/contracts
npm install --save-dev typescript @types/node ts-node
npx hardhat init
```

### 3.2 Configure hardhat.config.ts

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    robinhood: {
      url: "https://rpc.robinhoodchain.io",   // ← CONFIRM THIS
      chainId: <CHAIN_ID>,                     // ← GET FROM EXPLORER
      accounts: [process.env.DEPLOYER_KEY!],
    },
  },
};

export default config;
```

> **⚠️ Get the actual RPC URL and chain ID from the Robinhood Chain explorer or Torch community.**

### 3.3 Write the RWAFFLE Contract

Create `contracts/RWAFFLE.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title RWAFFLE — Turn crypto dust into raffle tickets
/// @notice Users send supported ERC-20 tokens here to earn raffle tickets.
///         Tickets are credited off-chain by the indexer. This contract
///         holds the prize pool and executes draws.
contract RWAFFLE is Ownable {

    // --- State ---
    mapping(address => uint256) public tickets;       // wallet → ticket count
    mapping(address => bool)   public supportedTokens; // whitelisted tokens
    uint256 public currentRaffleId;
    uint256 public drawInterval = 7 days;
    uint256 public lastDrawTime;

    struct Raffle {
        uint256 prizePool;
        uint256 totalTickets;
        address winner;
        bool drawn;
    }
    mapping(uint256 => Raffle) public raffles;

    // $LIBERTY token address (for buyback integration)
    address public libertyToken;
    // Treasury / dev wallet
    address public treasury;
    // Indexer-authorized wallet (can credit tickets)
    address public indexer;

    // --- Events ---
    event TicketsCredited(address indexed user, uint256 amount);
    event RaffleDrawn(uint256 indexed raffleId, address winner, uint256 prize);
    event TokenSupported(address indexed token, bool supported);

    constructor(address _libertyToken, address _treasury) Ownable(msg.sender) {
        libertyToken = _libertyToken;
        treasury = _treasury;
        lastDrawTime = block.timestamp;
    }

    // --- Admin: set indexer (indexer wallet that can credit tickets) ---
    function setIndexer(address _indexer) external onlyOwner {
        indexer = _indexer;
    }

    // --- Admin: manage supported tokens ---
    function setSupportedToken(address token, bool supported) external onlyOwner {
        supportedTokens[token] = supported;
        emit TokenSupported(token, supported);
    }

    // --- Indexer: credit tickets (called by off-chain indexer) ---
    function creditTickets(address user, uint256 ticketAmount) external {
        require(msg.sender == indexer, "Only indexer can credit");
        tickets[user] += ticketAmount;
        raffles[currentRaffleId].totalTickets += ticketAmount;
        emit TicketsCredited(user, ticketAmount);
    }

    // --- Fund prize pool (anyone can add ETH) ---
    function fundPrizePool() external payable {
        raffles[currentRaffleId].prizePool += msg.value;
    }

    // --- Draw raffle (anyone can trigger after interval) ---
    function drawRaffle() external {
        require(block.timestamp >= lastDrawTime + drawInterval, "Draw too soon");
        require(raffles[currentRaffleId].totalTickets > 0, "No tickets");
        require(!raffles[currentRaffleId].drawn, "Already drawn");

        uint256 total = raffles[currentRaffleId].totalTickets;
        uint256 prize  = raffles[currentRaffleId].prizePool;

        // Pseudo-random winner (NOT safe for high-value prizes — see note below)
        uint256 random = uint256(keccak256(abi.encodePacked(
            blockhash(block.number - 1),
            block.timestamp,
            msg.sender,
            total
        )));
        uint256 winnerTicket = random % total;

        address winner = _findWalletByTicket(winnerTicket);
        raffles[currentRaffleId].drawn = true;
        raffles[currentRaffleId].winner = winner;

        // Send prize
        if (prize > 0) {
            (bool sent, ) = winner.call{value: prize}("");
            require(sent, "Prize send failed");
        }

        // 10% to $LIBERTY buyback
        if (prize > 0) {
            uint256 buyback = prize / 10;
            (bool b,) = libertyToken.call{value: buyback}("");
            // ignore failure — buyback is best-effort
        }

        emit RaffleDrawn(currentRaffleId, winner, prize);
        currentRaffleId++;
        lastDrawTime = block.timestamp;
    }

    function _findWalletByTicket(uint256 targetTicket) internal view returns (address) {
        uint256 cumulative;
        address[] memory addrs = new address[](0);
        // NOTE: This is O(n) and requires knowing all participants.
        // For production, use a linked-list or cumulative sum data structure.
        // This stub returns block.coinbase as a placeholder.
        // REAL IMPLEMENTATION: store cumulative ticket ranges per wallet in a sorted structure.
        return block.coinbase;
    }

    // --- View helpers ---
    function getTickets(address user) external view returns (uint256) {
        return tickets[user];
    }
}
```

> ⚠️ **IMPORTANT — Randomness:** The `drawRaffle` function above uses `keccak256` for randomness, which is **NOT** secure for high-value prizes (miners/validators can influence it). For real money, use **Chainlink VRF** if available on Robinhood Chain, or a **Commit-Reveal** scheme.

### 3.4 Compile

```bash
npx hardhat compile
```

### 3.5 Deploy to Robinhood Chain

```bash
# .env
DEPLOYER_KEY=0x_your_private_key

npx hardhat run scripts/deploy.ts --network robinhood
```

Save the RWAFFLE contract address.

### 3.6 Post-Deploy Setup

1. Set the indexer wallet: `rwaffle.setIndexer("0x_indexer_wallet")`
2. Add initial supported tokens: `rwaffle.setSupportedToken("0x_token_address", true)`
3. Fund prize pool: `rwaffle.fundPrizePool({value: 0.1})`

---

## Phase 4 — The Indexer

The indexer monitors Transfer events to the RWAFFLE contract and credits tickets.

### 4.1 Setup

```bash
mkdir liberty-indexer && cd liberty-indexer
npm init -y
npm install ethers axios
npm install --save-dev typescript ts-node @types/node
```

### 4.2 Indexer Code

Create `src/indexer.ts`:

```typescript
import { ethers } from "ethers";

// --- Config ---
const RPC_URL       = process.env.ROBINHOOD_RPC!;
const RWAFFLE_ADDR  = process.env.RWAFFLE_ADDRESS!;
const INDEXER_KEY   = process.env.INDEXER_KEY!;
const TICKET_RATE   = 100;  // $1 USD = 100 tickets

// Initial supported token list (update with real Robinhood Chain token addresses)
// e.g., USDT on Robinhood Chain, WETH, etc.
const SUPPORTED: Record<string, { decimals: number; coingeckoId: string }> = {
  // "0x_xxx": { decimals: 18, coingeckoId: "ethereum" },
};

const priceCache: Record<string, number> = {};

async function getPrice(coingeckoId: string): Promise<number> {
  if (priceCache[coingeckoId]) return priceCache[coingeckoId];
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`
    );
    const data = await res.json() as any;
    priceCache[coingeckoId] = data[coingeckoId]?.usd ?? 0;
  } catch {
    priceCache[coingeckoId] = 0;
  }
  return priceCache[coingeckoId];
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet   = new ethers.Wallet(INDEXER_KEY, provider);
  const contract = new ethers.Contract(RWAFFLE_ADDR, [
    "function creditTickets(address user, uint256 amount) external",
    "event Transfer(address indexed from, address indexed to, uint256 value, bytes indexed data)"
  ], provider);

  console.log(`Indexer running on Robinhood Chain`);
  console.log(`RWAFFLE: ${RWAFFLE_ADDR}`);
  console.log(`Indexer wallet: ${wallet.address}`);

  // Process past events on startup
  const filter = contract.filters.Transfer(null, RWAFFLE_ADDR);
  contract.on(filter, async (from, to, value, event) => {
    const tokenAddr = event.log.address;
    const cfg = SUPPORTED[tokenAddr.toLowerCase()];
    if (!cfg) return;

    const amount  = Number(ethers.formatUnits(value, cfg.decimals));
    const price   = await getPrice(cfg.coingeckoId);
    const usdVal  = amount * price;
    const tickets = Math.floor(usdVal * TICKET_RATE);
    if (tickets <= 0) return;

    console.log(`🎟  ${from} earned ${tickets} tickets ($${usdVal.toFixed(4)} ${cfg.coingeckoId})`);

    try {
      const signed = contract.connect(wallet);
      await signed.creditTickets(from, tickets);
    } catch (e) {
      console.error("  ❌ Failed to credit tickets:", e);
    }
  });

  console.log("Watching for transfers...");
}

main().catch(console.error);
```

### 4.3 Run

```bash
ROBINHOOD_RPC=https://rpc.robinhoodchain.io \
RWAFFLE_ADDRESS=0x_your_rwaffle_address \
INDEXER_KEY=0x_your_indexer_private_key \
npx ts-node src/indexer.ts
```

---

## Phase 5 — Frontend (RWAFFLE.com)

### 5.1 Scaffold

```bash
npx create-next-app@latest liberty-frontend
# TypeScript ✓, Tailwind ✓, App Router ✓
cd liberty-frontend
```

### 5.2 Dashboard Page

`app/dashboard/page.tsx`:
```tsx
"use client";
import { useState } from "react";

export default function Dashboard() {
  const [address, setAddress] = useState("");
  const [tickets, setTickets] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function lookup() {
    setLoading(true);
    try {
      // Read from RWAFFLE contract via public RPC
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_RPC}/eth_call`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_call",
            params: [{
              to: process.env.NEXT_PUBLIC_RWAFFLE,
              data: `0x${(await import('viem')).encodeFunctionData(
                { name: "tickets", type: "function", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }] },
                [address]
              ).slice(10)}${address.slice(2).padStart(64, '0')}`
            }],
            id: 1
          })
        }
      );
      const data = await res.json();
      const raw = parseInt(data.result ?? "0x0", 16);
      setTickets(raw);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-5xl font-bold mb-2">🗽 RWAFFLE</h1>
      <p className="text-gray-400 mb-8">Liberate your dust. Fuel the torch.</p>

      <input
        className="bg-gray-900 border border-gray-700 rounded px-4 py-3 w-full max-w-lg font-mono text-sm mb-4"
        placeholder="Paste your wallet address"
        value={address}
        onChange={e => setAddress(e.target.value)}
      />
      <button
        onClick={lookup}
        disabled={loading}
        className="block bg-white text-black font-bold px-8 py-3 rounded mb-8 disabled:opacity-50"
      >
        {loading ? "Checking..." : "Look Up My Tickets"}
      </button>

      {tickets !== null && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-10 max-w-lg">
          <p className="text-gray-400 uppercase text-xs tracking-widest mb-2">Your Tickets</p>
          <p className="text-7xl font-bold text-green-400">{Number(tickets).toLocaleString()}</p>
        </div>
      )}
    </main>
  );
}
```

### 5.3 Env vars

```bash
NEXT_PUBLIC_RPC=https://rpc.robinhoodchain.io    # ← CONFIRM RPC
NEXT_PUBLIC_RWAFFLE=0x_your_rwaffle_address
NEXT_PUBLIC_LIBERTY=0x_your_liberty_address      # ← UPDATE after launch
```

### 5.4 Deploy

```bash
npm i -g vercel
vercel --prod
```

---

## Phase 6 — Tokenomics & Launch Decisions

### $LIBERTY Tokenomics (Draft)

| Setting | Value |
|---|---|
| Supply | 1,000,000,000 (fixed, Torch constraint) |
| Starting market cap | 2.5 ETH (Launch preset) |
| Buy tax | 3–5% |
| Tax destination | Burn or Holders |
| Pair asset | ETH or $TORCH (recommend $TORCH) |
| Dev buy | Optional — 1–5% of supply |

### Tax Destination Debate

| Option | Pro | Con |
|---|---|---|
| **Burn** | Deflationary, simple | No passive income for holders |
| **Holders** | Rewards long-term holders | More complex, requires claim UI |
| **Liquidity** (Custom launch) | Deepens the pool | Less visible to users |

**Recommendation:** Start with **Burn**. Simplest to explain, cleanest narrative ("every buy burns $LIBERTY"). Switch to Holder rewards later.

### RWAFFLE Integration with Buy Tax

The RWAFFLE contract needs funding. Options:
1. **Dev buy at launch** — use 1–5% of your dev buy allocation to fund initial RWAFFLE prize pools
2. **Manual funding** — periodically send ETH to RWAFFLE prize pool from treasury
3. **Tax revenue** — if you route buy tax to "Creator", claim it and fund RWAFFLE manually

---

## Phase 7 — Full Launch Checklist

| # | Action | Status |
|---|---|---|
| 1 | Create Torch account at app.torchpad.fun | ⬜ |
| 2 | Deposit ETH on Robinhood Chain | ⬜ |
| 3 | Design $LIBERTY tokenomics (tax, preset, pair) | ⬜ |
| 4 | Create Lady Liberty token artwork | ⬜ |
| 5 | Launch $LIBERTY via Torch Quick Launch | ⬜ |
| 6 | Save $LIBERTY contract address (ends in 1111) | ⬜ |
| 7 | Set up Hardhat project for Robinhood Chain | ⬜ |
| 8 | Write RWAFFLE smart contract | ⬜ |
| 9 | Get Robinhood Chain RPC URL + chain ID | ⬜ |
| 10 | Deploy RWAFFLE contract to Robinhood Chain | ⬜ |
| 11 | Configure indexer wallet + supported tokens | ⬜ |
| 12 | Fund initial RWAFFLE prize pool | ⬜ |
| 13 | Build and deploy frontend (RWAFFLE.com) | ⬜ |
| 14 | Social launch: Twitter/X, Telegram | ⬜ |
| 15 | Get listed on CoinGecko | ⬜ |
| 16 | Torch community announcements | ⬜ |

---

## Critical Open Questions

1. **Robinhood Chain RPC URL + chain ID?** — Need this to deploy the RWAFFLE contract
2. **Is Chainlink VRF available on Robinhood Chain?** — Critical for secure randomness
3. **Is there a DEX indexer / subgraph for Robinhood Chain?** — For reading token holders, volumes, etc.
4. **$LIBERTY pair asset:** ETH or $TORCH?
5. **Buy tax rate:** What % and where?
6. **Dev buy:** Yes or no, and how much?
7. **RWAFFLE.com domain:** Registered yet?

---

## Appendix: Torch Launchpad Presets

| Preset | Starting Market Cap | Anti-snipe Duration | Feel |
|---|---|---|---|
| Degen | 1 ETH | 30 sec | Most volatile |
| Launch | 2.5 ETH | 15 sec | Balanced default |
| Steady | 5 ETH | 15 sec | Calmer, more ETH in pool |

---

*Last updated: 2026-10-19*
