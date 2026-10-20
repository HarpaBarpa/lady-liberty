# Lady Liberty

Two design takes on one pitch: **Lady Liberty**, a proposed raffle for tokenized real-world
assets (RWAs) on Robinhood Chain. Both are static websites, plain HTML, CSS and JavaScript,
no build step and no dependencies.

| URL path | What it is | Folder |
| --- | --- | --- |
| `/` | Showcase: both takes side by side, with linked scrolling and a phone view | `site/index.html` |
| `/claude/` | **Climb to the Torch** (by Claude): the page is a climb up the statue, harbor 0 ft to torch 305 ft, with a pigeon practice round | `site/claude/` |
| `/codex/` | **Sweet Liberty** (by Codex): the original gentle morning-harbor direction | `site/codex/` |

**Concept preview only.** Nothing is deployed on-chain. The real vault shows $0.00, there is no
deposit address, and no part of either site moves money, connects a wallet or asks anyone to sign.

## Run it locally

Any static server pointed at `site/` works. With Python:

```bash
python tools/serve.py
```

Then open http://localhost:5318 (the showcase), /claude/ or /codex/. The server turns caching
off, so a refresh always shows your latest edit.

## Deploy

Import this repo into your own Vercel account (New Project, framework preset "Other", no build
command). `vercel.json` already tells Vercel to serve the `site/` folder, so the repo's own files
(README, prompts, scripts) are never published. After the import, every push to `main` deploys
to production and every other branch gets a preview URL.

Any other static host works too: publish the contents of `site/` as the web root.

## Where things live (Climb to the Torch)

```
site/claude/index.html      all page copy and structure, one <section> per level
site/claude/css/styles.css  the whole look: tokens at the top, then one block per level
site/claude/js/config.js    every product number and list (see below)
site/claude/js/rules.js     calculator and practice-draw arithmetic
site/claude/js/app.js       interactions: menu, pigeon quips, chips, calculator, payout chart,
                            practice round, launch panel, aging slider, altimeter
site/claude/assets/         art as WebP, plus the SVG favicon
```

**Change product numbers in `site/claude/js/config.js` only.** The fee, draw interval, winners
per round, payout draft, example assets, open decisions, pretend practice data and pigeon
quips all come from there, so one edit updates every section that shows them. A few sentences
in `index.html` and the FAQ repeat the fee and interval in prose; search for "2%" and
"10 minutes" if those change.

Money is handled as integer cents and token amounts as integer millionths, so the arithmetic
never drifts. The calculator accepts $1.00 to $1,000,000.00.

## Rules the copy keeps (please keep them too)

- The real vault stays at zero ($0.00, 0 participants, 0 deposits, "Starts at launch") until a real vault exists. No fake countdowns, activity feeds or addresses.
- The payout split is the reference **draft**: 35, 20, 12, 8, 6, 5, 4, 3, 2, 1, which totals 96%. The missing 4% is shown as "to be confirmed", not rounded away.
- AAPLx, NVDAx, TSLAx and SPYx are labelled as examples, not a confirmed list.
- The calculator and the practice round are clearly labelled pretend data. Share of entry weight is never presented as a chance of winning.
- $LIBERTY and TORCH are the community story, not raffle deposits. "Not affiliated with Torchpad, Robinhood or any token issuer" stays in the footer.
- The open decisions list in the launch panel (fee recipient, randomness, settlement and so on) should only shrink when something is actually decided.

## Sweet Liberty (Codex)

`site/codex/` is a copy of Codex's finished site. It loads `rules.mjs` as an ES module, so it
needs to be served over http (any static server, not a double-clicked file). Its fonts are
bundled in `site/codex/assets/` with their OFL licences.

## Art

All illustrations were generated with Codex image generation (GPT-5.6 Sol) from the prompts in
`design/prompts/`. `00-style.txt` is the shared style and character sheet; each other file is
one job.

| Asset in site/claude/assets | Prompt |
| --- | --- |
| liberty-hero.webp | 01-hero.txt |
| harbor-dawn.webp, crown-view.webp | 02-places-a.txt |
| copper-interior.webp, torch-night.webp | 03-places-b.txt |
| pedestal-vault.webp, pigeon.webp, pigeon-flap.webp | 04-props.txt |
| liberty-avatar.webp | the Sweet Liberty avatar from the original pitch |

To make more, with the Codex CLI installed: `bash design/tools/run-codex.sh 04-props`, then
`python design/tools/collect.py 04-props` (moves the renders into `design/raw/`) and
`python design/tools/optimize.py` (writes WebP files into `site/claude/assets/`). Reference
images go in `design/ref/`; raw renders, references and logs are not committed.

## Checks done before handover

- Calculator: $100 gives a $2.00 fee and $98.00 net; empty, non-numeric, three-decimal, under $1 and over $1,000,000 inputs show an error.
- The payout chart, prize detail and practice results all use exactly the 96% draft and show the 4% remainder.
- Practice round always draws 10 different winners; slices are exact.
- Phone width (375 px): no sideways scrolling, the menu opens, Escape closes it and returns focus.
- Showcase: both frames load and linked scrolling keeps them in step.
- Not tested: Safari, screen readers.
