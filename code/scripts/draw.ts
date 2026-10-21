import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  const raffleAddr = process.env.RAFFLE_ADDR;
  if (!raffleAddr) {
    console.error("Set RAFFLE_ADDR env var");
    process.exit(1);
  }

  const raffle = await ethers.getContractAt("LibertyRaffle", raffleAddr);

  const [canDraw, status] = await raffle.canDraw();
  console.log(`canDraw: ${canDraw}, status: ${status}`);
  console.log("Status: 0=ok, 1=too soon, 2=floor, 3=paused, 4=no accounts");

  if (!canDraw) {
    console.log("Cannot draw right now. Fix the issue above first.");
    return;
  }

  console.log("Triggering draw...");
  const tx = await raffle.connect(signer).checkAndDraw();
  console.log(`TX: ${tx.hash}`);
  const receipt = await tx.wait();

  for (const log of receipt.logs) {
    try {
      const parsed = raffle.interface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });
      console.log(`Event: ${parsed?.name}`, parsed?.args);
    } catch {}
  }
  console.log("Done.");
}

main().catch(console.error);
