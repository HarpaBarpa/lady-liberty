import { ethers } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();
  const [owner, alice, dusty] = signers;

  const LinkRegistry = await ethers.getContractFactory("LinkRegistry");
  const linkRegistry = await LinkRegistry.deploy();
  await linkRegistry.waitForDeployment();

  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const dust = await MockERC20.deploy("Dust", "DUST", 18);
  await dust.waitForDeployment();

  const VaultF = await ethers.getContractFactory("LibertyVault");
  const vault = await VaultF.deploy(
    await linkRegistry.getAddress(),
    await dust.getAddress(),
    owner.address,
    ethers.ZeroAddress
  );
  await vault.waitForDeployment();
  await vault.addSupportedToken(await dust.getAddress());

  // Give dusty tokens and approve vault
  await dust.mint(dusty.address, ethers.parseEther("100"));
  await dust.connect(dusty).approve(await vault.getAddress(), ethers.parseEther("100"));

  // Link dusty to alice
  const TS = 1700000000;
  const domain = {
    name: "LibertyTorchLink", version: "1",
    chainId: 31337, verifyingContract: await linkRegistry.getAddress()
  };
  const types = {
    LinkRequest: [
      { name: "primary",   type: "address" },
      { name: "secondary", type: "address" },
      { name: "nonce",    type: "uint256" },
      { name: "timestamp", type: "uint256" }
    ]
  };
  const val = { primary: alice.address, secondary: dusty.address, nonce: 0, timestamp: TS };
  const sig = await dusty.signTypedData(domain, types, val);
  await linkRegistry.connect(alice).linkWallet(alice.address, dusty.address, TS, ethers.getBytes(sig));
  console.log("Linked!");

  const smol = ethers.parseEther("0.5");

  // First deposit
  await vault.connect(dusty).depositDust(alice.address, await dust.getAddress(), smol);
  console.log("After deposit 1:");
  console.log("  getDustEntries(alice):", await vault.getDustEntries(alice.address));
  console.log("  getCurrentCycleUsdCents(dusty):", await vault.getCurrentCycleUsdCents(dusty.address));

  // Second deposit
  await vault.connect(dusty).depositDust(alice.address, await dust.getAddress(), smol);
  console.log("After deposit 2:");
  console.log("  getDustEntries(alice):", await vault.getDustEntries(alice.address));
  console.log("  getCurrentCycleUsdCents(dusty):", await vault.getCurrentCycleUsdCents(dusty.address));
  console.log("  Expected: 2");
}

main().catch(e => { console.error(e); process.exit(1); });
