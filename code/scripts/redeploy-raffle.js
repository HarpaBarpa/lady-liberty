const path = require("path");
require("dotenv").config({ path: "/root/.openclaw/workspace/projects/liberty/code/.env" });
const { ethers } = require("ethers");
const fs = require("fs");

const PRIVKEY = process.env.TORCH_DEPLOYER_KEY;
if (!PRIVKEY) { console.error("TORCH_DEPLOYER_KEY not set"); process.exit(1); }
const deployments = require("./deployments.json");
const RPC = "https://rpc.mainnet.chain.robinhood.com";

const VAULT = deployments.contracts.LibertyVault;
const LINK_REG = deployments.contracts.LinkRegistry;
const TOKEN = deployments.env.LIBERTY_TOKEN;
const OLD_RAFFLE = deployments.contracts.LibertyRaffle;
const ETH_USD_FEED = ethers.ZeroAddress;

const rafArtifact = JSON.parse(fs.readFileSync(
  path.join(__dirname, "../artifacts/contracts/LibertyRaffle.sol/LibertyRaffle.json"),
  "utf8"
));

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PRIVKEY, provider);
  console.log("Deploying from:", wallet.address);
  console.log("Deployer ETH:", parseFloat(ethers.formatEther(await provider.getBalance(wallet.address))).toFixed(5));

  // 1. Deploy new raffle (auto-send + history)
  console.log("\n1/5 Deploying LibertyRaffle (auto-send winners)...");
  const LibertyRaffle = new ethers.ContractFactory(rafArtifact.abi, rafArtifact.bytecode, wallet);
  const newRaffle = await LibertyRaffle.deploy(VAULT, LINK_REG, TOKEN, ETH_USD_FEED);
  await newRaffle.waitForDeployment();
  const newRaffleAddr = await newRaffle.getAddress();
  console.log("   ✓ New LibertyRaffle →", newRaffleAddr);

  // 2. Migrate ETH from old raffle
  const oldBal = await provider.getBalance(OLD_RAFFLE);
  console.log("\n2/5 Old raffle balance:", ethers.formatEther(oldBal), "ETH");
  if (Number(oldBal) > 0) {
    const fundTx = await newRaffle.fundPrizePoolETH({ value: oldBal, gasLimit: 100000 });
    await fundTx.wait();
    console.log("   ✓ Migrated", ethers.formatEther(oldBal), "ETH");
  }

  // 3. Set keeper
  console.log("\n3/5 Setting keeper...");
  const skTx = await newRaffle.setKeeper(wallet.address);
  await skTx.wait();
  console.log("   ✓ Keeper set");

  // 4. Trigger first draw
  console.log("\n4/5 Triggering first draw...");
  try {
    const drawTx = await newRaffle.checkAndDraw();
    await drawTx.wait();
    console.log("   ✓ Draw triggered");
  } catch(e) {
    console.log("   ⚠ Draw reverted:", e.message.slice(0, 80));
  }

  // 5. Verify
  const newBal = await provider.getBalance(newRaffleAddr);
  const poolCents = await newRaffle.prizePoolCents();
  const lastDraw = await newRaffle.lastDrawTime();
  console.log("\n=== NEW RAFFLE STATE ===");
  console.log("   ETH balance:    ", parseFloat(ethers.formatEther(newBal)).toFixed(4), "ETH");
  console.log("   Prize pool:     ", poolCents.toString(), "cents ($" + (Number(poolCents)/100).toFixed(2) + ")");
  console.log("   Last draw:      ", new Date(Number(lastDraw)*1000).toISOString());
  console.log("   Fallback price: ", (await newRaffle.FALLBACK_ETH_USD_CENTS()).toString(), "cents");
  console.log("   Owner:          ", await newRaffle.owner());
  console.log("   Keeper:         ", await newRaffle.keeper());

  // 6. Update deployments.json
  deployments.contracts.LibertyRaffle = newRaffleAddr;
  deployments.deploymentNote = "v3 — auto-send winners + raffle history";
  fs.writeFileSync(path.join(__dirname, "deployments.json"), JSON.stringify(deployments, null, 2));
  console.log("\n5/5 Updated deployments.json →", newRaffleAddr);

  console.log("\nNEXT STEPS:");
  console.log("  1. Update site/js/config.js with new RAFFLE address");
  console.log("  2. Deploy site");
  console.log("  3. Update VPS .env with new RAFFLE address + git pull + rebuild + restart");
}

main().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
