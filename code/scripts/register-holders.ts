import { ethers } from "hardhat";

/**
 * Register known eligible wallets before launch.
 * Edit the ACCOUNTS array with wallet addresses to pre-register.
 */
const ACCOUNTS: string[] = [];

async function main() {
  const raffleAddr = process.env.RAFFLE_ADDR;
  if (!raffleAddr) {
    console.error("Set RAFFLE_ADDR env var");
    process.exit(1);
  }
  if (ACCOUNTS.length === 0) {
    console.log("No accounts to register. Edit scripts/register-holders.ts to add wallets.");
    return;
  }

  const raffle = await ethers.getContractAt("LibertyRaffle", raffleAddr);
  const [signer] = await ethers.getSigners();

  console.log(`Registering ${ACCOUNTS.length} accounts...`);
  const tx = await raffle.connect(signer).registerAccounts(ACCOUNTS);
  console.log(`TX: ${tx.hash}`);
  await tx.wait();
  console.log("Done.");
}

main().catch(console.error);
