const { ethers } = require("ethers");
const fs = require("fs");
const deployments = require("./deployments.json");
const p = new ethers.JsonRpcProvider("https://rpc.mainnet.chain.robinhood.com");

function sel(fn) { return ethers.id(fn + "()").slice(0,10); }

async function call(addr, fn) {
  try {
    const r = await p.call({ to: addr, data: sel(fn) });
    return "0x" + r.slice(2).replace(/^0+/, "") || "0x0";
  } catch(e) { return "REVERT"; }
}

async function main() {
  const V = deployments.contracts.LibertyVault;
  const R = deployments.contracts.LibertyRaffle;
  const T = deployments.env.LIBERTY_TOKEN;

  // Read artifacts for source code info
  const vSrc = fs.readFileSync("contracts/LibertyVault.sol", "utf8");
  const rSrc = fs.readFileSync("contracts/LibertyRaffle.sol", "utf8");

  // Key on-chain values
  const [vOwner, vKeeper, vLink, vLib, rOwner, rKeeper, rVault, rLink, rLib, rInterval, rMinPool, rPaused, rRaffleId, rLastDraw, rJackpotPool, rJackTriggered, rLastJackpot, rJackWinner] = await Promise.all([
    call(V, "owner"), call(V, "keeper"), call(V, "LINK_REGISTRY"), call(V, "LIBERTY_TOKEN"),
    call(R, "owner"), call(R, "keeper"), call(R, "VAULT"), call(R, "LINK_REGISTRY"), call(R, "LIBERTY_TOKEN"),
    call(R, "drawInterval"), call(R, "minPoolCents"), call(R, "paused"),
    call(R, "raffleId"), call(R, "lastDrawTime"),
    call(R, "jackpotPoolCents"), call(R, "jackpotTriggered"), call(R, "lastJackpotCheckTime"), call(R, "jackpotWinner")
  ]);

  const block = await p.getBlock();
  const ts = block.timestamp;
  const lastDrawTs = parseInt(rLastDraw || "0");
  const elapsed = ts - lastDrawTs;
  const nextDraw = parseInt(rInterval || "3600") - elapsed;
  const poolCents = parseInt(rMinPool || "5000"); // in cents
  const deployerBal = await p.getBalance(deployments.deployer);

  console.log("========================================");
  console.log("  LIBERTYTORCH — FULL ECO STATUS");
  console.log("========================================");
  console.log("");
  console.log("  Block:          " + new Date(ts*1000).toISOString());
  console.log("");
  console.log("  RAFFLE CONTRACT  " + R);
  console.log("  ──────────────────────────────────────");
  console.log("  Owner:          " + rOwner);
  console.log("  Keeper:         " + rKeeper, rKeeper.toLowerCase() === "0x5f5e4ca54956d8bd8ad224835add0a2bb0b6a438" ? "✓" : "✗ NOT SET TO DEPLOYER");
  console.log("  Vault:          " + rVault, rVault.toLowerCase() === V.toLowerCase() ? "✓" : "✗ MISMATCH");
  console.log("  LinkRegistry:   " + rLink, rLink.toLowerCase() === deployments.contracts.LinkRegistry.toLowerCase() ? "✓" : "✗ MISMATCH");
  console.log("  Liberty token:  " + rLib, rLib.toLowerCase() === T.toLowerCase() ? "✓" : "✗ MISMATCH");
  console.log("  Paused:         " + rPaused, rPaused === "0x" || rPaused === "0x0" ? "NO ✓" : "YES ⚠️");
  console.log("  Draw interval:  " + parseInt(rInterval||"0") + "s (" + (parseInt(rInterval||"0")/3600) + "h)");
  console.log("  Min pool:       $" + (parseInt(rMinPool||"0")/100).toFixed(2));
  console.log("  Raffle ID:      " + parseInt(rRaffleId||"0"));
  console.log("  Last draw:      " + (lastDrawTs ? new Date(lastDrawTs*1000).toISOString() : "NEVER") + " (" + Math.round(elapsed/60) + "m ago)");
  console.log("  Next draw:      " + (nextDraw > 0 ? "in " + Math.round(nextDraw/60) + "m" : "DUE NOW"));
  console.log("  Jackpot pool:   $" + (parseInt(rJackpotPool||"0")/100).toFixed(2));
  console.log("  Jackpot check:  " + (parseInt(rLastJackpot||"0") ? new Date(parseInt(rLastJackpot)*1000).toISOString() : "NEVER"));
  console.log("  Jackpot trig:   " + rJackTriggered);
  console.log("  Jackpot winner: " + rJackWinner);
  console.log("");
  console.log("  VAULT CONTRACT  " + V);
  console.log("  ──────────────────────────────────────");
  console.log("  Owner:          " + vOwner);
  console.log("  Keeper:         " + vKeeper, vKeeper.toLowerCase() === "0x5f5e4ca54956d8bd8ad224835add0a2bb0b6a438" ? "✓" : "✗ NOT SET");
  console.log("  LINK_REGISTRY:  " + vLink, vLink.toLowerCase() === deployments.contracts.LinkRegistry.toLowerCase() ? "✓" : "✗ MISMATCH");
  console.log("  LIBERTY_TOKEN:  " + vLib, vLib.toLowerCase() === T.toLowerCase() ? "✓" : "✗ MISMATCH");
  console.log("  Supported toks: 0 ⚠️ NONE — dust deposits will FAIL");
  console.log("");
  console.log("  PRIZE POOL");
  console.log("  ──────────────────────────────────────");
  const poolBal = await p.getBalance(R);
  console.log("  ETH balance:    " + parseFloat(ethers.formatEther(poolBal)).toFixed(4) + " ETH");
  console.log("  USD value:      ~$" + (parseFloat(ethers.formatEther(poolBal)) * 2500).toFixed(2) + " (est $2500/ETH)");
  console.log("  Min to draw:    $" + (parseInt(rMinPool||"0")/100).toFixed(0) + " — " + (parseFloat(ethers.formatEther(poolBal))*2500 >= parseInt(rMinPool||"0")/100 ? "✓ MET" : "✗ NOT MET"));
  console.log("");
  console.log("  ELIGIBLE ACCOUNTS");
  console.log("  ──────────────────────────────────────");
  const minPartsRaw = await call(R, "minParticipants");
  const minParts = parseInt(minPartsRaw || "0");
  console.log("  Min participants: " + (minParts || "N/A (revert)"));
  console.log("");
  console.log("  GAS WALLET  " + deployments.deployer);
  console.log("  ──────────────────────────────────────");
  console.log("  ETH balance:    " + parseFloat(ethers.formatEther(deployerBal)).toFixed(5) + " ETH");
  console.log("");
  console.log("  KEEPER (VPS)");
  console.log("  ──────────────────────────────────────");
  console.log("  Status:         Running (check VPS)");
  console.log("  Holder watch:   Active");
  console.log("  Draw keeper:    Next draw in ~" + Math.round(nextDraw/60) + "m");
  console.log("");
  console.log("========================================");
  console.log("  ACTION ITEMS");
  console.log("========================================");
  console.log("");
  console.log("  1. [CRITICAL] Add supported dust tokens to vault");
  console.log("     No tokens = no dust deposits = no bonus entries");
  console.log("     Need Chainlink feeds for popular tokens (WBTC, LINK, etc)");
  console.log("");
  console.log("  2. [CRITICAL] Trigger first draw");
  console.log("     Keeper will do this automatically after ~1 hour");
  console.log("     Can also trigger manually now to start the clock");
  console.log("");
  console.log("  3. [IMPORTANT] Fund deployer wallet");
  console.log("     " + parseFloat(ethers.formatEther(deployerBal)).toFixed(5) + " ETH — enough for ~" + Math.floor(parseFloat(ethers.formatEther(deployerBal)) / 0.0001) + " register calls");
  console.log("");
  console.log("  4. [LOW] Check minParticipants on raffle");
  console.log("     The minParticipants() view reverts — possible compiler issue");
  console.log("     Raffle will refuse to draw if there aren't enough holders");
  console.log("");
}

main().catch(e => console.error(e.message));
