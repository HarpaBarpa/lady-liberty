# Lady Liberty 🗽🔥

**$LIBERTY** · RWAFFLE × Lady Liberty

---

## What It Is

Lady Liberty is a raffle for tokenized real-world assets (RWAs): tokens like AAPLx that track real shares. Users bring their small leftover crypto holdings to one shared prize vault. Ten winners each round take a slice of every asset in it.

RWAFFLE turns crypto dust into a second chance at winning. $LIBERTY is the community token that ties platform activity to value.

**Platform:** Robinhood Chain · **Launchpad:** Torch (app.torchpad.fun)

---

## Repo Structure

| | |
|---|---|
| `site/` | Landing page — single-page "Climb to the Torch" concept, static HTML |
| `code/` | Hardhat project: RWAFFLE.sol smart contract + indexer (TypeScript) |
| `frontend/` | Next.js app: RWAFFLE.com dashboard |
| `design/artwork/` | Launch artwork: social media formats + variations |
| `design/prompts/` | Image generation prompts for Codex |
| `tools/` | Local static server (`python tools/serve.py`) |
| `BUILD.md` | Step-by-step Torch launch instructions |
| `SPEC.md` | Architecture specification |
| `TOKENOMICS.md` | $LIBERTY tokenomics breakdown + flywheel analysis |
| `Liberty.MD` | Full concept + mechanics description |

---

## The $LIBERTY Token

Launched via Torch on Robinhood Chain in one transaction. Fixed supply 1B, no mint, no owner.

**Proposed tokenomics (see TOKENOMICS.md for full analysis):**
- Preset: Launch (2.5 ETH starting market cap)
- Buy tax: 4% (only on buys, fixed forever)
- Tax destination: Creator → funneled to RWAFFLE prize pool
- Pair asset: $TORCH ("fuel the torch" narrative)
- Dev buy: 2% of supply

**Key addresses:**
| | |
|---|---|
| **$TORCH** | `0x000050E18ffa3F8F7aD170Eb9CeF160eb3Ed1111` |
| **Torch Launchpad** | `0x7891eA889899928aFE637e4Cca8106188427776a` |
| **$LIBERTY** | `0x___________1111` (assigned at launch) |
| All Torch tokens end in | `1111` |

---

## The RWAFFLE System

Custom smart contract + off-chain indexer. Users send ERC-20 tokens to the RWAFFLE contract → indexer monitors Transfer events → credits raffle tickets → draw runs → winners paid in kind.

- No wallet connection needed
- No sign-up
- Your wallet address is your raffle account
- Randomness: Chainlink VRF (or commit-reveal if VRF unavailable on Robinhood Chain)

---

## Launch Checklist

**Before launch:**
- [ ] Decide final tokenomics (buy tax %, tax destination, pair asset)
- [ ] Create Lady Liberty artwork for Torch token page
- [ ] Deposit ETH on Robinhood Chain (~0.00015 ETH launch fee + ~0.05 ETH dev buy)
- [ ] Launch $LIBERTY via Torch → save address (ends `1111`)
- [ ] Register RWAFFLE.com domain

**After token launch:**
- [ ] Get Robinhood Chain RPC URL + chain ID
- [ ] Check Chainlink VRF availability on Robinhood Chain
- [ ] Write RWAFFLE contract (deployer key, randomness)
- [ ] Configure indexer + supported token list
- [ ] Fund initial RWAFFLE prize pool
- [ ] Build + deploy RWAFFLE.com (Next.js frontend)
- [ ] Social launch: Twitter/X, Telegram
- [ ] CoinGecko listing application

---

## Running Locally

```bash
# Landing page (static, no build)
python tools/serve.py
# → http://localhost:5318

# Smart contracts
cd code && npm install && npx hardhat compile

# Frontend
cd frontend && npm install && npm run dev
```

---

## Design Notes

**Character:** Lady Liberty — friendly adult anime woman, sea-green bob, copper freckles, seven-ray patina crown, holding torch high. **No pigeon.** Torch flame in mint green #6EE786 is the single glowing light source.

**Palette:** harbor teal #174C4F, seafoam #DCF5EB, porcelain #F7FFFB, patina #5FB59B, torch mint #6EE786, copper #B8733A.

**Style:** Hand-inked anime editorial illustration — confident ink contours, selective flat cel shadows, matte surfaces, subtle gouache and paper grain.

**Rules the landing page keeps:**
- Vault stays $0.00 until a real vault exists
- Payout split is reference draft: 35/20/12/8/6/5/4/3/2/1 = 96% (4% TBC)
- AAPLx, NVDAx, TSLAx, SPYx are **examples**, not confirmed
- "Not affiliated with Torchpad, Robinhood or any token issuer" stays in footer
