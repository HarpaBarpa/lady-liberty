import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

async function main() {
  const signers = await ethers.getSigners();
  const [owner, alice, bob, carol] = signers;

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
  await raffle.connect(alice).checkAndDraw();
  console.log("After draw 1 - alice:", await raffle.rafflePrizes(1, alice.address) > 0n, "bob:", await raffle.rafflePrizes(1, bob.address) > 0n);
  console.log("alice in cooldown:", await raffle.isInCooldown(alice.address), "bob:", await raffle.isInCooldown(bob.address));

  await raffle.connect(owner).registerAccount(carol.address);
  await time.increase(25 * 3600);
  await owner.sendTransaction({ to: await raffle.getAddress(), value: ethers.parseEther("0.1") });
  
  // Try all three
  for (const who of [alice, bob, carol]) {
    try { 
      const tx = await raffle.connect(who).checkAndDraw();
      await tx.wait();
      console.log(`${who.address.slice(0,6)} draw: OK, raffleId=${await raffle.raffleId()}`);
    } catch(e: any) { 
      console.log(`${who.address.slice(0,6)} draw:`, e.message?.split('\n')[0] ?? e.reason); 
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
