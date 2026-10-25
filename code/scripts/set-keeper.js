const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const PRIVKEY = "0xb7b9306e8ca9980680e69af5c3d5d405dd69b8e1ecddb263fb6dab66ca4a5337";
const deployments = JSON.parse(fs.readFileSync(path.join(__dirname, "deployments.json"), "utf8"));
const RPC = "https://rpc.mainnet.chain.robinhood.com";

const KEEPER = "0x5F5E4ca54956D8Bd8Ad224835adD0A2bb0B6A438"; // same as deployer + watcher key

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PRIVKEY, provider);

  // Vault.setKeeper
  const vaultABI = ["function setKeeper(address _keeper)"];
  const vault = new ethers.Contract(deployments.contracts.LibertyVault, vaultABI, wallet);
  const vTx = await vault.setKeeper(KEEPER);
  await vTx.wait();
  console.log("✓ Vault keeper set:", KEEPER);

  // Raffle.setKeeper
  const raffleABI = ["function setKeeper(address _keeper)"];
  const raffle = new ethers.Contract(deployments.contracts.LibertyRaffle, raffleABI, wallet);
  const rTx = await raffle.setKeeper(KEEPER);
  await rTx.wait();
  console.log("✓ Raffle keeper set:", KEEPER);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
