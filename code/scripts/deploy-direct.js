const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const RPC = "https://rpc.mainnet.chain.robinhood.com";
const PRIVKEY = process.env.TORCH_DEPLOYER_KEY;
const LIBERTY_TOKEN = "0xFd30679405C7fDF1D42366327C49819afCE81111";
const FEE_RECIPIENT = "0x5F5E4ca54956D8Bd8Ad224835adD0A2bb0B6A438";
const ETH_USD_FEED = ethers.ZeroAddress;

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PRIVKEY, provider);

  console.log(`\nDeploying from: ${wallet.address}`);
  console.log(`Network: Robinhood (chainId=4663)\n`);

  // Read compiled artifacts
  const artifacts = {
    LinkRegistry: JSON.parse(fs.readFileSync(path.join(__dirname, "../artifacts/contracts/LinkRegistry.sol/LinkRegistry.json"), "utf8")),
    LibertyVault: JSON.parse(fs.readFileSync(path.join(__dirname, "../artifacts/contracts/LibertyVault.sol/LibertyVault.json"), "utf8")),
    LibertyRaffle: JSON.parse(fs.readFileSync(path.join(__dirname, "../artifacts/contracts/LibertyRaffle.sol/LibertyRaffle.json"), "utf8")),
  };

  // 1. LinkRegistry
  console.log("1/3 Deploying LinkRegistry...");
  const LinkRegistry = new ethers.ContractFactory(artifacts.LinkRegistry.abi, artifacts.LinkRegistry.bytecode, wallet);
  const linkRegistry = await LinkRegistry.deploy();
  await linkRegistry.waitForDeployment();
  const linkRegistryAddr = await linkRegistry.getAddress();
  console.log(`   ✓ LinkRegistry → ${linkRegistryAddr}`);

  // 2. LibertyVault
  console.log("\n2/3 Deploying LibertyVault...");
  const LibertyVault = new ethers.ContractFactory(artifacts.LibertyVault.abi, artifacts.LibertyVault.bytecode, wallet);
  const vault = await LibertyVault.deploy(linkRegistryAddr, LIBERTY_TOKEN, FEE_RECIPIENT);
  await vault.waitForDeployment();
  const vaultAddr = await vault.getAddress();
  console.log(`   ✓ LibertyVault → ${vaultAddr}`);

  // 3. LibertyRaffle
  console.log("\n3/3 Deploying LibertyRaffle...");
  const LibertyRaffle = new ethers.ContractFactory(artifacts.LibertyRaffle.abi, artifacts.LibertyRaffle.bytecode, wallet);
  const raffle = await LibertyRaffle.deploy(vaultAddr, linkRegistryAddr, LIBERTY_TOKEN, ETH_USD_FEED);
  await raffle.waitForDeployment();
  const raffleAddr = await raffle.getAddress();
  console.log(`   ✓ LibertyRaffle → ${raffleAddr}`);

  // 4. Save deployments.json
  const deployments = {
    network: "robinhood",
    chainId: 4663,
    timestamp: new Date().toISOString(),
    deployer: wallet.address,
    contracts: {
      LinkRegistry: linkRegistryAddr,
      LibertyVault: vaultAddr,
      LibertyRaffle: raffleAddr,
    },
    env: {
      LIBERTY_TOKEN,
      PROTOCOL_FEE_RECIPIENT: FEE_RECIPIENT,
      ETH_USD_FEED: ETH_USD_FEED,
    },
  };

  const outPath = path.join(__dirname, "deployments.json");
  fs.writeFileSync(outPath, JSON.stringify(deployments, null, 2));
  console.log(`\n✓ Deployment record saved → ${outPath}`);

  console.log("\n" + "─".repeat(65));
  console.log(" DEPLOYMENT SUMMARY");
  console.log("─".repeat(65));
  console.log(`  LinkRegistry    ${linkRegistryAddr}`);
  console.log(`  LibertyVault    ${vaultAddr}`);
  console.log(`  LibertyRaffle   ${raffleAddr}`);
  console.log("─".repeat(65) + "\n");
}

main().catch((err) => {
  console.error("\n❌ Deploy failed:", err.message || err);
  process.exit(1);
});
