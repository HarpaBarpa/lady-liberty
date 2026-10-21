import { ethers, time } from "hardhat";

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
  const vault = await VaultF.deploy(await linkRegistry.getAddress(), await liberty.getAddress(), owner.address, ethers.ZeroAddress);
  await vault.waitForDeployment();
  const RaffleF = await ethers.getContractFactory("LibertyRaffle");
  const raffle = await RaffleF.deploy(await vault.getAddress(), await linkRegistry.getAddress(), await liberty.getAddress(), ethers.ZeroAddress);
  await raffle.waitForDeployment();

  await raffle.connect(owner).registerAccount(alice.address);
  await raffle.connect(owner).registerAccount(bob.address);
  const bal = ethers.parseEther("0.1");
  await owner.sendTransaction({ to: await raffle.getAddress(), value: bal });
  console.log("pool cents:", await raffle.prizePoolCents());
  console.log("lastDrawTime:", (await raffle.lastDrawTime()).toString());
  console.log("canDraw:", await raffle.canDraw());

  const tx = await raffle.connect(alice).checkAndDraw();
  await tx.wait();
  console.log("\nAfter alice draw:");
  console.log("raffleId:", await raffle.raffleId());
  console.log("prize[1][alice]:", await raffle.rafflePrizes(1, alice.address));
  console.log("prize[1][bob]:", await raffle.rafflePrizes(1, bob.address));
  console.log("cooldown alice:", await raffle.cooldownUntil(alice.address));
  console.log("cooldown bob:", await raffle.cooldownUntil(bob.address));
  console.log("isInCooldown(alice):", await raffle.isInCooldown(alice.address));
  console.log("isInCooldown(bob):", await raffle.isInCooldown(bob.address));

  console.log("\nIncreasing time by 25 hours...");
  await time.increase(25 * 3600);
  console.log("block timestamp:", (await ethers.provider.getBlock('latest'))?.timestamp);
  console.log("isInCooldown(alice):", await raffle.isInCooldown(alice.address));
  console.log("canDraw:", await raffle.canDraw());

  await owner.sendTransaction({ to: await raffle.getAddress(), value: bal });
  console.log("\npool:", await raffle.prizePoolCents());
  try {
    const tx2 = await raffle.connect(bob).checkAndDraw();
    await tx2.wait();
    console.log("bob draw OK! raffleId:", await raffle.raffleId());
  } catch(e: any) {
    console.log("bob draw FAILED:", e.reason ?? e.message.split('\n')[0]);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
