# Lady Liberty

**$LIBERTY** · RWAFFLE × Lady Liberty 🗽🔥

## What This Project Is

Lady Liberty is a raffle for tokenized real-world assets (RWAs): tokens like AAPLx that track
real shares. Users bring their small leftover crypto holdings to one shared prize vault. Ten
winners each round take a slice of every asset in it.

$LIBERTY is the community token. RWAFFLE turns crypto dust into a second chance at winning.

**Platform:** Robinhood Chain · **Launchpad:** Torch (app.torchpad.fun)

---

## What's In This Repo

| Folder | What it is |
|---|---|
| `site/` | Landing page — static HTML, two design directions (see below) |
| `code/` | Hardhat project: RWAFFLE smart contract + indexer |
| `frontend/` | Next.js app: RWAFFLE.com dashboard |
| `design/` | Image generation prompts + tools |
| `tools/` | Local static server |
| `BUILD.md` | Step-by-step launch instructions |
| `SPEC.md` | Architecture specification |

---

## Landing Page — Two Designs

| URL path | What it is | Folder |
|---|---|---|
| `/` | Showcase: both takes side by side | `site/index.html` |
| `/claude/` | **Climb to the Torch** — climb the statue, harbor 0 ft → torch 305 ft | `site/claude/` |
| `/codex/` | **Sweet Liberty** — morning-harbor direction | `site/codex/` |

**Concept preview only.** Nothing is deployed on-chain. The real vault shows $0.00, no deposit
address, and nothing moves money or connects wallets.

Run locally:
```bash
python tools/serve.py
# → http://localhost:5318
```

---

## Key Addresses (Torch / Robinhood Chain)

| | |
|---|---|
| **$TORCH** | `0x000050E18ffa3F8F7aD170Eb9CeF160eb3Ed1111` |
| **Torch Launchpad** | `0x7891eA889899928aFE637e4Cca8106188427776a` |
| **$LIBERTY** | `0x___________1111` (assigned at launch) |
| All Torch tokens end in | `1111` |

---

## Launch Checklist

### Before Launch
- [ ] Create Lady Liberty artwork for Torch launch
- [ ] Decide tokenomics: buy tax %, tax destination, pair asset
- [ ] Deposit ETH on Robinhood Chain
- [ ] Launch $LIBERTY via Torch → save address (ends `1111`)
- [ ] Register RWAFFLE.com domain

### After Token Launch
- [ ] Get Robinhood Chain RPC URL + chain ID
- [ ] Check Chainlink VRF availability on Robinhood Chain
- [ ] Write RWAFFLE contract (deployer key, randomness)
- [ ] Configure indexer + supported token list
- [ ] Fund initial RWAFFLE prize pool
- [ ] Build + deploy RWAFFLE.com (Next.js frontend)
- [ ] Social launch: Twitter/X, Telegram
- [ ] CoinGecko listing application

---

## Development

```bash
# Smart contracts
cd code && npm install && npx hardhat compile

# Frontend
cd frontend && npm install && npm run dev

# Landing page (already built, just serve)
python tools/serve.py
```

**Rules the landing page copy keeps:**
- Real vault stays at $0.00, 0 participants until a real vault exists
- Payout split is the reference **draft**: 35/20/12/8/6/5/4/3/2/1 = 96% (4% TBC)
- AAPLx, NVDAx, TSLAx, SPYx are **examples**, not a confirmed list
- "Not affiliated with Torchpad, Robinhood or any token issuer" stays in the footer
