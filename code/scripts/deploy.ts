import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`\nDeploying from: ${deployer.address}`);
  console.log(`Network: ${network.name} (chainId=${network.config.chainId})\n`);

  // ── 1. Deploy LinkRegistry ────────────────────────────────────
  console.log("1/3 Deploying LinkRegistry...");
  const LinkRegistry = await ethers.getContractFactory("LinkRegistry");
  const linkRegistry = await LinkRegistry.deploy();
  await linkRegistry.waitForDeployment();
  const linkRegistryAddr = await linkRegistry.getAddress();
  console.log(`   ✓ LinkRegistry → ${linkRegistryAddr}`);

  // ── 2. Deploy LibertyVault ────────────────────────────────────
  console.log("\n2/3 Deploying LibertyVault...");
  // Replace with real addresses before mainnet deployment
  const LIBERTY_TOKEN = process.env.LIBERTY_TOKEN || ethers.ZeroAddress;
  const PROTOCOL_FEE_RECIPIENT = process.env.PROTOCOL_FEE_RECIPIENT || deployer.address;
  const USD_FEED = process.env.USD_FEED || ethers.ZeroAddress; // address(0) = $1 fallback

  const LibertyVault = await ethers.getContractFactory("LibertyVault");
  const vault = await LibertyVault.deploy(
    linkRegistryAddr,
    LIBERTY_TOKEN,
    PROTOCOL_FEE_RECIPIENT,
    USD_FEED
  );
  await vault.waitForDeployment();
  const vaultAddr = await vault.getAddress();
  console.log(`   ✓ LibertyVault → ${vaultAddr}`);
  console.log(`     LINK_REGISTRY = ${linkRegistryAddr}`);
  console.log(`     LIBERTY_TOKEN = ${LIBERTY_TOKEN}`);
  console.log(`     PROTOCOL_FEE  = ${PROTOCOL_FEE_RECIPIENT}`);
  console.log(`     USD_FEED      = ${USD_FEED}`);

  // ── 3. Deploy LibertyRaffle ─────────────────────────────────────
  console.log("\n3/3 Deploying LibertyRaffle...");
  const ETH_USD_FEED = process.env.ETH_USD_FEED || ethers.ZeroAddress;
  const LibertyRaffle = await ethers.getContractFactory("LibertyRaffle");
  const raffle = await LibertyRaffle.deploy(
    vaultAddr,
    linkRegistryAddr,
    LIBERTY_TOKEN,
    ETH_USD_FEED
  );
  await raffle.waitForDeployment();
  const raffleAddr = await raffle.getAddress();
  console.log(`   ✓ LibertyRaffle → ${raffleAddr}`);
  console.log(`     VAULT         = ${vaultAddr}`);
  console.log(`     LINK_REGISTRY = ${linkRegistryAddr}`);
  console.log(`     LIBERTY_TOKEN = ${LIBERTY_TOKEN}`);
  console.log(`     ETH_USD_FEED  = ${ETH_USD_FEED}`);

  // ── 4. Transfer vault ownership to raffle ─────────────────────
  // The raffle needs to be owner of vault for any future admin ops.
  // For now, vault stays owned by deployer. Uncomment if needed:
  // console.log("\n4/4 Transferring vault ownership to raffle...");
  // await vault.transferOwnership(raffleAddr);
  // console.log(`   ✓ Vault ownership → ${raffleAddr}`);

  // ── 5. Save deployment record ──────────────────────────────────
  const deployments = {
    network: network.name,
    chainId: network.config.chainId,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      LinkRegistry: linkRegistryAddr,
      LibertyVault: vaultAddr,
      LibertyRaffle: raffleAddr,
    },
    env: {
      LIBERTY_TOKEN,
      PROTOCOL_FEE_RECIPIENT,
      USD_FEED,
      ETH_USD_FEED,
    },
  };

  const outPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(outPath, JSON.stringify(deployments, null, 2));
  console.log(`\n✓ Deployment record saved → ${outPath}`);

  // ── 6. Print summary ─────────────────────────────────────────
  console.log("\n" + "─".repeat(65));
  console.log(" DEPLOYMENT SUMMARY");
  console.log("─".repeat(65));
  console.log(`  LinkRegistry    ${linkRegistryAddr}`);
  console.log(`  LibertyVault    ${vaultAddr}`);
  console.log(`  LibertyRaffle   ${raffleAddr}`);
  console.log("─".repeat(65));
  console.log("\n NEXT STEPS:");
  console.log("  1. Set the $LIBERTY token address:");
  console.log(`     vault.setLibertyToken("0x...")  (NYI — add to vault first)`);
  console.log("  2. Add supported dust tokens:");
  console.log(`     vault.setSupportedDustToken("0xtoken...", true)`);
  console.log("  3. Register the raffle as vault owner:");
  console.log(`     vault.transferOwnership("${raffleAddr}")`);
  console.log("  4. Fund the prize pool:");
  console.log(`     raffle.fundPrizePoolETH({ value: ethers.parseEther("0.1") })`);
  console.log("  5. Register eligible accounts (via indexer or owner):");
  console.log(`     raffle.registerAccounts([...wallets])`);
  console.log("  6. Call checkAndDraw() every hour via cron/keeper");
  console.log("─".repeat(65) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Deploy failed:", err);
    process.exit(1);
  });
