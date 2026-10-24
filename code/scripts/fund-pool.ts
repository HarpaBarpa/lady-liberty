import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  const raffleAddr = process.env.RAFFLE_ADDR;
  if (!raffleAddr) {
    console.error("Set RAFFLE_ADDR env var");
    process.exit(1);
  }

  const amount = process.env.ETH_AMOUNT || "0.05"; // default 0.05 ETH — MUST be ≥ $50 (at $1/ETH fallback) to clear the draw floor
  const value = ethers.parseEther(amount);

  console.log(`Funding raffle ${raffleAddr} with ${amount} ETH...`);
  const tx = await signer.sendTransaction({
    to: raffleAddr,
    value,
  });
  console.log(`TX: ${tx.hash}`);
  await tx.wait();
  console.log("Done.");
}

main().catch(console.error);
