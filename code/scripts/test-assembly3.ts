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

  // Method: ethers.joinSignature to get 65-byte hex string, then getBytes
  const sigHex = ethers.joinSignature(sig);
  console.log("joinSignature length:", sigHex.length, "(should be 132)");
  const sigBytes = ethers.getBytes(sigHex);
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
