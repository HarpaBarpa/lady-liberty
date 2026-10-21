/**
 * LibertyTorch Holder Watcher + Draw Keeper
 * ==========================================
 * Runs alongside the LibertyVault + LibertyRaffle contracts on Robinhood Chain.
 *
 * TWO jobs:
 *   1. Holder watcher — polls Transfer events on $LIBERTY, registers accounts
 *      when balance ≥ $10 (MIN_HOLD_CENTS = 1000), deregisters when it drops.
 *   2. Draw keeper — calls raffle.checkAndDraw() every hour.
 *
 * SECURITY DESIGN (no trusted third party):
 *   - Dust deposits are computed ON-CHAIN by LibertyVault.depositDust().
 *     The watcher does NOT credit tickets/entries. The vault does.
 *   - Wallet linking is verified ON-CHAIN by LinkRegistry (EIP-712 signed).
 *   - The watcher's only write: registerAccount() / deregisterAccount() —
 *     a guard function that checks the watcher actually verified the balance.
 *     The raffle enforces isRegistered[] and cooldownUntil[] on-chain.
 *   - A compromised watcher can at worst register ineligible wallets,
 *     giving them 1 base entry. It cannot create unlimited entries,
 *     because dust entries come from actual vault deposits.
 *
 * PERSISTENT STATE (survives restarts):
 *   - watcher-state.json: lastProcessedBlock, knownHolders map
 *   - Dedup via txHash-logIndex prevents double-processing across restarts
 *
 * RPC: Robinhood Chain public RPC (https://rpc.mainnet.chain.robinhood.com)
 * No third-party indexer — direct ethers.js event subscription.
 */

import { ethers } from "ethers";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

// ─── Types ────────────────────────────────────────────────────────────────────
interface WatcherState {
  lastProcessedBlock: number;
  knownHolders: Record<string, boolean>; // address → isRegistered
  lastDrawTime: number;
  lastJackpotCheck: number;
}

// ─── Configuration (environment variables) ────────────────────────────────────
const RPC_URL =
  process.env.ROBINHOOD_RPC || "https://rpc.mainnet.chain.robinhood.com";
const CHAIN_ID = parseInt(process.env.CHAIN_ID || "4663");
const WATCHER_KEY = process.env.WATCHER_KEY || ""; // deployer key (needed for registerAccount)
const LIBERTY_TOKEN_ADDR = process.env.LIBERTY_TOKEN || "";
const RAFFLE_ADDR = process.env.RAFFLE_ADDR || "";
const VAULT_ADDR = process.env.VAULT_ADDR || "";

// ─── Constants ────────────────────────────────────────────────────────────────
const MIN_HOLD_CENTS = 1000; // $10.00 = 1000 cents (must match LibertyRaffle.MIN_HOLD_CENTS)
const STATE_FILE = join(__dirname, "..", "..", "watcher-state.json");
const DEDUP_FILE = join(__dirname, "..", "..", "watcher-dedup.json");
const DRAW_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const JACKPOT_INTERVAL_MS = 60 * 60 * 1000; // check hourly
const BLOCK_BATCH = 2000; // blocks per catch-up batch (avoid RPC rate limits)
const POLL_INTERVAL_MS = 30_000; // poll new blocks every 30s in live mode
const PRICE_CHECK_INTERVAL_MS = 5 * 60 * 1000; // re-check prices every 5 min

// ─── Global state ─────────────────────────────────────────────────────────────
let provider: ethers.JsonRpcProvider;
let signer: ethers.Wallet;
let raffle: ethers.Contract;
let libertyToken: ethers.Contract;
let state: WatcherState;
let dedupSet: Set<string>; // "txHash-logIndex"
let priceCache: Record<string, number> = {};

// ─── ABI fragments ────────────────────────────────────────────────────────────
const RAFFLE_ABI = [
  "function registerAccount(address account) external",
  "function registerAccounts(address[] calldata accounts) external",
  "function deregisterAccount(address account) external",
  "function checkAndDraw() external",
  "function isRegistered(address) view returns (bool)",
  "function getEligibleAccounts() view returns (address[])",
  "function lastDrawTime() view returns (uint256)",
  "function raffleId() view returns (uint256)",
  "function prizePoolCents() view returns (uint256)",
  "function owner() view returns (address)",
  "event AccountRegistered(address indexed account, uint256 timestamp)",
  "event AccountDeregistered(address indexed account, uint256 timestamp)",
  "event DrawExecuted(uint256 indexed raffleId, uint256 prizePoolCents, uint256 winnerCount, uint256 timestamp)",
  "event DrawSkipped(uint256 indexed raffleId, uint256 poolCents, uint256 nextCheckTime, uint256 timestamp)",
];

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

// ─── State persistence ────────────────────────────────────────────────────────
function loadState(): WatcherState {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, "utf8"));
    }
  } catch (err) {
    console.warn("⚠ Could not load state file, starting fresh:", err);
  }
  return { lastProcessedBlock: 0, knownHolders: {}, lastDrawTime: 0, lastJackpotCheck: 0 };
}

function saveState(): void {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error("❌ Failed to save state:", err);
  }
}

function loadDedup(): void {
  try {
    if (existsSync(DEDUP_FILE)) {
      const arr: string[] = JSON.parse(readFileSync(DEDUP_FILE, "utf8"));
      dedupSet = new Set(arr);
      // Prune old entries (keep last 50k)
      if (dedupSet.size > 50_000) {
        const entries = [...dedupSet];
        dedupSet = new Set(entries.slice(entries.length - 40_000));
      }
    }
  } catch {
    dedupSet = new Set();
  }
}

function saveDedup(): void {
  try {
    writeFileSync(DEDUP_FILE, JSON.stringify([...dedupSet]));
  } catch (err) {
    console.error("❌ Failed to save dedup:", err);
  }
}

// ─── Initialization ───────────────────────────────────────────────────────────
async function setup(): Promise<void> {
  if (!LIBERTY_TOKEN_ADDR) throw new Error("LIBERTY_TOKEN not set");
  if (!RAFFLE_ADDR) throw new Error("RAFFLE_ADDR not set");
  if (!WATCHER_KEY) throw new Error("WATCHER_KEY not set");

  provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);
  signer = new ethers.Wallet(WATCHER_KEY, provider);

  raffle = new ethers.Contract(RAFFLE_ADDR, RAFFLE_ABI, provider);
  libertyToken = new ethers.Contract(LIBERTY_TOKEN_ADDR, ERC20_ABI, provider);

  // Verify signer is the raffle owner
  const owner = await raffle.owner();
  if (signer.address.toLowerCase() !== owner.toLowerCase()) {
    console.warn(
      `⚠  WATCHER_KEY (${signer.address}) is NOT raffle owner (${owner}). ` +
      `registerAccount() calls will fail — it's onlyOwner.`
    );
  }

  state = loadState();
  loadDedup();

  console.log(`\n🗽 LibertyTorch Watcher — starting up`);
  console.log(`   RPC:        ${RPC_URL}`);
  console.log(`   Chain ID:   ${CHAIN_ID}`);
  console.log(`   $LIBERTY:   ${LIBERTY_TOKEN_ADDR}`);
  console.log(`   Raffle:     ${RAFFLE_ADDR}`);
  console.log(`   Vault:      ${VAULT_ADDR || "(not set — entry computation is on-chain)"}`);
  console.log(`   Watcher:    ${signer.address}`);
  console.log(`   Last block: ${state.lastProcessedBlock}`);
  console.log(`   Known holders: ${Object.keys(state.knownHolders).length}\n`);
}

// ─── Balance check ────────────────────────────────────────────────────────────
async function checkBalance(account: string): Promise<boolean> {
  try {
    const raw = await libertyToken.balanceOf(account);
    const dec = await libertyToken.decimals();
    const balance = Number(ethers.formatUnits(raw, dec));

    // For base entry eligibility we need $LIBERTY ≥ $10.
    // Without a $LIBERTY/USD feed on-chain, we use a fixed nominal threshold:
    // 1,000 $LIBERTY tokens minimum (configurable; this is a placeholder
    // until a real feed is available).
    //
    // IN PRODUCTION: replace this with a Chainlink $LIBERTY/USD feed or
    // use a DEX price oracle to convert balance → USD.
    const MIN_TOKENS = 1000; // placeholder threshold
    return balance >= MIN_TOKENS;
  } catch (err) {
    console.error(`  ❌ balanceOf failed for ${account}:`, err);
    return false;
  }
}

// ─── Process a single Transfer event ──────────────────────────────────────────
async function processTransfer(log: ethers.Log): Promise<void> {
  const dedupKey = `${log.transactionHash}-${log.logIndex}`;
  if (dedupSet.has(dedupKey)) return;
  dedupSet.add(dedupKey);

  try {
    const parsed = libertyToken.interface.parseLog({
      topics: log.topics as string[],
      data: log.data,
    });
    if (!parsed || parsed.name !== "Transfer") return;

    const from = parsed.args[0] as string;
    const to = parsed.args[1] as string;
    const zero = "0x0000000000000000000000000000000000000000";

    const addressesToCheck = new Set<string>();
    if (from !== zero) addressesToCheck.add(from);
    if (to !== zero) addressesToCheck.add(to);

    for (const addr of addressesToCheck) {
      const eligible = await checkBalance(addr);
      const currentlyRegistered = state.knownHolders[addr] === true;

      if (eligible && !currentlyRegistered) {
        try {
          const tx = await raffle
            .connect(signer)
            .registerAccount(addr) as ethers.TransactionResponse;
          console.log(`  ✅ Registered ${addr} (≥ threshold)`);
          await tx.wait();
          state.knownHolders[addr] = true;
        } catch (err: any) {
          console.error(`  ❌ registerAccount failed for ${addr}:`, err?.reason || err);
        }
      } else if (!eligible && currentlyRegistered) {
        try {
          const tx = await raffle
            .connect(signer)
            .deregisterAccount(addr) as ethers.TransactionResponse;
          console.log(`  🔻 Deregistered ${addr} (below threshold)`);
          await tx.wait();
          state.knownHolders[addr] = false;
        } catch (err: any) {
          console.error(`  ❌ deregisterAccount failed for ${addr}:`, err?.reason || err);
        }
      }
    }
  } catch (err) {
    console.error(`  ❌ Transfer processing error:`, err);
    // Don't remove from dedup — don't retry broken events indefinitely
  }
}

// ─── Catch-up: historical Transfer scanning ────────────────────────────────────
async function catchUp(fromBlock: number, toBlock: number): Promise<void> {
  if (fromBlock >= toBlock) return;

  console.log(`\n📜 Scanning blocks ${fromBlock} → ${toBlock}...`);

  // Batch in chunks to avoid RPC rate limits
  let scanned = 0;
  for (let start = fromBlock; start < toBlock; start += BLOCK_BATCH) {
    const end = Math.min(start + BLOCK_BATCH - 1, toBlock);
    try {
      const logs = await provider.getLogs({
        address: LIBERTY_TOKEN_ADDR,
        topics: [ethers.id("Transfer(address,address,uint256)")],
        fromBlock: start,
        toBlock: end,
      });

      for (const log of logs) {
        await processTransfer(log);
        scanned++;
      }

      state.lastProcessedBlock = end;
      saveState();
      if (scanned % 100 === 0) saveDedup();
    } catch (err) {
      console.error(`  ⚠  Batch ${start}-${end} failed:`, err);
      // Don't update lastProcessedBlock on failure — retry next run
      break;
    }

    // Brief pause between batches to respect rate limits
    await sleep(200);
  }

  console.log(`   ✅ Scanned ${scanned} transfer events`);
}

// ─── Full rescan of all known holders ─────────────────────────────────────────
async function fullRescan(): Promise<void> {
  console.log(`\n🔍 Full rescan of ${Object.keys(state.knownHolders).length} known holders...`);
  let changes = 0;
  for (const addr of Object.keys(state.knownHolders)) {
    const eligible = await checkBalance(addr);
    const currentlyRegistered = state.knownHolders[addr] === true;

    if (eligible && !currentlyRegistered) {
      try {
        const tx = await raffle.connect(signer).registerAccount(addr);
        await tx.wait();
        state.knownHolders[addr] = true;
        changes++;
      } catch (err: any) {
        console.error(`  ❌ Rescan register ${addr}:`, err?.reason || err);
      }
    } else if (!eligible && currentlyRegistered) {
      try {
        const tx = await raffle.connect(signer).deregisterAccount(addr);
        await tx.wait();
        state.knownHolders[addr] = false;
        changes++;
      } catch (err: any) {
        console.error(`  ❌ Rescan deregister ${addr}:`, err?.reason || err);
      }
    }

    if (changes % 10 === 0 && changes > 0) {
      saveState();
      await sleep(500); // throttle
    }
  }
  if (changes > 0) {
    console.log(`   ✅ Rescan: ${changes} account status changes applied`);
    saveState();
  } else {
    console.log(`   ✅ All known holders up to date`);
  }
}

// ─── Draw keeper ──────────────────────────────────────────────────────────────
async function triggerDraw(): Promise<void> {
  const now = Date.now();
  if (now - state.lastDrawTime < DRAW_INTERVAL_MS) return;

  try {
    // Check if draw is actually due on-chain
    const lastDraw = Number(await raffle.lastDrawTime());
    const interval = 3600; // 1 hour in seconds
    if (Math.floor(Date.now() / 1000) < lastDraw + interval) {
      return; // not due yet
    }

    console.log(`\n🎰 Triggering hourly draw...`);
    const tx = await raffle.connect(signer).checkAndDraw() as ethers.TransactionResponse;
    console.log(`   TX: ${tx.hash}`);
    const receipt = await tx.wait();

    // Parse events to see if draw executed or skipped
    for (const log of receipt.logs) {
      try {
        const parsed = raffle.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        if (parsed?.name === "DrawExecuted") {
          console.log(`   🎉 Draw #${parsed.args.raffleId} executed! Pool: ${parsed.args.prizePoolCents}¢, Winners: ${parsed.args.winnerCount}`);
        } else if (parsed?.name === "DrawSkipped") {
          console.log(`   ⏭  Draw skipped — pool below floor (${parsed.args.poolCents}¢)`);
        }
      } catch {}
    }

    state.lastDrawTime = now;
    saveState();
  } catch (err: any) {
    if (err?.reason?.includes("DrawTooSoon") || err?.data?.includes("DrawTooSoon")) {
      // Not due yet — update timestamp to avoid retry spam
      state.lastDrawTime = now;
      saveState();
    } else {
      console.error(`  ❌ Draw trigger failed:`, err?.reason || err);
    }
  }
}

// ─── Liberty Bell jackpot check (future: contract integration) ────────────────
async function checkJackpot(): Promise<void> {
  const now = Date.now();
  if (now - state.lastJackpotCheck < JACKPOT_INTERVAL_MS) return;

  // Jackpot: 1-in-72 probability on-chain check.
  // Currently the contract does not have a separate jackpot function —
  // this is a placeholder for when the Liberty Bell contract logic is added.
  //
  // When implemented, this would:
  //   1. Call raffle.checkJackpot() (future function)
  //   2. Use Chainlink VRF or block randomness for verifiable 1-in-72 odds
  //   3. Select winner from eligible accounts, subject to shared cooldown
  //
  // For now, this is a no-op stub.
  state.lastJackpotCheck = now;
  saveState();
}

// ─── Live block subscription ──────────────────────────────────────────────────
async function startLiveListener(): Promise<void> {
  console.log(`\n📡 Listening for live $LIBERTY transfers...`);

  provider.on("block", async (blockNum: number) => {
    try {
      const logs = await provider.getLogs({
        address: LIBERTY_TOKEN_ADDR,
        topics: [ethers.id("Transfer(address,address,uint256)")],
        fromBlock: blockNum,
        toBlock: blockNum,
      });

      for (const log of logs) {
        await processTransfer(log);
      }

      state.lastProcessedBlock = blockNum;

      // Periodic save (every ~10 blocks)
      if (blockNum % 10 === 0) {
        saveState();
        saveDedup();
      }
    } catch (err) {
      console.error(`⚠  Block ${blockNum} scan error:`, err);
    }
  });
}

// ─── Status reporter ──────────────────────────────────────────────────────────
async function reportStatus(): Promise<void> {
  try {
    const raffleId = Number(await raffle.raffleId());
    const poolCents = Number(await raffle.prizePoolCents());
    const lastDraw = Number(await raffle.lastDrawTime());
    const eligibleCount = (await raffle.getEligibleAccounts()).length;
    const registeredCount = Object.values(state.knownHolders).filter(Boolean).length;

    const nextDrawSec = lastDraw > 0 ? (lastDraw + 3600) - Math.floor(Date.now() / 1000) : 0;
    const nextDraw = nextDrawSec > 0
      ? `${Math.floor(nextDrawSec / 60)}m ${nextDrawSec % 60}s`
      : "ANY MOMENT";

    console.log(`\n📊 Status — ${new Date().toISOString()}`);
    console.log(`   Raffle #${raffleId}  |  Pool: $${(poolCents / 100).toFixed(2)}  |  Eligible: ${eligibleCount}  |  Known holders: ${registeredCount}`);
    console.log(`   Next draw: ${nextDraw}  |  Block: ${state.lastProcessedBlock}`);
  } catch (err) {
    console.warn(`⚠  Status report failed:`, err);
  }
}

// ─── Utility ───────────────────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  await setup();

  // 1. Catch up on any missed blocks since last run
  const latest = await provider.getBlockNumber();
  const from = state.lastProcessedBlock > 0
    ? state.lastProcessedBlock + 1
    : Math.max(1, latest - BLOCK_BATCH * 5); // first run: scan last ~10k blocks

  await catchUp(from, latest);

  // 2. Full rescan of known holders (correct any drift from missed events)
  await fullRescan();

  // 3. Trigger draw if due
  await triggerDraw();

  // 4. Start live listener
  await startLiveListener();

  // 5. Report initial status
  await reportStatus();

  // ─── Periodic timers ──────────────────────────────────────────────────────
  setInterval(async () => {
    await triggerDraw();
    await checkJackpot();
  }, 60_000); // check every minute

  setInterval(async () => {
    await fullRescan();
  }, PRICE_CHECK_INTERVAL_MS); // full rescan every 5 min (balance checks)

  setInterval(async () => {
    await reportStatus();
    saveState();
    saveDedup();
  }, 5 * 60_000); // status report + save every 5 min

  console.log(`\n✅ Watcher running. Press Ctrl+C to stop.\n`);
}

main().catch((err) => {
  console.error("❌ Watcher crashed:", err);
  process.exit(1);
});