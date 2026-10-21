import { ethers } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();
  const primary = signers[0];
  const bob = signers[1];
  const primaryAddr = primary.address;
  const bobAddr = bob.address;

  const TestRecover = await ethers.getContractFactory("TestRecover");
  const testRec = await TestRecover.deploy();
  await testRec.waitForDeployment();

  // Build challenge hash
  const challengeHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint256"],
      [primaryAddr, bobAddr, 0n]
    )
  );

  // Sign with bob
  const sig = await bob.signMessage(Buffer.from(challengeHash.slice(2), 'hex'));
  const { r, s, v } = ethers.Signature.from(sig);
  const sigBytes = ethers.concat([r, s, ethers.toBeHex(v, 1)]);

  // Compute ETH_SIGN hash
  const ethSignHash = ethers.keccak256(
    ethers.concat([
      ethers.toUtf8Bytes("\x19Ethereum Signed Message:\n32"),
      challengeHash
    ])
  );

  // Correct call: ecrecover(hash, v, r, s)
  const [recovered] = await testRec.testLink3.staticCall(ethSignHash, v, r, s);
  console.log("testLink3(hash, v, r, s):", recovered);
  console.log("Matches bob?", recovered.toLowerCase() === bobAddr.toLowerCase());

  // Wrong order: (hash, r, v, s)
  const [recovered2] = await testRec.testLink3.staticCall(ethSignHash, r, v, s);
  console.log("\ntestLink3(hash, r, v, s):", recovered2);
  console.log("Matches bob?", recovered2.toLowerCase() === bobAddr.toLowerCase());

  // Now the KEY question: does LinkRegistry's _verifySecondarySignature work?
  const LinkRegistry = await ethers.getContractFactory("LinkRegistry");
  const registry = await LinkRegistry.deploy();
  await registry.waitForDeployment();
  console.log("\n--- LinkRegistry direct call ---");
  try {
    await registry.connect(primary).linkWallet(primaryAddr, bobAddr, sigBytes);
    console.log("SUCCESS!");
  } catch(e: any) {
    console.log("FAILED:", e.message.split('\n')[0]);
  }

  // Check the exact signature being passed in the test
  // The sigBytes from the test has v=27, but maybe the test passes it differently
  console.log("\n--- Checking sigBytes ---");
  console.log("sigBytes length:", sigBytes.length);
  console.log("Last byte (v):", sigBytes[sigBytes.length-1]);
  console.log("Last byte hex:", ethers.toHexString(sigBytes[sigBytes.length-1]));
}

main().catch(console.error);
