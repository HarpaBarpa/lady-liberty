import { ethers } from "hardhat";

async function main() {
  // Deploy a fresh LinkRegistry and try linkWallet directly
  const signers = await ethers.getSigners();
  const [alice, bob] = signers;

  const LinkRegistry = await ethers.getContractFactory("LinkRegistry");
  const registry = await LinkRegistry.deploy();
  await registry.waitForDeployment();

  const primaryAddr = alice.address;
  const bobAddr = bob.address;

  // Challenge hash
  const challengeHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint256"],
      [primaryAddr, bobAddr, 0n]
    )
  );

  // Sign
  const sig = await bob.signMessage(ethers.toBeHex(challengeHash, 32));
  const { r, s, v } = ethers.Signature.from(sig);
  const rBytes = ethers.getBytes(r);
  const sBytes = ethers.getBytes(s);
  const vBytes = ethers.getBytes(ethers.toBeHex(v, 1));
  console.log("Signature v from ethers:", v, "(raw from sig, should be 27 or 28)");

  // Build 65-byte signature with v=27 or v=28 (NOT converted)
  const sigBytes = ethers.concat([r, s, ethers.toBeHex(v, 1)]);
  console.log("Sig bytes last byte:", sigBytes[64].toString(), "(should be 27 or 28)");

  // Try contract call
  console.log("\nCalling linkRegistry.linkWallet...");
  try {
    const tx = await registry.connect(alice).linkWallet(primaryAddr, bobAddr, sigBytes);
    await tx.wait();
    console.log("SUCCESS! isLinked:", await registry.isLinkedTo(primaryAddr, bobAddr));
  } catch(e: any) {
    console.log("FAILED:", e.message.split('\n')[0]);
  }
}

main().catch(console.error);
