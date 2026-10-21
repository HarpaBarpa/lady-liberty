import { ethers, time } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();
  const [owner, alice, bob] = signers;
  const FUND_50 = ethers.parseEther("0.1");

  // Deploy fresh contracts
  const LinkRegistry = await ethers.getContractFactory("LinkRegistry");
  const linkRegistry = await LinkRegistry.deploy();
  await linkRegistry.waitForDeployment();
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const liberty = await MockERC20.deploy("Liberty", "LIB", 18);
  await liberty.waitForDeployment();
  const VaultF = await ethers.getContractFactory("LibertyVault");
  const vault = await VaultF.deploy(await linkRegistry.getAddress(), await liberty.getAddress(), owner.address, ethers.ZeroAddress);
  await vault.waitForDeployment();
  const RaffleF = await ethers.getContractFactory("LibertyRaffle");
  const raffle = await RaffleF.deploy(await vault.getAddress(), await linkRegistry.getAddress(), await liberty.getAddress(), ethers.ZeroAddress);
  await raffle.waitForDeployment();

  await raffle.connect(owner).registerAccount(alice.address);
  await raffle.connect(owner).registerAccount(bob.address);
  await owner.sendTransaction({ to: await raffle.getAddress(), value: FUND_50 });

  console.log("pool:", await raffle.prizePoolCents(), "cents");
  console.log("registered:", await raffle.isRegistered(alice.address), await raffle.isRegistered(bob.address));

  const bal0 = await ethers.provider.getBalance(alice.address);
  const tx = await raffle.connect(alice).checkAndDraw();
  const rcpt = await tx.wait();
  console.log("draw gas used:", rcpt.gasUsed);
  const balAfterDraw = await ethers.provider.getBalance(alice.address);
  console.log("bal after draw:", balAfterDraw, "diff from bal0:", balAfterDraw - bal0);
  console.log("raffleId:", await raffle.raffleId());
  console.log("prize for alice:", await raffle.rafflePrizes(1, alice.address));
  console.log("prize for bob:", await raffle.rafflePrizes(1, bob.address));
  console.log("contract balance:", await ethers.provider.getBalance(await raffle.getAddress()));

  // Claim prize
  const prize = await raffle.rafflePrizes(1, alice.address);
  console.log("\nAlice claiming prize:", prize, "cents =", prize * 10n**10n, "wei");
  const balBefore = await ethers.provider.getBalance(alice.address);
  const balContractBefore = await ethers.provider.getBalance(await raffle.getAddress());
  try {
    const tx2 = await raffle.connect(alice).claimPrize(1, ethers.ZeroAddress);
    const rcpt2 = await tx2.wait();
    console.log("claim gas:", rcpt2.gasUsed);
    const balAfter = await ethers.provider.getBalance(alice.address);
    console.log("bal before claim:", balBefore);
    console.log("bal after claim:", balAfter);
    console.log("net gain:", balAfter - balBefore);
    console.log("contract bal after:", await ethers.provider.getBalance(await raffle.getAddress()));
  } catch(e: any) {
    console.log("claim failed:", e.reason ?? e.message.split('\n')[0]);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
