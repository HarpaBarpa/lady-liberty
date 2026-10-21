import { ethers } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();
  const [alice, bob] = signers;

  const LinkRegistry = await ethers.getContractFactory("LinkRegistry");
  const registry = await LinkRegistry.deploy();
  await registry.waitForDeployment();

  const primaryAddr = alice.address;
  const bobAddr = bob.address;

  const challengeHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint256"],
      [primaryAddr, bobAddr, 0n]
    )
  );

  const sig = await bob.signMessage(ethers.toBeHex(challengeHash, 32));
  const { r, s, v } = ethers.Signature.from(sig);

  // CRITICAL: ethers.Signature.from returns hex STRINGS. ethers.concat of hex strings
  // does string concatenation. We MUST use ethers.getBytes to convert to Byte arrays.
  const rBytes = ethers.getBytes(r);
  const sBytes = ethers.getBytes(s);
  const vBytes = ethers.getBytes(ethers.toBeHex(v, 1));
  const sigBytes = ethers.concat([rBytes, sBytes, vBytes]);

  console.log("sigBytes length:", sigBytes.length, "(should be 65)");
  console.log("Last byte:", sigBytes[64], "(should be 27 or 28)");

  // Verify with ethers
  const recovered = ethers.verifyMessage(ethers.toBeHex(challengeHash, 32), sig);
  console.log("Recovered:", recovered, "== bob?", recovered.toLowerCase() === bobAddr.toLowerCase());

  try {
    await registry.connect(alice).linkWallet(primaryAddr, bobAddr, sigBytes);
    console.log("SUCCESS!");
  } catch(e: any) {
    console.log("FAILED:", e.message.split('\n')[0]);
  }
}

main().catch(console.error);
