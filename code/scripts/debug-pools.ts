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

  await raffle.connect(owner).registerAccount(alice.address);
  console.log("After register:", await raffle.prizePoolCents());

  await raffle.connect(owner).fundPrizePoolETH({ value: 1n });
  console.log("After fundPrizePoolETH(1 wei):", await raffle.prizePoolCents());
  console.log("Expected: 0 (1 wei / 1e10 = 0)");

  // Check what MIN_POOL_CENTS is
  console.log("MIN_POOL_CENTS:", await raffle.MIN_POOL_CENTS());
  console.log("MAX_WINNERS:", await raffle.MAX_WINNERS());

  // Check if Raffle has any other state that could interfere
  console.log("raffleId:", await raffle.raffleId());
}

main().catch(e => { console.error(e); process.exit(1); });
