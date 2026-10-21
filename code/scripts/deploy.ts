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
  const LIBERTY_TOKEN = process.env.LIBERTY_TOKEN;
  if (!LIBERTY_TOKEN) {
    console.error("❌ Set LIBERTY_TOKEN env var before deploying to mainnet.");
    console.error("   Example: LIBERTY_TOKEN=0x... npx hardhat run scripts/deploy.ts --network robinhood");
    process.exit(1);
  }
  const PROTOCOL_FEE_RECIPIENT = process.env.PROTOCOL_FEE_RECIPIENT || deployer.address;

  // Vault constructor takes 3 args: linkRegistry, libertyToken, feeRecipient
  // Per-token price feeds are set post-deploy via addSupportedToken(token, feed)
  const LibertyVault = await ethers.getContractFactory("LibertyVault");
  const vault = await LibertyVault.deploy(
    linkRegistryAddr,
    LIBERTY_TOKEN,
    PROTOCOL_FEE_RECIPIENT,
  );
  await vault.waitForDeployment();
  const vaultAddr = await vault.getAddress();
  console.log(`   ✓ LibertyVault → ${vaultAddr}`);
  console.log(`     LINK_REGISTRY = ${linkRegistryAddr}`);
  console.log(`     LIBERTY_TOKEN = ${LIBERTY_TOKEN}`);
  console.log(`     PROTOCOL_FEE  = ${PROTOCOL_FEE_RECIPIENT}`);

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

  // ── 4. Save deployment record ──────────────────────────────────
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
      ETH_USD_FEED,
    },
  };

  const outPath = path.join(__dirname, "..", "deployments.json");
  fs.writeFileSync(outPath, JSON.stringify(deployments, null, 2));
  console.log(`\n✓ Deployment record saved → ${outPath}`);

  // ── 5. Print summary ─────────────────────────────────────────
  console.log("\n" + "─".repeat(65));
  console.log(" DEPLOYMENT SUMMARY");
  console.log("─".repeat(65));
  console.log(`  LinkRegistry    ${linkRegistryAddr}`);
  console.log(`  LibertyVault    ${vaultAddr}`);
  console.log(`  LibertyRaffle   ${raffleAddr}`);
  console.log("─".repeat(65));
  console.log("\n NEXT STEPS:");
  console.log("  1. Add supported dust tokens with their price feeds:");
  console.log(`     vault.addSupportedToken("0xtoken...", "0xchainlinkFeed...")`);
  console.log("  2. Register eligible accounts:");
  console.log(`     raffle.registerAccounts([...wallets])`);
  console.log("  3. Fund the prize pool:");
  console.log(`     raffle.fundPrizePoolETH({ value: ethers.parseEther("0.1") })`);
  console.log("  4. Call checkAndDraw() every hour via cron/keeper");
  console.log("─".repeat(65) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Deploy failed:", err);
    process.exit(1);
  });