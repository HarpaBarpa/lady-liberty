import { ethers } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();
  const [owner, alice, bob] = signers;

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

  const FUND_50 = ethers.parseEther("0.1"); // ~50 cents

  // --- TEST 1: winner can claim ---
  console.log("=== winner can claim ===");
  await raffle.connect(owner).registerAccount(alice.address);
  await owner.sendTransaction({ to: await raffle.getAddress(), value: FUND_50 });
  console.log("prizePoolCents:", await raffle.prizePoolCents());
  const bal0 = await ethers.provider.getBalance(alice.address);
  await raffle.connect(alice).checkAndDraw();
  console.log("raffleId:", await raffle.raffleId());
  console.log("rafflePrizes[1][alice]:", await raffle.rafflePrizes(1, alice.address));
  console.log("bal before claim:", bal0);
  try {
    await raffle.connect(alice).claimPrize(1, ethers.ZeroAddress);
    const bal1 = await ethers.provider.getBalance(alice.address);
    console.log("bal after claim:", bal1, "diff:", bal1 - bal0);
  } catch(e: any) { console.log("claim failed:", e.reason ?? e.message.split('\n')[0]); }

  // --- TEST 2: non-winner cannot claim ---
  console.log("\n=== non-winner cannot claim ===");
  await raffle.connect(owner).registerAccount(bob.address);
  await owner.sendTransaction({ to: await raffle.getAddress(), value: FUND_50 });
  console.log("prizePoolCents before draw:", await raffle.prizePoolCents());
  console.log("raffleId:", await raffle.raffleId());
  await raffle.connect(alice).checkAndDraw();
  console.log("raffleId after draw:", await raffle.raffleId());
  console.log("rafflePrizes[2][alice]:", await raffle.rafflePrizes(2, alice.address));
  console.log("rafflePrizes[2][bob]:", await raffle.rafflePrizes(2, bob.address));
  try {
    await raffle.connect(bob).claimPrize(2, ethers.ZeroAddress);
    console.log("bob claim succeeded (SHOULD HAVE REVERTED)");
  } catch(e: any) { console.log("bob claim reverted:", e.reason ?? e.message.split('\n')[0]); }

  // --- TEST 3: multiple draws ---
  console.log("\n=== multiple draws ===");
  // New raffle
  const RaffleF2 = await ethers.getContractFactory("LibertyRaffle");
  const raffle2 = await RaffleF2.deploy(
    await vault.getAddress(),
    await linkRegistry.getAddress(),
    await liberty.getAddress(),
    ethers.ZeroAddress
  );
  await raffle2.waitForDeployment();
  await raffle2.connect(owner).registerAccount(alice.address);
  for (let i = 1; i <= 3; i++) {
    await owner.sendTransaction({ to: await raffle2.getAddress(), value: FUND_50 });
    try {
      await raffle2.connect(alice).checkAndDraw();
      console.log(`draw ${i}: raffleId=${await raffle2.raffleId()}`);
    } catch(e: any) { console.log(`draw ${i} FAILED:`, e.reason ?? e.message.split('\n')[0]); }
    if (i < 3) await time.increase(3601);
  }

  // --- TEST 4: cooldown ---
  console.log("\n=== cooldown wallet filtered ===");
  const RaffleF3 = await ethers.getContractFactory("LibertyRaffle");
  const raffle3 = await RaffleF3.deploy(
    await vault.getAddress(),
    await linkRegistry.getAddress(),
    await liberty.getAddress(),
    ethers.ZeroAddress
  );
  await raffle3.waitForDeployment();
  await raffle3.connect(owner).registerAccount(alice.address);
  await raffle3.connect(owner).registerAccount(bob.address);
  await owner.sendTransaction({ to: await raffle3.getAddress(), value: ethers.parseEther("0.1") });
  console.log("pool:", await raffle3.prizePoolCents());
  await raffle3.connect(alice).checkAndDraw();
  console.log("raffleId after alice draw:", await raffle3.raffleId());
  console.log("alice in cooldown:", await raffle3.isInCooldown(alice.address));
  console.log("bob in cooldown:", await raffle3.isInCooldown(bob.address));
  await time.increase(3601);
  await owner.sendTransaction({ to: await raffle3.getAddress(), value: ethers.parseEther("0.1") });
  console.log("pool:", await raffle3.prizePoolCents());
  try {
    await raffle3.connect(bob).checkAndDraw();
    console.log("bob draw succeeded, raffleId:", await raffle3.raffleId());
  } catch(e: any) { console.log("bob draw failed:", e.reason ?? e.message.split('\n')[0]); }
}

main().catch(e => { console.error(e); process.exit(1); });
