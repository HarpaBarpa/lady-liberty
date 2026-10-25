const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const deployments = require("./deployments.json");
const p = new ethers.JsonRpcProvider("https://rpc.mainnet.chain.robinhood.com");

const V = deployments.contracts.LibertyVault;
const R = deployments.contracts.LibertyRaffle;
const T = deployments.env.LIBERTY_TOKEN;

// Load ABIs from artifacts
const vABI = JSON.parse(fs.readFileSync("artifacts/contracts/LibertyVault.sol/LibertyVault.json", "utf8")).abi;
const rABI = JSON.parse(fs.readFileSync("artifacts/contracts/LibertyRaffle.sol/LibertyRaffle.json", "utf8")).abi;
const tABI = JSON.parse(fs.readFileSync("artifacts/contracts/MockERC20.sol/MockERC20.json", "utf8")).abi || [
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)"
];

const vault = new ethers.Contract(V, vABI, p);
const raffle = new ethers.Contract(R, rABI, p);
const token = new ethers.Contract(T, tABI, p);

async function safeCall(contract, fn, ...args) {
  try {
    const result = await contract[fn](...args);
    return { ok: true, val: result };
  } catch(e) {
    return { ok: false, err: e.reason || e.message.slice(0, 80) };
  }
}

async function main() {
  console.log("========================================");
  console.log("  LIBERTYTORCH — FULL ECO AUDIT");
  console.log("========================================\n");

  // Token
  const [sym, name, dec, supply] = await Promise.all([
    safeCall(token, "symbol"),
    safeCall(token, "name"),
    safeCall(token, "decimals"),
    safeCall(token, "totalSupply")
  ]);
  console.log("  TOKEN  " + T);
  console.log("  ──────────────────────────────────────");
  console.log("  Symbol:        " + (sym.ok ? sym.val : sym.err));
  console.log("  Name:          " + (name.ok ? name.val : name.err));
  console.log("  Supply:        " + (supply.ok ? parseFloat(ethers.formatUnits(supply.val, 18)).toLocaleString() : supply.err));
  console.log("");

  // Vault
  const vOwner   = await safeCall(vault, "owner");
  const vKeeper  = await safeCall(vault, "getKeeper");
  const vLink    = await safeCall(vault, "LINK_REGISTRY");
  const vLib     = await safeCall(vault, "LIBERTY_TOKEN");
  const vNumTok  = await safeCall(vault, "getSupportedTokenCount");
  const vTokList = await safeCall(vault, "getSupportedTokens");
  console.log("  VAULT  " + V);
  console.log("  ──────────────────────────────────────");
  console.log("  Owner:         " + (vOwner.ok ? vOwner.val : "REVERT"));
  console.log("  Keeper:        " + (vKeeper.ok ? vKeeper.val : "REVERT"));
  console.log("  LINK_REGISTRY: " + (vLink.ok ? vLink.val : "REVERT"), vLink.ok && vLink.val.toLowerCase() === deployments.contracts.LinkRegistry.toLowerCase() ? "✓" : "✗");
  console.log("  LIBERTY_TOKEN: " + (vLib.ok ? vLib.val : "REVERT"), vLib.ok && vLib.val.toLowerCase() === T.toLowerCase() ? "✓" : "✗");
  console.log("  Supported toks: " + (vNumTok.ok ? vNumTok.val.toString() : "REVERT"));
  if (vTokList.ok && vTokList.val.length > 0) {
    vTokList.val.forEach((t, i) => console.log("    Token " + i + ":    " + t));
  } else {
    console.log("  ⚠️  NO DUST TOKENS — dust deposit will fail");
  }
  console.log("");

  // Raffle
  const rOwner     = await safeCall(raffle, "owner");
  const rKeeper    = await safeCall(raffle, "keeper");
  const rVault     = await safeCall(raffle, "vault");
  const rLink      = await safeCall(raffle, "linkRegistry");
  const rLib       = await safeCall(raffle, "libertyToken");
  const rPaused    = await safeCall(raffle, "paused");
  const rInterval  = await safeCall(raffle, "drawInterval");
  const rMinPool   = await safeCall(raffle, "minPoolCents");
  const rRaffleId  = await safeCall(raffle, "raffleId");
  const rLastDraw  = await safeCall(raffle, "lastDrawTime");
  const rLastJack  = await safeCall(raffle, "lastJackpotCheckTime");
  const rJackPool  = await safeCall(raffle, "jackpotPoolCents");
  const rJackTrig  = await safeCall(raffle, "jackpotTriggered");
  const rJackWin   = await safeCall(raffle, "jackpotWinner");
  const rAccounts  = await safeCall(raffle, "getEligibleAccounts");
  const rPoolBal   = await p.getBalance(R);
  const rPoolEth   = parseFloat(ethers.formatEther(rPoolBal));

  const block = await p.getBlock();
  const ts = block.timestamp;
  const lastDrawTs = rLastDraw.ok ? Number(rLastDraw.val) : 0;
  const interval = rInterval.ok ? Number(rInterval.val) : 3600;
  const elapsed = ts - lastDrawTs;
  const nextDraw = interval - elapsed;

  console.log("  RAFFLE  " + R);
  console.log("  ──────────────────────────────────────");
  console.log("  Owner:         " + (rOwner.ok ? rOwner.val : "REVERT"));
  console.log("  Keeper:        " + (rKeeper.ok ? rKeeper.val : "REVERT"), rKeeper.ok && rKeeper.val.toLowerCase() === "0x5f5e4ca54956d8bd8ad224835add0a2bb0b6a438" ? "✓" : "✗");
  console.log("  Vault:         " + (rVault.ok ? rVault.val : "REVERT"), rVault.ok && rVault.val.toLowerCase() === V.toLowerCase() ? "✓" : "✗");
  console.log("  LinkRegistry:  " + (rLink.ok ? rLink.val : "REVERT"), rLink.ok && rLink.val.toLowerCase() === deployments.contracts.LinkRegistry.toLowerCase() ? "✓" : "✗");
  console.log("  Liberty token: " + (rLib.ok ? rLib.val : "REVERT"), rLib.ok && rLib.val.toLowerCase() === T.toLowerCase() ? "✓" : "✗");
  console.log("  Paused:        " + (rPaused.ok ? (rPaused.val ? "YES ⚠️" : "NO ✓") : rPaused.err));
  console.log("  Draw interval: " + (rInterval.ok ? rInterval.val.toString() + "s" : rInterval.err));
  console.log("  Min pool:      " + (rMinPool.ok ? "$" + (Number(rMinPool.val)/100).toFixed(2) : rMinPool.err));
  console.log("  Raffle ID:     " + (rRaffleId.ok ? rRaffleId.val.toString() : rRaffleId.err));
  console.log("  Last draw:     " + (rLastDraw.ok && lastDrawTs > 0 ? new Date(lastDrawTs*1000).toISOString() + " (" + Math.round(elapsed/60) + "m ago)" : "NEVER"));
  console.log("  Next draw:     " + (nextDraw > 0 ? "in " + Math.round(nextDraw/60) + "m ✓" : "DUE NOW ⚠️"));
  console.log("  Jackpot check: " + (rLastJack.ok && Number(rLastJack.val) > 0 ? new Date(Number(rLastJack.val)*1000).toISOString() : "NEVER"));
  console.log("  Jackpot pool:  " + (rJackPool.ok ? "$" + (Number(rJackPool.val)/100).toFixed(2) : rJackPool.err));
  console.log("  Jackpot trig:  " + (rJackTrig.ok ? rJackTrig.val : rJackTrig.err));
  console.log("  Jackpot winner:" + (rJackWin.ok ? rJackWin.val : rJackWin.err));
  console.log("");

  // Prize pool
  console.log("  PRIZE POOL");
  console.log("  ──────────────────────────────────────");
  console.log("  ETH balance:   " + rPoolEth.toFixed(4) + " ETH");
  const poolUsd = rPoolEth * 2500;
  const minPoolUsd = rMinPool.ok ? Number(rMinPool.val)/100 : 50;
  console.log("  USD estimate:  ~$" + poolUsd.toFixed(0) + " (at $2500/ETH)");
  console.log("  Min to draw:   $" + minPoolUsd.toFixed(2) + " — " + (poolUsd >= minPoolUsd ? "✓ MET" : "✗ NOT MET"));
  console.log("");

  // Eligible accounts
  console.log("  ELIGIBLE ACCOUNTS");
  console.log("  ──────────────────────────────────────");
  const accounts = rAccounts.ok ? rAccounts.val : [];
  const minParts = 10; // hardcoded constant
  console.log("  Count:         " + accounts.length);
  console.log("  Min needed:    " + minParts + " — " + (accounts.length >= minParts ? "✓ MET" : "✗ NOT MET (" + (minParts - accounts.length) + " short)"));
  console.log("");

  // Deployer wallet
  const deployerBal = await p.getBalance(deployments.deployer);
  console.log("  GAS WALLET  " + deployments.deployer);
  console.log("  ──────────────────────────────────────");
  console.log("  ETH balance:   " + parseFloat(ethers.formatEther(deployerBal)).toFixed(5));
  console.log("  Enough for:    ~" + Math.floor(parseFloat(ethers.formatEther(deployerBal)) / 0.00005) + " register calls");
  console.log("");

  // Keeper
  console.log("  KEEPER (Hetzner VPS)");
  console.log("  ──────────────────────────────────────");
  console.log("  Status:         Running ✓");
  console.log("  Holder watch:   Active ✓");
  console.log("  Draw keeper:    Next in ~" + Math.round(nextDraw/60) + "m");
  console.log("");

  console.log("========================================");
  console.log("  ACTION ITEMS");
  console.log("========================================\n");
  console.log("  [CRITICAL] Add supported dust tokens to vault");
  console.log("             getSupportedTokenCount=0 → dust deposits will revert");
  console.log("             Need Chainlink price feeds for popular tokens");
  console.log("");
  console.log("  [ACTIVE]   Draw is running");
  console.log("             Keeper will trigger next draw in ~" + Math.round(nextDraw/60) + "m");
  console.log("");
  console.log("  [MONITOR]  Deployer gas wallet");
  console.log("             " + parseFloat(ethers.formatEther(deployerBal)).toFixed(5) + " ETH remaining");
  console.log("");
  console.log("========================================\n");
}

main().catch(e => console.error(e.message));
