/* Lady Liberty: the single source for every product parameter shown on the page.
   Change a fee, interval or payout draft here and every section follows. */
window.LIBERTY_CONFIG = {
  status: "not-live",

  rules: {
    network: "Robinhood Chain",
    valuation: "Finnhub-backed oracle, USD value locked at deposit",
    feeBps: 200,                 // 2% protocol fee, in basis points
    drawIntervalMinutes: 10,     // proposed, not a running timer
    winnersPerRound: 10,
    onePrizePerWallet: true,
    payoutDraft: [35, 20, 12, 8, 6, 5, 4, 3, 2, 1], // reference split, totals 96: keep as draft
    walletConnection: "Optional, only for your own stats"
  },

  // Real vault state. Stays at zero until a vault is actually deployed.
  vault: { valueCents: 0, participants: 0, deposits: 0, nextDraw: "Starts at launch" },

  // Examples from the reference, not a confirmed allow-list.
  exampleAssets: [
    { symbol: "AAPLx", name: "Apple", about: "a token that tracks Apple Inc. shares" },
    { symbol: "NVDAx", name: "NVIDIA", about: "a token that tracks NVIDIA shares" },
    { symbol: "TSLAx", name: "Tesla", about: "a token that tracks Tesla shares" },
    { symbol: "SPYx", name: "S&P 500 ETF", about: "a token that tracks the S&P 500 ETF (SPY), a fund that holds 500 large US companies" }
  ],

  calculator: { defaultCents: 10000, minCents: 100, maxCents: 100000000 },

  // Pretend data for the practice round. Nothing here is real.
  practice: {
    // amounts in millionths of a token, so slices stay exact
    vault: [
      { symbol: "AAPLx", micros: 1200000 },
      { symbol: "NVDAx", micros: 3000000 },
      { symbol: "TSLAx", micros: 750000 },
      { symbol: "SPYx", micros: 400000 }
    ],
    // net entry values in cents
    pigeons: [
      { name: "Gus", cents: 4116 },
      { name: "Admiral Crumb", cents: 24500 },
      { name: "Pidge", cents: 980 },
      { name: "Coo Coo", cents: 12250 },
      { name: "Sir Featherstone", cents: 392 },
      { name: "Beaky", cents: 6860 },
      { name: "Nugget", cents: 1470 },
      { name: "Dot", cents: 588 },
      { name: "Lou", cents: 1960 },
      { name: "Maple", cents: 3332 },
      { name: "Biscuit", cents: 784 },
      { name: "Penny", cents: 294 },
      { name: "Rocco", cents: 8820 },
      { name: "Pebble", cents: 1176 },
      { name: "Waffles", cents: 490 },
      { name: "Mortimer", cents: 5782 },
      { name: "Juniper", cents: 2450 },
      { name: "Clementine", cents: 196 },
      { name: "Bartholomew", cents: 15680 }
    ],
    simulations: 1000
  },

  openDecisions: [
    "The final payout split, and where the remaining 4% goes",
    "Who receives the 2% fee and how it is accounted",
    "Entry-weight precision and rounding",
    "Deposits that land while a draw is in progress",
    "Oracle timestamps and what happens with stale prices",
    "The supported token list and contract addresses",
    "Where the draw randomness comes from",
    "How settlement is carried out",
    "What happens when too few people take part",
    "How one prize per wallet shapes weighted picks",
    "Legal review and who is eligible to take part"
  ],

  torchQuips: [
    "Held up since 1886. Copper hands.",
    "Closed to visitors since 1916. Opening at launch.",
    "Mint green, never out. Not even for an empty vault.",
    "Everything that burns becomes greater.",
    "Yes, it's real fire. No, you can't deposit it.",
    "Not financial advice. I'm a torch."
  ]
};
