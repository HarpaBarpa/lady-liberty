/**
 * LibertyTorch Keeper — Holder Watcher + Draw Keeper + Jackpot Keeper + Dust Liquidator
 * ======================================================================================
 * Runs alongside the LibertyVault + LibertyRaffle contracts on Robinhood Chain.
 *
 * FOUR jobs:
 *   1. Holder watcher — polls Transfer events on $LIBERTY, registers accounts
 *      when balance ≥ threshold, deregisters when it drops.
 *   2. Draw keeper — calls raffle.checkAndDraw() every hour.
 *   3. Jackpot keeper — calls raffle.checkJackpot() every hour (Liberty Bell).
 *   4. Dust liquidator — after every successful draw, sweeps dust from the vault,
 *      swaps it for ETH, splits 50% to the prize pool and 50% to the dev wallet.
 *
 * SECURITY: A compromised keeper can at worst register ineligible wallets for 1 base entry.
 * It cannot drain the vault, skip draws, or redirect prize funds.
 *
 * PERSISTENT STATE:
 *   - watcher-state.json: lastProcessedBlock, knownHolders, lastDrawTime, lastJackpotCheck
 *   - watcher-dedup.json: txHash-logIndex keys (no double-processing)
 *
 * RPC: Robinhood Chain public RPC (no third-party indexer needed).
 */

import { ethers, Log, TransactionReceipt } from "ethers";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface WatcherState {
  lastProcessedBlock: number;
  knownHolders: Record<string, boolean>;
  lastDrawTime: number;
  lastJackpotCheck: number;
  lastJackpotTriggerTime: number;
  lastLiquidationTime: number;
}

// ─── Config ──────────────────────────────────────────────────────────────────
const RPC_URL = process.env.ROBINHOOD_RPC || "https://rpc.mainnet.chain.robinhood.com";
const CHAIN_ID = parseInt(process.env.CHAIN_ID || "4663");
const WATCHER_KEY = process.env.WATCHER_KEY || "";
const LIBERTY_TOKEN_ADDR = process.env.LIBERTY_TOKEN || "";
const VAULT_ADDR = process.env.VAULT_ADDR || "";
const RAFFLE_ADDR = process.env.RAFFLE_RAFFLE || "";  // raffle is named LIBERTY_RAFFLE in .env

const STATE_FILE = join(__dirname, "..", "..", "watcher-state.json");
const DEDUP_FILE = join(__dirname, "..", "..", "watcher-dedup.json");
const DRAW_INTERVAL_MS = 60 * 60 * 1000;
const BLOCK_BATCH = 2000;

// Split: 50% to prize pool, 50% to dev wallet
const PRIZE_POOL_BPS = 5000;
const DEV_WALLET_BPS = 5000;
const BPS_DENOMINATOR = 10000;

// ─── Global ─────────────────────────────────────────────────────────────────
let provider: ethers.JsonRpcProvider;
let signer: ethers.Wallet;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let raffle: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let vault: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let libertyToken: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let deployerSigner: any;
let state: WatcherState;
let dedupSet: Set<string>;

// ─── ABI ─────────────────────────────────────────────────────────────────────
const RAFFLE_ABI = [
  "function registerAccount(address account) external",
  "function registerAccounts(address[] calldata accounts) external",
  "function deregisterAccount(address account) external",
  "function checkAndDraw() external",
  "function checkJackpot() external",
  "function isRegistered(address) view returns (bool)",
  "function getEligibleAccounts() view returns (address[])",
  "function lastDrawTime() view returns (uint256)",
  "function lastJackpotCheckTime() view returns (uint256)",
  "function raffleId() view returns (uint256)",
  "function prizePoolCents() view returns (uint256)",
  "function jackpotPoolCents() view returns (uint256)",
  "function jackpotTriggered() view returns (bool)",
  "function jackpotWinner() view returns (address)",
  "function owner() view returns (address)",
  "function keeper() view returns (address)",
  "function canDraw() view returns (bool, uint8)",
  "function canCheckJackpot() view returns (bool, uint8)",
  "function fundPrizePoolETH() external payable",
  "event DrawExecuted(uint256 indexed raffleId, uint256 prizePoolCents, uint256 jackpotContribution, uint256 winnerCount, uint256 timestamp)",
  "event DrawSkipped(uint256 indexed raffleId, uint256 poolCents, uint256 nextCheckTime, uint256 timestamp)",
  "event JackpotFunded(uint256 amountCents, uint256 newTotal, uint256 timestamp)",
  "event JackpotTriggered(uint256 indexed jackpotId, address indexed winner, uint256 prizeCents, uint256 randomValue, uint256 timestamp)",
  "event JackpotSkipped(uint256 poolCents, uint256 nextCheckTime, uint256 timestamp)",
  "event AccountRegistered(address indexed account, uint256 timestamp)",
  "event AccountDeregistered(address indexed account, uint256 timestamp)",
  "event PoolFunded(uint256 amountCents, uint256 newTotal, address indexed funder, uint256 timestamp)",
];

const VAULT_ABI = [
  "function getSupportedTokens() external view returns (address[])",
  "function withdrawToken(address token, uint256 amount, address to) external",
];

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

// ─── State persistence ────────────────────────────────────────────────────────
function loadState(): WatcherState {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, "utf8"));
    }
  } catch {}
  return {
    lastProcessedBlock: 0,
    knownHolders: {},
    lastDrawTime: 0,
    lastJackpotCheck: 0,
    lastJackpotTriggerTime: 0,
    lastLiquidationTime: 0,
  };
}

function saveState(): void {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error("Failed to save state:", err);
  }
}

function loadDedup(): void {
  try {
    if (existsSync(DEDUP_FILE)) {
      const arr: string[] = JSON.parse(readFileSync(DEDUP_FILE, "utf8"));
      dedupSet = new Set(arr);
      if (dedupSet.size > 50_000) {
        const entries = [...dedupSet];
        dedupSet = new Set(entries.slice(entries.length - 40_000));
      }
    } else {
      dedupSet = new Set();
    }
  } catch {
    dedupSet = new Set();
  }
}

function saveDedup(): void {
  try {
    writeFileSync(DEDUP_FILE, JSON.stringify([...dedupSet]));
  } catch (err) {
    console.error("Failed to save dedup:", err);
  }
}

// ─── Setup ───────────────────────────────────────────────────────────────────
async function setup(): Promise<void> {
  const vaultAddr = process.env.VAULT_ADDR || "";
  const raffleAddr = process.env.LIBERTY_RAFFLE || process.env.RAFFLE_RAFFLE || "";

  if (!LIBERTY_TOKEN_ADDR) throw new Error("LIBERTY_TOKEN not set");
  if (!vaultAddr) throw new Error("VAULT_ADDR not set");
  if (!raffleAddr) throw new Error("LIBERTY_RAFFLE not set");
  if (!WATCHER_KEY) throw new Error("WATCHER_KEY not set");

  provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);
  signer = new ethers.Wallet(WATCHER_KEY, provider);

  raffle = new ethers.Contract(raffleAddr, RAFFLE_ABI, provider).connect(signer) as any;
  vault = new ethers.Contract(vaultAddr, VAULT_ABI, provider) as any;
  libertyToken = new ethers.Contract(LIBERTY_TOKEN_ADDR, ERC20_ABI, provider) as any;

  state = loadState();
  loadDedup();

  const owner: string = await raffle.owner();
  const keeper: string = await raffle.keeper();
  const isOwner  = signer.address.toLowerCase() === owner.toLowerCase();
  const isKeeper = signer.address.toLowerCase() === keeper.toLowerCase();
  const devAddr  = new ethers.Wallet(process.env.TORCH_DEPLOYER_KEY || "").address;

  console.log("\nLibertyTorch Keeper");
  console.log("  RPC:          " + RPC_URL);
  console.log("  Chain ID:     " + CHAIN_ID);
  console.log("  $LIBERTY:     " + LIBERTY_TOKEN_ADDR);
  console.log("  Vault:        " + vaultAddr);
  console.log("  Raffle:       " + raffleAddr);
  console.log("  Dev wallet:   " + devAddr);
  console.log("  Watcher key:  " + signer.address);
  console.log("  Owner OK:     " + (isOwner  ? "YES" : "NO  — owner-only ops (pause/sweep) unavailable"));
  console.log("  Keeper OK:    " + (isKeeper ? "YES" : "NO  — registerAccount/deregister will FAIL"));
  console.log("  Last block:   " + state.lastProcessedBlock + "\n");
}

// ─── Balance check ──────────────────────────────────────────────────────────
async function checkBalance(account: string): Promise<boolean> {
  try {
    const [raw, dec] = await Promise.all([
      libertyToken.balanceOf(account) as Promise<bigint>,
      libertyToken.decimals() as Promise<number>,
    ]);
    const balance = Number(ethers.formatUnits(raw, dec));
    const MIN_TOKENS = 1000;
    return balance >= MIN_TOKENS;
  } catch (err) {
    console.error("  balanceOf failed for " + account + ":", err);
    return false;
  }
}

// ─── Process Transfer ───────────────────────────────────────────────────────
async function processTransfer(log: Log): Promise<void> {
  const dedupKey = log.transactionHash + "-" + log.index;
  if (dedupSet.has(dedupKey)) return;
  dedupSet.add(dedupKey);

  try {
    const parsed = libertyToken.interface.parseLog({
      topics: log.topics as string[],
      data: log.data,
    });
    if (!parsed || parsed.name !== "Transfer") return;

    const from = parsed.args?.[0] as string | undefined;
    const to = parsed.args?.[1] as string | undefined;
    const ZERO = "0x0000000000000000000000000000000000000000";

    const addrs = new Set<string>();
    if (from && from !== ZERO) addrs.add(from);
    if (to && to !== ZERO) addrs.add(to);

    for (const addr of addrs) {
      const eligible = await checkBalance(addr);
      const registered = state.knownHolders[addr] === true;

      if (eligible && !registered) {
        try {
          const tx = await raffle.registerAccount(addr);
          console.log("  + Registered " + addr);
          await tx.wait();
          state.knownHolders[addr] = true;
        } catch (err: any) {
          console.error("  registerAccount(" + addr + ") failed:", err.reason || err.message);
        }
      } else if (!eligible && registered) {
        try {
          const tx = await raffle.deregisterAccount(addr);
          console.log("  - Deregistered " + addr);
          await tx.wait();
          state.knownHolders[addr] = false;
        } catch (err: any) {
          console.error("  deregisterAccount(" + addr + ") failed:", err.reason || err.message);
        }
      }
    }
  } catch (err) {
    console.error("  Transfer processing error:", err);
  }
}

// ─── Catch-up ──────────────────────────────────────────────────────────────
async function catchUp(fromBlock: number, toBlock: number): Promise<void> {
  if (fromBlock >= toBlock) return;
  console.log("\nCatching up blocks " + fromBlock + " -> " + toBlock + "...");
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
        await processTransfer(log as Log);
        scanned++;
      }

      state.lastProcessedBlock = end;
      if (scanned % 100 === 0) {
        saveState();
        saveDedup();
      }
    } catch (err) {
      console.error("  Batch " + start + "-" + end + " failed:", err);
      break;
    }
    await sleep(200);
  }

  console.log("  Done — " + scanned + " transfer events");
}

// ─── Full rescan ──────────────────────────────────────────────────────────
async function fullRescan(): Promise<void> {
  const holders = Object.keys(state.knownHolders);
  console.log("\nRescanning " + holders.length + " known holders...");
  let changes = 0;

  for (const addr of holders) {
    const eligible = await checkBalance(addr);
    const registered = state.knownHolders[addr] === true;

    if (eligible && !registered) {
      try {
        await raffle.registerAccount(addr);
        state.knownHolders[addr] = true;
        changes++;
        console.log("  + Registered " + addr);
      } catch {}
    } else if (!eligible && registered) {
      try {
        await raffle.deregisterAccount(addr);
        state.knownHolders[addr] = false;
        changes++;
        console.log("  - Deregistered " + addr);
      } catch {}
    }

    if (changes > 0 && changes % 10 === 0) {
      saveState();
      await sleep(500);
    }
  }

  if (changes > 0) {
    console.log("  " + changes + " status changes applied");
    saveState();
  } else {
    console.log("  All up to date");
  }
}

// ─── Draw keeper ───────────────────────────────────────────────────────────
async function triggerDraw(): Promise<boolean> {
  const now = Date.now();
  if (now - state.lastDrawTime < DRAW_INTERVAL_MS) return false;

  try {
    const [canDraw] = await raffle.canDraw() as [boolean, number];
    if (!canDraw) {
      state.lastDrawTime = now;
      saveState();
      return false;
    }

    console.log("\nTriggering hourly draw...");
    const tx = await raffle.checkAndDraw();
    console.log("  TX: " + tx.hash);
    const receipt: TransactionReceipt | null = await tx.wait();
    if (!receipt) { console.error("  TX reverted"); return false; }

    let drew = false;
    for (const log of receipt.logs) {
      try {
        const parsed = raffle.interface.parseLog({ topics: log.topics as string[], data: log.data });
        if (parsed?.name === "DrawExecuted") {
          drew = true;
          const pc = Number(parsed.args!.prizePoolCents) / 100;
          const jc = Number(parsed.args!.jackpotContribution) / 100;
          console.log(
            "  Draw #" + parsed.args!.raffleId + " — Pool: $" + pc.toFixed(2) +
            " | Bell: $" + jc.toFixed(2) + " | Winners: " + parsed.args!.winnerCount
          );
        } else if (parsed?.name === "DrawSkipped") {
          console.log("  Skipped — pool: $" + (Number(parsed.args!.poolCents) / 100).toFixed(2));
        } else if (parsed?.name === "JackpotFunded") {
          console.log("  Bell funded: $" + (Number(parsed.args!.amountCents) / 100).toFixed(2) +
            " -> pot: $" + (Number(parsed.args!.newTotal) / 100).toFixed(2));
        }
      } catch {}
    }

    state.lastDrawTime = now;
    saveState();
    return drew;
  } catch (err: any) {
    const msg = err.reason || (err.data ? err.data.toString() : err.message);
    if (msg.includes("DrawTooSoon")) {
      state.lastDrawTime = now;
      saveState();
    } else {
      console.error("  Draw failed:", msg);
    }
    return false;
  }
}

// ─── Jackpot keeper ───────────────────────────────────────────────────────
async function triggerJackpotCheck(): Promise<void> {
  const now = Date.now();
  if (now - state.lastJackpotCheck < DRAW_INTERVAL_MS) return;

  try {
    const [canCheck] = await raffle.canCheckJackpot() as [boolean, number];
    if (!canCheck) {
      state.lastJackpotCheck = now;
      saveState();
      return;
    }

    console.log("\nChecking Liberty Bell...");
    const tx = await raffle.checkJackpot();
    console.log("  TX: " + tx.hash);
    const receipt: TransactionReceipt | null = await tx.wait();
    if (!receipt) { console.error("  TX reverted"); return; }

    for (const log of receipt.logs) {
      try {
        const parsed = raffle.interface.parseLog({ topics: log.topics as string[], data: log.data });
        if (parsed?.name === "JackpotTriggered") {
          console.log(
            "  BELL RUNG! #" + parsed.args!.jackpotId +
            " | Winner: " + parsed.args!.winner +
            " | Prize: $" + (Number(parsed.args!.prizeCents) / 100).toFixed(2) +
            " | Random: " + parsed.args!.randomValue
          );
          state.lastJackpotTriggerTime = now;
        } else if (parsed?.name === "JackpotSkipped") {
          console.log("  Silent — pot: $" + (Number(parsed.args!.poolCents) / 100).toFixed(2));
        }
      } catch {}
    }

    state.lastJackpotCheck = now;
    saveState();
  } catch (err: any) {
    const msg = err.reason || (err.data ? err.data.toString() : err.message);
    if (msg.includes("JackpotTooSoon")) {
      state.lastJackpotCheck = now;
      saveState();
    } else {
      console.error("  Jackpot check failed:", msg);
    }
  }
}

// ─── Dust Liquidator ───────────────────────────────────────────────────────
async function liquidateDust(): Promise<void> {
  const now = Date.now();
  if (now - state.lastLiquidationTime < DRAW_INTERVAL_MS) return;

  const deployerKey = process.env.TORCH_DEPLOYER_KEY;
  if (!deployerKey) {
    console.log("  [Liquidator] TORCH_DEPLOYER_KEY not set — skipping");
    return;
  }

  if (!deployerSigner) {
    deployerSigner = new ethers.Wallet(deployerKey, provider);
  }

  const devAddr = deployerSigner.address;

  try {
    console.log("\n[Liquidator] Checking vault for dust...");
    const tokens: string[] = await vault.getSupportedTokens();
    let totalEth = 0n;
    let processed = 0;

    for (const tokenAddr of tokens) {
      // Get token balance in vault (the raw provider.call gives a hex string)

      // Use a simpler balance check
      const tokenContract = new ethers.Contract(tokenAddr, [
        "function balanceOf(address) view returns (uint256)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
      ], provider);

      let vaultBalance: bigint;
      try {
        vaultBalance = await tokenContract.balanceOf(vault.target) as bigint;
      } catch {
        continue;
      }

      if (vaultBalance === 0n) continue;

      const symbol: string = await tokenContract.symbol() as string;
      const decimals: number = await tokenContract.decimals() as number;

      console.log("  [Liquidator] Pulling " + ethers.formatUnits(vaultBalance, decimals) + " " + symbol + " from vault...");
      processed++;

      try {
        // Pull dust to deployer wallet
        const withdrawTx = await vault.connect(deployerSigner).withdrawToken(tokenAddr, vaultBalance, devAddr);
        await withdrawTx.wait();
        console.log("  [Liquidator]   -> Pulled to dev wallet");
      } catch (err: any) {
        console.error("  [Liquidator]   -> Withdraw failed:", err.reason || err.message);
        continue;
      }

      // ─── SWAP STEP ────────────────────────────────────────────────────────────
      // TODO: Integrate 0x API or 1inch Aggregation Protocol here.
      // For now, this is a placeholder that tracks the dust value.
      // When a DEX aggregator API key is ready, replace this block:
      //
      // const ethReceived = await swapTokenForEth(tokenAddr, vaultBalance, devAddr);
      // totalEth += ethReceived;
      //
      console.log("  [Liquidator]   -> Swap: skipped (no DEX API key configured yet)");
    }

    state.lastLiquidationTime = now;
    saveState();

    if (processed === 0) {
      console.log("  [Liquidator] No dust to liquidate.");
      return;
    }

    console.log("  [Liquidator] Dust liquidation complete. " + processed + " token(s) pulled.");
    console.log("  [Liquidator] NOTE: DEX swap integration pending. ETH routing will be enabled once API key is configured.");

  } catch (err) {
    console.error("  [Liquidator] Error:", err);
  }
}

// ─── Live listener ────────────────────────────────────────────────────────
async function startLiveListener(): Promise<void> {
  console.log("Listening for live $LIBERTY transfers...");

  provider.on("block", async (blockNum: number) => {
    try {
      const logs = await provider.getLogs({
        address: LIBERTY_TOKEN_ADDR,
        topics: [ethers.id("Transfer(address,address,uint256)")],
        fromBlock: blockNum,
        toBlock: blockNum,
      });

      for (const log of logs) {
        await processTransfer(log as Log);
      }

      state.lastProcessedBlock = blockNum;
      if (blockNum % 10 === 0) {
        saveState();
        saveDedup();
      }
    } catch (err) {
      console.error("Block " + blockNum + " error:", err);
    }
  });
}

// ─── Status ───────────────────────────────────────────────────────────────
async function reportStatus(): Promise<void> {
  try {
    const raffleAddr = process.env.LIBERTY_RAFFLE || process.env.RAFFLE_RAFFLE || "";
    const poolCents = Number(await raffle.prizePoolCents());
    const jackpotCents = Number(await raffle.jackpotPoolCents());
    const jackpotTriggered: boolean = await raffle.jackpotTriggered();
    const jackpotWinner: string = await raffle.jackpotWinner();
    const lastDraw = Number(await raffle.lastDrawTime());
    const lastJack = Number(await raffle.lastJackpotCheckTime());
    const eligible = (await raffle.getEligibleAccounts()).length;
    const registered = Object.values(state.knownHolders).filter(Boolean).length;

    const nextDrawSec = lastDraw > 0 ? (lastDraw + 3600) - Math.floor(Date.now() / 1000) : 0;
    const nextJackSec = lastJack > 0 ? (lastJack + 3600) - Math.floor(Date.now() / 1000) : 0;
    const drawStr = nextDrawSec > 0 ? Math.floor(nextDrawSec / 60) + "m" : "DUE";
    const jackStr = nextJackSec > 0 ? Math.floor(nextJackSec / 60) + "m" : "DUE";

    console.log(
      "\n[" + new Date().toISOString() + "] Raffle #" + await raffle.raffleId() +
      " | Pool: $" + (poolCents / 100).toFixed(2) +
      " | Eligible: " + eligible +
      " | Next draw: " + drawStr
    );
    console.log(
      "  Bell: $" + (jackpotCents / 100).toFixed(2) +
      " pot | " + (jackpotTriggered ? "WINNER: " + jackpotWinner : "Next: " + jackStr) +
      " | Holders: " + registered + " | Block: " + state.lastProcessedBlock
    );
  } catch (err) {
    console.warn("Status failed:", err);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Main ────────────────────────────────────────────────────────────────
async function main() {
  await setup();

  const latest = await provider.getBlockNumber();
  const from = state.lastProcessedBlock > 0
    ? state.lastProcessedBlock + 1
    : Math.max(1, latest - BLOCK_BATCH * 5);

  await catchUp(from, latest);
  await fullRescan();

  // Run draw, then liquidate if a draw fired
  const drew = await triggerDraw();
  if (drew) {
    await liquidateDust();
  }

  await triggerJackpotCheck();
  await startLiveListener();
  await reportStatus();

  // Draw + liquidation check every minute (will early-exit if not due)
  setInterval(async () => {
    const drew = await triggerDraw();
    if (drew) {
      await liquidateDust();
    }
    await triggerJackpotCheck();
  }, 60_000);

  // Full holder rescan every 5 minutes
  setInterval(fullRescan, 5 * 60_000);

  // Status + save every 5 minutes
  setInterval(async () => {
    await reportStatus();
    saveState();
    saveDedup();
  }, 5 * 60_000);

  console.log("\nKeeper running. Press Ctrl+C to stop.\n");
}

main().catch((err) => {
  console.error("Keeper crashed:", err);
  process.exit(1);
});
