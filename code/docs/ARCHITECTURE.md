# LibertyTorch — On-Chain System Architecture

**Version:** 1.0
**Last updated:** 2026-10-20
**Source of truth:** Team raffle spec

---

## System Overview

Three smart contracts + one indexer service + a draw executor script.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LibertyTorch System                           │
│                                                                     │
│  ┌──────────────┐   wallet linking    ┌──────────────────────┐   │
│  │  Frontend    │──────────────────────│   LinkRegistry        │   │
│  │  (site/)     │   personal_sign      │   isLinked()          │   │
│  │              │   challenge/response │   getLinkedWallets()  │   │
│  └──────┬───────┘                      └──────────┬───────────┘   │
│         │                                          │               │
│         │ depositDust()                           │ vault calls    │
│         │ getDustEntries()                        │ getLinkedWallets()
│         ▼                                          ▼               │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      LibertyVault                              │ │
│  │  • Accepts dust ERC-20 deposits from LINKED secondary wallets│ │
│  │  • Converts USD value → dust entries (1 entry / $0.50)       │ │
│  │  • Caps at 5 entries per linked wallet per cycle (1 hour)     │ │
│  │  • Primary wallet earns ONLY base entry (1), never dust        │ │
│  │  • 2% protocol fee → _protocolFeeRecipient                    │ │
│  │  • Holds all dust assets                                       │ │
│  └──────────────────────────────┬─────────────────────────────────┘ │
│                                 │ vault.getDustEntries()             │
│                                 │ vault.getDustEntries()             │
│                                 ▼                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      LibertyRaffle                             │ │
│  │  • Owns the prize pool                                         │ │
│  │  • Indexer registers eligible $LIBERTY holders (base entry=1)  │ │
│  │  • Anyone can call checkAndDraw() every hour                   │ │
│  │  • Draw fires only when pool ≥ $50; skips if below (rolls)    │ │
│  │  • Weighted random draw: 10 unique winners                    │ │
│  │  • Payout draft [35,20,12,8,6,5,4,3,2,1]% → 96%              │ │
│  │  • 24h cooldown: winner + ALL linked wallets                  │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Dust Entry Flow
```
1. User connects primary wallet to frontend
2. Frontend generates challenge: keccak256(abi.encode(primary, nonce))
3. User signs challenge with secondary wallet (browser: personal_sign)
4. Frontend calls linkRegistry.linkWallet(primary, secondary, signature)
5. User sends ERC-20 dust tokens → vault.depositDust(token, amount)
6. Vault validates: token supported? amount > 0?
7. Vault takes 2% fee → protocolFeeRecipient
8. Vault credits: cycleDustContributions[secondary][cycleId][token] += netAmount
9. Vault calls _computeAndCreditDustEntries(primary)
10. For each linked wallet:
      cycleDustUsd = sum of all supported token contributions this cycle
      entries = min(floor(cycleDustUsd / $0.50), 5)
      dustEntriesEarned[wallet] = entries
11. Emit DustDeposited + DustEntriesCredited
```

### Raffle Entry Flow
```
1. Indexer monitors Transfer events on $LIBERTY contract
2. For any Transfer where to == LibertyRaffle:
     → registerEligibleAccount(recipient)
3. For any Transfer where from == LibertyRaffle:
     → deregister (remove from eligible set)
4. Indexer periodically calls vault.claimDustEntries() for all active accounts
   (or frontend calls it on behalf of each account)
5. Every hour, anyone calls raffle.checkAndDraw()
```

### Draw Flow
```
1. checkAndDraw() called (by cron, keeper, or frontend)
2. Time check: block.timestamp ≥ lastDrawTime + 1 hour?
3. Pool check: prizePoolCents ≥ $50?
   → NO:  emit SkippedBelowFloor, update lastDrawTime, return
   → YES: continue
4. Pause check: not paused?
5. Build eligible list:
     a. Start with all registered accounts
     b. Filter: NOT in cooldown
     c. Filter: $LIBERTY balance ≥ $10 (via oracle price)
     d. Compute: totalEntries[i] = 1 (base) + vault.getDustEntries(account)
6. Execute draw (10 winners):
     For i = 0 to 9:
       random = uint256(keccak256(abi.encodePacked(
                  block.prevrandao, block.timestamp, block.number + i, prizePoolCents
               )))
       target = random % remainingTotalEntries
       Scan cumulative sum → select winner
       Remove winner from pool, decrement totalEntries
       Record: winners[raffleId][i] = winner
       Record: prizes[raffleId][winner] = prizePoolCents * payoutDraft[i] / 10000
       Set cooldownUntil[winner] = block.timestamp + 24 hours
       For each linked wallet of winner:
         Set cooldownUntil[linked] = block.timestamp + 24 hours
7. prizePoolCents = 0
8. lastDrawTime = block.timestamp
9. raffleId++
10. Emit DrawExecuted
11. Winners call raffle.claimPrize(raffleId) to receive funds
```

---

## Entry Calculation

### Base Entry
```
eligible  = balanceOf(account) × price_USD_cents_per_token ≥ 1000 ($10)
baseEntry = eligible ? 1 : 0
```

### Dust Entries (per linked secondary wallet)
```
For each linked wallet W of primary P:
  totalCycleUsd = Σ  cycleDustContributions[W][cycleId][T] × price_USD_cents(T)
  dustEntries_W = min( floor(totalCycleUsd / 50), 5 )
  (50 = $0.50 in cents)
```

### Total Entries Per Account
```
totalEntries(P) = baseEntry(P) + Σ dustEntries_W  for all linked W
max totalEntries(P) = 1 + 5×5 = 26
```

### Cycle
```
cycleId = block.timestamp / 3600  (1-hour cycles, matching draw interval)
Entries reset each cycle (dustEntriesEarned is overwritten, not accumulated)
```

---

## Security Model

### LinkRegistry
- **CAN:** Verify cryptographic signatures; store wallet links; enforce max-5 rule
- **CANNOT:** Move funds; affect token balances; pause anything
- **Invariant:** A secondary wallet can only be linked by proving control via `personal_sign`

### LibertyVault
- **CAN:** Accept dust deposits; calculate entries; distribute fees; hold ERC-20 tokens
- **CANNOT:** Affect $LIBERTY token balances; censor deposits; freeze funds
- **Invariant:** Only secondary wallets that are linked AND deposited earn entries
- **Invariant:** Primary wallet never earns dust entries via its own deposits
- **Note:** Vault is Ownable — owner can add/remove supported tokens and migrate funds

### LibertyRaffle
- **CAN:** Select winners; distribute prizes; set cooldowns; register eligible accounts
- **CANNOT:** Mint tokens; change tax rates; freeze wallets
- **Invariant:** A wallet in cooldown can never be selected as winner
- **Invariant:** Payout draft is fixed: 96% max, no reallocation
- **Note:** Prize pool is funded by: (a) direct calls to fundPrizePoolETH/ERC20, (b) future integration with $LIBERTY buy tax stream

---

## Fee Flow

```
User deposits 1000 units of ERC-20 dust (假设 $1.00 USD)
  └─ 2% protocol fee → protocolFeeRecipient (20 units, ~$0.02)
  └─ 998 units credited to vault

Vault holds: all dust tokens
Raffle holds: ETH / ERC-20 prize pool (topped up manually or via tax stream)
```

---

## Chainlink Integration

Each contract uses an optional Chainlink AggregatorV3Interface for USD pricing.

```solidity
AggregatorV3Interface(_usdFeed).latestAnswer()  // returns price in 8 decimals
```

- If `_usdFeed == address(0)`: use fallback price of $1.00 (= 100 cents)
- Fallback is acceptable for testnets/mock deployments
- Production: deploy one Aggregator per supported dust token on Robinhood Chain

---

## Randomness

Uses `keccak256(abi.encodePacked(block.prevrandao, block.timestamp, block.number, ...))`.

- `block.prevrandao` (EIP-4399) is the beacon chain random output — not miner-controllable on Proof-of-Stake
- Mixed with `block.timestamp` and `block.number` to prevent replay
- **Limitation:** On very low-value pools this is acceptable. For high-value prizes, consider Chainlink VRF or commit-reveal

---

## Open Decisions (from team spec)

| Item | Status |
|------|--------|
| Allocation of remaining 4% | Open |
| Primary wallet dust contribution | Open |
| Duration of dust entries before expiry | Open |
| Rules for <10 eligible participants | Open |
| Who receives 2% protocol fee | Open |
| Robinhood Chain RPC + chain ID | Open |
| Supported dust token list | Open |
| Chainlink feed addresses on Robinhood Chain | Open |
| Source of verifiable randomness | Open |
