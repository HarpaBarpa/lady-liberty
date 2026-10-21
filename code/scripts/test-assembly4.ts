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

  // Use ethers.zeroPadBytes to get fixed-width 32-byte arrays for r and s
  // Use Uint8Array for v (1 byte)
  const rBytes = ethers.zeroPadBytes(r, 32);
  const sBytes = ethers.zeroPadBytes(s, 32);
  // Convert v to a single byte
  const vData = new Uint8Array([v]); // v = 27 or 28
  const sigBytes = ethers.concat([rBytes, sBytes, vData]);

  console.log("rBytes length:", rBytes.length);
  console.log("sBytes length:", sBytes.length);
  console.log("vData length:", vData.length);
  console.log("Total sigBytes length:", sigBytes.length, "(should be 65)");
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
