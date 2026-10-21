import { ethers } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();
  const [owner, alice, bob] = signers;
  const FUND_50 = ethers.parseEther("0.1");

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

  const balBefore = await ethers.provider.getBalance(alice.address);
  const balContract = await ethers.provider.getBalance(await raffle.getAddress());
  console.log("balBefore:", balBefore);
  console.log("contract bal:", balContract);

  await raffle.connect(alice).checkAndDraw();
  console.log("contract bal after draw:", await ethers.provider.getBalance(await raffle.getAddress()));
  console.log("raffleId:", await raffle.raffleId());
  console.log("prize[1][alice]:", await raffle.rafflePrizes(1, alice.address));
  console.log("prize[1][bob]:", await raffle.rafflePrizes(1, bob.address));
  console.log("balAfterDraw:", await ethers.provider.getBalance(alice.address));

  // What will alice RECEIVE if she claims?
  const prize = await raffle.rafflePrizes(1, alice.address);
  const expectedWei = prize * 10000000000n; // cents * 1e10
  console.log("\nprize cents:", prize);
  console.log("expected wei to receive:", expectedWei);
  console.log("balBefore + expectedWei:", balBefore + expectedWei);
  
  // Now claim
  const balBeforeClaim = await ethers.provider.getBalance(alice.address);
  const balContractBefore = await ethers.provider.getBalance(await raffle.getAddress());
  const tx = await raffle.connect(alice).claimPrize(1, ethers.ZeroAddress);
  const rcpt = await tx.wait();
  const balAfterClaim = await ethers.provider.getBalance(alice.address);
  console.log("\nbalBeforeClaim:", balBeforeClaim);
  console.log("balAfterClaim:", balAfterClaim);
  console.log("diff:", balAfterClaim - balBeforeClaim);
  console.log("gas:", rcpt.gasUsed * rcpt.gasPrice);
  console.log("expected diff (prize - gas):", expectedWei, "-", rcpt.gasUsed * rcpt.gasPrice, "=");
  console.log("balAfterClaim should be:", balBefore + expectedWei - rcpt.gasUsed * rcpt.gasPrice);
}

main().catch(e => { console.error(e); process.exit(1); });
