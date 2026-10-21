import { ethers } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();
  const [alice, bob] = signers;
  const primaryAddr = alice.address;
  const bobAddr = bob.address;

  const TestRecover = await ethers.getContractFactory("TestRecover");
  const testRec = await TestRecover.deploy();
  await testRec.waitForDeployment();

  const challengeHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint256"],
      [primaryAddr, bobAddr, 0n]
    )
  );
  console.log("Challenge hash:", challengeHash);

  const sig = await bob.signMessage(ethers.toBeHex(challengeHash, 32));
  const { r, s, v } = ethers.Signature.from(sig);

  // Build 65-byte bytes
  const rBytes = ethers.getBytes(r);
  const sBytes = ethers.getBytes(s);
  const vBytes = ethers.getBytes(ethers.toBeHex(v, 1));
  const sigBytes = ethers.getBytes(ethers.concat([rBytes, sBytes, vBytes]));

  console.log("sigBytes length:", sigBytes.length);
  console.log("Last byte (raw v):", sigBytes[64]);

  const recovered = ethers.verifyMessage(ethers.toBeHex(challengeHash, 32), sig);
  console.log("ethers recovered:", recovered, "== bob?", recovered.toLowerCase() === bobAddr.toLowerCase());

  // Call TestRecover
  const [rOut, sOut, vOut, challengeOut, recovered1, recovered2] =
    await testRec.extractAndTest.staticCall(
      challengeHash, sigBytes, bobAddr, 0
    );

  console.log("\n--- Contract extracted ---");
  console.log("r:", rOut);
  console.log("s:", sOut);
  console.log("v (raw):", vOut);
  console.log("Challenge hash:", challengeHash, "== computed:", challengeHash === challengeOut);
  console.log("Recovered (v raw):", recovered1);
  console.log("Recovered (v-27):", recovered2);
  console.log("Bob addr:", bobAddr);
  console.log("recovered1 == bob?", recovered1.toLowerCase() === bobAddr.toLowerCase());
  console.log("recovered2 == bob?", recovered2.toLowerCase() === bobAddr.toLowerCase());

  // Now try LinkRegistry
  const LinkRegistry = await ethers.getContractFactory("LinkRegistry");
  const registry = await LinkRegistry.deploy();
  await registry.waitForDeployment();

  console.log("\n--- LinkRegistry ---");
  try {
    await registry.connect(alice).linkWallet(primaryAddr, bobAddr, sigBytes);
    console.log("SUCCESS!");
  } catch(e: any) {
    console.log("FAILED:", e.message.split('\n')[0]);
  }
}

main().catch(console.error);
