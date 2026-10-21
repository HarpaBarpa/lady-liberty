import { ethers } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();
  const [owner, alice] = signers;

  const LinkRegistry = await ethers.getContractFactory("LinkRegistry");
  const linkRegistry = await LinkRegistry.deploy();
  await linkRegistry.waitForDeployment();

  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const liberty = await MockERC20.deploy("Liberty", "LIB", 18);
  await liberty.waitForDeployment();

  const VaultF = await ethers.getContractFactory("LibertyVault");
  const vault = await VaultF.deploy(
    await linkRegistry.getAddress(),
    await liberty.getAddress(),
    owner.address,
    ethers.ZeroAddress
  );
  await vault.waitForDeployment();

  const RaffleF = await ethers.getContractFactory("LibertyRaffle");
  const raffle = await RaffleF.deploy(
    await vault.getAddress(),
    await linkRegistry.getAddress(),
    await liberty.getAddress(),
    ethers.ZeroAddress
  );
  await raffle.waitForDeployment();

  const FUND_50 = 5n * 10n ** 13n; // 0.05 ETH = 5000 cents

  await raffle.connect(owner).registerAccount(alice.address);
  console.log("Registered alice. raffleId:", await raffle.raffleId());
  console.log("lastDrawTime:", await raffle.lastDrawTime());
  console.log("prizePoolCents:", await raffle.prizePoolCents());
  console.log("canDraw:", await raffle.canDraw());

  await owner.sendTransaction({ to: await raffle.getAddress(), value: FUND_50 });
  console.log("\nAfter funding:");
  console.log("prizePoolCents:", await raffle.prizePoolCents());
  console.log("canDraw:", await raffle.canDraw());

  const balBefore = await ethers.provider.getBalance(alice.address);
  console.log("\nCalling checkAndDraw...");
  const tx = await raffle.connect(alice).checkAndDraw();
  const rcpt = await tx.wait();
  console.log("checkAndDraw succeeded! TX gasUsed:", rcpt.gasUsed);
  console.log("raffleId after:", await raffle.raffleId());
  console.log("prizePoolCents after:", await raffle.prizePoolCents());
  console.log("Events:", rcpt.logs.map(l => l.fragment ? l.fragment.name : 'unknown').join(', '));

  console.log("\nTrying to claim prize with raffleId=1...");
  try {
    const tx2 = await raffle.connect(alice).claimPrize(1, ethers.ZeroAddress);
    const rcpt2 = await tx2.wait();
    const balAfter = await ethers.provider.getBalance(alice.address);
    console.log("claimPrize succeeded! balAfter:", balAfter);
    console.log("balBefore:", balBefore);
    console.log("Difference:", balAfter - balBefore);
  } catch(e: any) {
    console.log("claimPrize FAILED:", e.reason ?? e.message.split('\n')[0]);
    // Check if raffleId=1 or 0
    console.log("Current raffleId:", await raffle.raffleId());
    console.log("rafflePrizes[1][alice]:", await raffle.rafflePrizes(1, alice.address));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
