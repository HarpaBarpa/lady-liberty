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
  const vault = await VaultF.deploy(await linkRegistry.getAddress(), await liberty.getAddress(), owner.address, ethers.ZeroAddress);
  await vault.waitForDeployment();
  const RaffleF = await ethers.getContractFactory("LibertyRaffle");
  const raffle = await RaffleF.deploy(await vault.getAddress(), await linkRegistry.getAddress(), await liberty.getAddress(), ethers.ZeroAddress);
  await raffle.waitForDeployment();

  await raffle.connect(owner).registerAccount(alice.address);
  await raffle.connect(owner).registerAccount(bob.address);
  await owner.sendTransaction({ to: await raffle.getAddress(), value: ethers.parseEther("0.1") });

  console.log("eligible accounts:", await raffle.isRegistered(alice.address), await raffle.isRegistered(bob.address));
  console.log("vault dust entries alice:", await vault.getDustEntries(alice.address));
  console.log("vault dust entries bob:", await vault.getDustEntries(bob.address));
  console.log("raffle.getAccountEntries(alice):", await raffle.getAccountEntries(alice.address));
  console.log("raffle.getAccountEntries(bob):", await raffle.getAccountEntries(bob.address));

  await raffle.connect(alice).checkAndDraw();
  console.log("\nAfter draw:");
  console.log("prize[1][alice]:", await raffle.rafflePrizes(1, alice.address));
  console.log("prize[1][bob]:", await raffle.rafflePrizes(1, bob.address));
  
  // What does getAccountEntries return now (after the draw)?
  console.log("\nPost-draw getAccountEntries:");
  console.log("alice:", await raffle.getAccountEntries(alice.address));
  console.log("bob:", await raffle.getAccountEntries(bob.address));
  console.log("vault dust entries bob:", await vault.getDustEntries(bob.address));
}

main().catch(e => { console.error(e); process.exit(1); });
