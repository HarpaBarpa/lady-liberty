import { ethers } from "ethers";

// ─── Configuration ────────────────────────────────────────────────────────────
// Set these in your environment before running:
//   ROBINHOOD_RPC, RWAFFLE_ADDRESS, INDEXER_KEY
const RPC_URL       = process.env.ROBINHOOD_RPC || "http://127.0.0.1:8545";
const RWAFFLE_ADDR = process.env.RWAFFLE_ADDRESS || "";
const INDEXER_KEY   = process.env.INDEXER_KEY || "";
const TICKET_RATE   = 100; // $1 USD = 100 tickets

// ─── Supported Tokens ─────────────────────────────────────────────────────────
// Map: token address (lowercase) → { decimals, coingeckoId }
const SUPPORTED: Record<string, { decimals: number; coingeckoId: string }> = {
  // ── Ethereum mainnet examples (replace with Robinhood Chain token addresses) ──
  // "0xdac17f958d2ee523a2206206994597c13d831ec7": { decimals: 6,  coingeckoId: "tether" },
  // "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": { decimals: 6,  coingeckoId: "usd-coin" },
  // "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": { decimals: 18, coingeckoId: "ethereum" },
  // "0x514910771af9ca656af840dff83e8264ecf986ca": { decimals: 18, coingeckoId: "chainlink" },
};

// ─── In-Memory State ─────────────────────────────────────────────────────────
// NOTE: In production, use a proper database (Postgres, Redis) to persist
// processed events across restarts and avoid double-crediting.
const processedEvents = new Set<string>(); // dedup: `${txHash}-${logIndex}`
const priceCache: Record<string, number> = {};
let signer: ethers.Wallet;
let contract: ethers.Contract;

// ─── Utilities ────────────────────────────────────────────────────────────────
async function getPrice(coingeckoId: string): Promise<number> {
  if (priceCache[coingeckoId]) return priceCache[coingeckoId];
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`
    );
    const data = await res.json() as any;
    priceCache[coingeckoId] = data[coingeckoId]?.usd ?? 0;
  } catch (err) {
    console.warn(`⚠  Price fetch failed for ${coingeckoId}:`, err);
    priceCache[coingeckoId] = 0;
  }
  return priceCache[coingeckoId];
}

function hexToAddress(hex: string): string {
  return ethers.getAddress("0x" + hex.slice(hex.length - 40));
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Setup ───────────────────────────────────────────────────────────────────
async function setup(): Promise<void> {
  if (!RWAFFLE_ADDR) throw new Error("RWAFFLE_ADDRESS not set");
  if (!INDEXER_KEY)  throw new Error("INDEXER_KEY not set");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  signer = new ethers.Wallet(INDEXER_KEY, provider);

  // Expand ABI: events + write functions we need
  const abi = [
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "event TicketsCredited(address indexed user, uint256 amount, address token)",
    "event RafflePhaseChanged(uint256 indexed raffleId, uint8 phase)", // Phase 0=Idle 1=Commit 2=Reveal 3=Drawn
    "event CommitmentSubmitted(address indexed user, uint256 indexed raffleId)",
    "event SecretRevealed(address indexed user, uint256 indexed raffleId)",
    "event RaffleDrawn(uint256 indexed raffleId, address winner, uint256 prize, uint256 buyback)",
    "event PrizePoolFunded(uint256 indexed raffleId, address indexed funder, uint256 amount)",
    "function creditTickets(address user, uint256 amount) external",
    "function currentRaffleId() view returns (uint256)",
    "function getRaffle(uint256 raffleId) view returns (uint256,uint256,address,bool,uint8,uint256,uint256)",
    "function getCurrentRaffleInfo() view returns (uint8,uint256,uint256,uint256)",
    "function setSupportedToken(address token, bool supported) external",
    "function getTickets(address user) view returns (uint256)",
  ];

  contract = new ethers.Contract(RWAFFLE_ADDR, abi, provider);

  console.log(`\n🗽 RWAFFLE Indexer — starting up`);
  console.log(`   RPC:       ${RPC_URL}`);
  console.log(`   Contract:  ${RWAFFLE_ADDR}`);
  console.log(`   Signer:    ${signer.address}`);
  console.log(`   Block:     ${await provider.getBlockNumber()}\n`);
}

// ─── Ticket Credit Logic ──────────────────────────────────────────────────────
async function processTransfer(log: ethers.Log): Promise<void> {
  const { transactionHash, logIndex, address: tokenAddr } = log;

  // Dedup
  const dedupKey = `${transactionHash}-${logIndex}`;
  if (processedEvents.has(dedupKey)) return;
  processedEvents.add(dedupKey);

  const cfg = SUPPORTED[tokenAddr.toLowerCase()];
  if (!cfg) return; // unsupported token

  // Decode: Transfer(address from, address to, uint256 value)
  const iface = contract.interface;
  const parsed = iface.parseLog({ topics: log.topics, data: log.data });
  if (!parsed || parsed.name !== "Transfer") return;

  const from = parsed.args[0] as string;
  const to   = parsed.args[1] as string;
  const rawValue = parsed.args[2] as bigint;

  // Only process if the destination is the RWAFFLE contract
  if (to.toLowerCase() !== RWAFFLE_ADDR.toLowerCase()) return;

  const amount = Number(ethers.formatUnits(rawValue, cfg.decimals));
  const price  = await getPrice(cfg.coingeckoId);
  const usdVal = amount * price;
  const tickets = Math.floor(usdVal * TICKET_RATE);

  if (tickets <= 0) {
    console.log(`  ⏭  ${from} sent $${usdVal.toFixed(4)} worth of ${cfg.coingeckoId} — below ticket threshold`);
    return;
  }

  console.log(`🎟  ${from} → ${tickets.toLocaleString()} tickets ($${usdVal.toFixed(4)} ${cfg.coingeckoId})`);

  try {
    const tx = await contract.connect(signer).creditTickets(from, tickets) as ethers.TransactionResponse;
    console.log(`  ➔  TX: ${tx.hash}`);
    await tx.wait();
    console.log(`  ✅ Confirmed`);
  } catch (err) {
    console.error(`  ❌ Failed to credit tickets:`, err);
    // Remove from processed so we retry next block scan
    processedEvents.delete(dedupKey);
  }
}

// ─── Historical Catch-Up ──────────────────────────────────────────────────────
async function catchUp(fromBlock: number, toBlock: number): Promise<void> {
  console.log(`\n📜 Catching up blocks ${fromBlock} → ${toBlock}...`);

  // Fetch Transfer events from supported tokens only
  const tokenAddrs = Object.keys(SUPPORTED);
  const events: ethers.Log[] = [];

  for (const token of tokenAddrs) {
    try {
      const logs = await contract.provider.getLogs({
        address: token,
        topics: [ethers.id("Transfer(address,address,uint256)")],
        fromBlock,
        toBlock,
      });
      events.push(...logs);
    } catch (err) {
      console.warn(`⚠  Failed to fetch logs for ${token}:`, err);
    }
  }

  // Sort by block number + log index for deterministic dedup
  events.sort((a, b) =>
    a.blockNumber !== b.blockNumber
      ? a.blockNumber - b.blockNumber
      : a.logIndex - b.logIndex
  );

  console.log(`   Found ${events.length} transfer events`);

  for (const log of events) {
    await processTransfer(log);
    await sleep(100); // throttle to avoid rate-limiting the RPC
  }

  console.log(`   ✅ Catch-up complete`);
}

// ─── Live Block Feed ──────────────────────────────────────────────────────────
async function startLiveListener(): Promise<void> {
  console.log(`\n📡 Listening for new blocks...`);

  const provider = contract.provider as ethers.JsonRpcProvider;

  provider.on("block", async (blockNum: number) => {
    try {
      // Scan the last block for Transfer events from our supported tokens
      const tokenAddrs = Object.keys(SUPPORTED);
      for (const token of tokenAddrs) {
        const logs = await provider.getLogs({
          address: token,
          topics: [ethers.id("Transfer(address,address,uint256)")],
          fromBlock: blockNum,
          toBlock: blockNum,
        });
        for (const log of logs) {
          await processTransfer(log);
        }
      }
    } catch (err) {
      console.error(`⚠  Block ${blockNum} scan error:`, err);
    }
  });
}

// ─── Raffle Status Reporter ───────────────────────────────────────────────────
async function reportRaffleStatus(): Promise<void> {
  try {
    const [phase, prizePool, commitDeadline, revealDeadline] =
      await contract.getCurrentRaffleInfo() as [number, bigint, bigint, bigint];

    const phaseName = ["Idle", "Commit", "Reveal", "Drawn"][phase];
    const now = Math.floor(Date.now() / 1000);

    console.log(`\n🎰 Current Raffle #${await contract.currentRaffleId()}`);
    console.log(`   Phase:        ${phaseName}`);
    console.log(`   Prize Pool:   ${ethers.formatEther(prizePool)} ETH`);
    console.log(`   Commit ends:  ${new Date(Number(commitDeadline) * 1000).toISOString()}`);
    console.log(`   Reveal ends:  ${new Date(Number(revealDeadline) * 1000).toISOString()}`);

    if (phase === 1 && Number(commitDeadline) - now < 0) {
      console.warn(`   ⚠  Commit window has closed — consider advancing phase`);
    }
  } catch (err) {
    console.warn(`⚠  Could not fetch raffle status:`, err);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  await setup();

  // Catch up on recent history so we don't miss any events since last run
  const provider = contract.provider as ethers.JsonRpcProvider;
  const latest   = await provider.getBlockNumber();
  const from     = Math.max(1, latest - 100); // last 100 blocks on restart

  await catchUp(from, latest);
  await reportRaffleStatus();
  await startLiveListener();

  // Periodically report raffle status every 5 minutes
  setInterval(async () => {
    await reportRaffleStatus();
    // Refresh price cache every ~5 min
    Object.keys(priceCache).forEach((k) => delete priceCache[k]);
    console.log(`   💹 Price cache cleared`);
  }, 5 * 60 * 1000);

  console.log(`\n✅ Indexer running. Press Ctrl+C to stop.\n`);
}

main().catch((err) => {
  console.error("❌ Indexer crashed:", err);
  process.exit(1);
});
