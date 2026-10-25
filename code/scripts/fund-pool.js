const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const PRIVKEY = "0xb7b9306e8ca9980680e69af5c3d5d405dd69b8e1ecddb263fb6dab66ca4a5337";
const deployments = JSON.parse(fs.readFileSync(path.join(__dirname, "deployments.json"), "utf8"));
const RPC = "https://rpc.mainnet.chain.robinhood.com";

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PRIVKEY, provider);
  const ABI = ["function fundPrizePoolETH() payable"];
  const raffle = new ethers.Contract(deployments.contracts.LibertyRaffle, ABI, wallet);
  console.log("Balance:", ethers.formatEther(await provider.getBalance(wallet.address)), "ETH");
  console.log("Funding prize pool with 0.04 ETH...");
  const tx = await raffle.fundPrizePoolETH({ value: ethers.parseEther("0.04") });
  await tx.wait();
  console.log("✓ Prize pool seeded:", tx.hash);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
