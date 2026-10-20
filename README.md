# Lady Liberty 🗽🔥

**$LIBERTY** · RWAFFLE × Lady Liberty

---

## What It Is

LibertyTorch is a community token on Torch — built around the Lady Liberty brand. The Statue of Liberty reimagined as a friendly anime character, torch raised high. Liberation, second chances, turning forgotten things into meaningful wins.

RWAFFLE turns crypto dust into a second chance at winning. $LIBERTY is the community token that ties platform activity to value.

**Platform:** Robinhood Chain · **Launchpad:** Torch (app.torchpad.fun)

---

## Repo Structure

| | |
|---|---|
| `site/` | Landing page — single-page "Climb to the Torch" concept, static HTML |
| `code/` | Hardhat project: RWAFFLE smart contract + indexer (not in use — RWAFFLE direction abandoned) |
| `frontend/` | Next.js app: RWAFFLE.com dashboard (not deployed) |
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

## The $LIBERTY Token

Launched via Torch on Robinhood Chain in one transaction. Fixed supply 1B, no mint, no owner. The token is the product — community token + brand.

---

## Launch Checklist

**Before launch:**
- [x] Register `libertytorch.online` — Martin, Namecheap
- [ ] Finalize tokenomics: buy tax %, tax destination, pair asset
- [ ] Create Lady Liberty artwork for Torch token page
- [ ] Deposit ETH on Robinhood Chain
- [ ] Launch $LIBERTY via Torch → save address (ends `1111`)
- [ ] Deploy landing page to Vercel → point `libertytorch.online` at it

**After token launch:**
- [ ] Get Robinhood Chain RPC URL + chain ID
- [ ] Deploy landing page to Vercel → point domain at it
- [ ] Set `NEXT_PUBLIC_LIBERTY_TOKEN_ADDRESS` on Vercel
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
