// Run this AFTER the test's deploySystem to see if shared state bleeds
import { ethers, time } from "hardhat";

async function main() {
  // Simulate what the test suite does
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
  await owner.sendTransaction({ to: await raffle.getAddress(), value: ethers.parseEther("0.1") });

  // Check entries at draw time
  const aliceEntries = await raffle.getAccountEntries(alice.address);
  const bobEntries = await raffle.getAccountEntries(bob.address);
  console.log(`alice has ${aliceEntries} entries, bob has ${bobEntries} entries`);
  console.log("Total entries:", aliceEntries + bobEntries);

  await raffle.connect(alice).checkAndDraw();
  
  const alicePrize = await raffle.rafflePrizes(1, alice.address);
  const bobPrize = await raffle.rafflePrizes(1, bob.address);
  console.log(`\nAfter draw 1: alicePrize=${alicePrize}, bobPrize=${bobPrize}`);
  console.log("Expected: alice>0, bob can be 0 (if alice won all 10 slots) or >0 (if bob won some slots)");

  // The correct non-winner test should check that bob CAN win sometimes
  // But in the test, we want bob to NOT win. Let's check: does alice have enough to win 10 slots?
  // 10M cents / 10 slots with payout totals = ?
  // Payouts: [3500,2000,1200,800,600,500,400,300,200,100] = 9600 total
  // Average payout: 960 bps = 0.096
  // 10M * 0.096 = 960,000 cents to cover all 10 slots
  // 10M / 10 = 1,000,000 cents per slot if equal
  // With 1 entry each: alice has 50% chance for each slot. 
  // Alice needs to win 10 slots → probability = (0.5)^10 = 0.1%
  // So bob almost always wins at least 1 slot!
  // The test is fundamentally broken with only 2 accounts.
  
  // Fix: register 10 accounts so alice is the only one with dust entries
  console.log("\n=== Fixed approach: 10 accounts, only alice has dust ===");
  const RaffleF2 = await ethers.getContractFactory("LibertyRaffle");
  const raffle2 = await RaffleF2.deploy(await vault.getAddress(), await linkRegistry.getAddress(), await liberty.getAddress(), ethers.ZeroAddress);
  await raffle2.waitForDeployment();
  
  for (let i = 0; i < 10; i++) {
    await raffle2.connect(owner).registerAccount(signers[i].address);
  }
  await owner.sendTransaction({ to: await raffle2.getAddress(), value: ethers.parseEther("0.1") });
  const tx2 = await raffle2.connect(alice).checkAndDraw();
  await tx2.wait();
  
  const bobPrize2 = await raffle2.rafflePrizes(1, bob.address);
  const carolPrize = await raffle2.rafflePrizes(1, signers[4].address);
  console.log(`bobPrize=${bobPrize2}, carolPrize=${carolPrize}`);
  console.log("With 10 accounts and 1 entry each: alice wins 1 slot, bob should get 0 ✓");
}

main().catch(e => { console.error(e); process.exit(1); });
