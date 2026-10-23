/* Lady Liberty: the single source for every product parameter shown on the page.
   Change a fee, interval or payout draft here and every section follows. */
window.LIBERTY_CONFIG = {
  status: "live",

  // Deploy password for /deploy.html — NEVER commit a real value here
  // Injected at Vercel build time via NEXT_PUBLIC_DEPLOY_PASSWORD env var
  

  rules: {
    network: "Robinhood Chain",
    valuation: "Finnhub-backed oracle, USD value locked at deposit",

    // Entry eligibility
    minLibertyUsdCents: 1000,     // $10 minimum $LIBERTY hold
    maxLinkedWallets: 5,          // max additional wallets per primary

    // Dust contribution rules
    minDustUsdCents: 50,          // $0.50 minimum qualifying contribution
    dustEntryStepCents: 50,       // 1 entry per $0.50 contributed
    maxDustEntriesPerWallet: 5,   // max 5 entries per wallet per cycle

    // Draw mechanics
    drawIntervalMinutes: 60,      // checks every hour
    minPoolUsdCents: 5000,        // $50 minimum pool for a drawing
    winnersPerRound: 10,
    onePrizePerWallet: true,
    cooldownHours: 24,            // winner excluded for 24h after win

    // Protocol fee
    feeBps: 300,                  // 3% protocol fee, in basis points

    // Buy tax funding
    buyTaxBps: 300,               // 3% total buy tax
    raffleTaxBps: 85,             // 0.85% to raffle vault
    torchTaxBps: 100,             // 1.00% to Torch Protocol
    buybackTaxBps: 100,           // 1.00% buyback & burn
    devTaxBps: 15,                // 0.15% development / marketing
    volumePerDrawUsdCents: 588235, // ~$5,882.35 volume → ~$50 raffle (at 0.85% raffle tax rate)

    payoutDraft: [35, 20, 12, 8, 6, 5, 4, 3, 2, 1], // reference split, totals 96: keep as draft

    walletConnection: "Optional, for tracking your entries and linked wallets"
  },


  // Deployed contract addresses (chain: Robinhood Chain, chainId: 4663)
  contracts: {
    LIBERTY_TOKEN: "PENDING_TOKEN_ADDRESS",
    LINK_REGISTRY: "0x6AeE4702002a768B3e9c626030D8d1370904CCCB",
    LIBERTY_VAULT: "PENDING_VAULT_ADDRESS",
    LIBERTY_RAFFLE: "PENDING_RAFFLE_ADDRESS",
    TORCH:        "0x000050E18ffa3F8F7aD170Eb9CeF160eb3Ed1111",
    CHAIN_ID:     4663,
    RPC_URL:       "https://rpc.mainnet.chain.robinhood.com",
  },

  // Token info
  token: {
    symbol: "$LIBERTY",
    name:   "Liberty",
    decimals: 18,
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

  // Example vault composition for the payout-staircase illustration.
  exampleVault: [
    { symbol: "AAPLx", micros: 1200000 },
    { symbol: "NVDAx", micros: 3000000 },
    { symbol: "TSLAx", micros: 750000 },
    { symbol: "SPYx", micros: 400000 }
  ]
};