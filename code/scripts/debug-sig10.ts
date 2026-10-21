import { ethers } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();
  const primary = signers[0]; // alice
  const bob = signers[1];
  const primaryAddr = primary.address;
  const bobAddr = bob.address;

  const TestRecover = await ethers.getContractFactory("TestRecover");
  const testRec = await TestRecover.deploy();
  await testRec.waitForDeployment();

  const LinkRegistry = await ethers.getContractFactory("LinkRegistry");
  const registry = await LinkRegistry.deploy();
  await registry.waitForDeployment();

  // Build challenge hash
  const challengeHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint256"],
      [primaryAddr, bobAddr, 0n]
    )
  );

  // Get signature from bob (ethers.js uses SHA-256 internally)
  const sig = await bob.signMessage(Buffer.from(challengeHash.slice(2), 'hex'));
  const { r, s, v } = ethers.Signature.from(sig);
  const rBytes = ethers.getBytes(r);
  const sBytes = ethers.getBytes(s);
  const vBytes = ethers.getBytes(ethers.toBeHex(v, 1));
  const sigBytes = ethers.concat([r, s, ethers.toBeHex(v, 1)]);

  console.log("Challenge hash:", challengeHash);
  console.log("Bob address:", bobAddr);
  console.log("Signature v:", v);

  // Test contract ETH_SIGN path
  try {
    const [result] = await testRec.testEthSignPath.staticCall(challengeHash, sigBytes);
    console.log("\nContract ecrecover ETH_SIGN path:", result);
    console.log("Matches bob?", result.toLowerCase() === bobAddr.toLowerCase());
  } catch(e: any) {
    console.log("\nContract ETH_SIGN path error:", e.message.split('\n')[0]);
  }

  // Test OZ ECDSA recover
  try {
    const [result] = await testRec.testOZ.staticCall(challengeHash, sigBytes);
    console.log("\nOZ ECDSA recover:", result);
    console.log("Matches bob?", result.toLowerCase() === bobAddr.toLowerCase());
  } catch(e: any) {
    console.log("\nOZ ECDSA error:", e.message.split('\n')[0]);
  }

  // Try calling LinkRegistry directly
  console.log("\n--- LinkRegistry direct call ---");
  try {
    await registry.connect(primary).linkWallet(primaryAddr, bobAddr, sigBytes);
    console.log("SUCCESS!");
  } catch(e: any) {
    console.log("FAILED:", e.message.split('\n')[0]);
  }

  // Now check what hash ethers is ACTUALLY computing
  // We know: ethers.signMessage(data) signs something, and ethers.verifyMessage(data, sig) recovers
  // The "data" here is the raw 32-byte challenge hash
  // What does ethers hash internally?
  
  // Try passing the challenge hash as a STRING (ethers might handle strings differently)
  const sig2 = await bob.signMessage(challengeHash); // pass as hex string
  const { r: r2, s: s2, v: v2 } = ethers.Signature.from(sig2);
  const sigBytes2 = ethers.concat([r2, s2, ethers.toBeHex(v2, 1)]);
  const recovered2 = ethers.verifyMessage(challengeHash, sig2);
  console.log("\n--- signMessage(hex string) ---");
  console.log("Sig2:", sig2.slice(0,20) + "...");
  console.log("Verify:", recovered2, "== bob?", recovered2.toLowerCase() === bobAddr.toLowerCase());
  try {
    const reg2 = await LinkRegistry.deploy();
    await reg2.waitForDeployment();
    await reg2.connect(primary).linkWallet(primaryAddr, bobAddr, sigBytes2);
    console.log("SUCCESS!");
  } catch(e: any) {
    console.log("FAILED:", e.message.split('\n')[0]);
  }
}

main().catch(console.error);
