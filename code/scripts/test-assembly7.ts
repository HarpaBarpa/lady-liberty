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

  // Build bytes using Buffer (the reliable way)
  const rBuf = Buffer.from(r.slice(2), 'hex');
  const sBuf = Buffer.from(s.slice(2), 'hex');
  const vBuf = Buffer.from([v]);
  const sigBuf = Buffer.concat([rBuf, sBuf, vBuf]);
  console.log("Buffer path - sigBuf length:", sigBuf.length, "last byte:", sigBuf[64]);

  // Verify with ethers
  const recovered = ethers.verifyMessage(ethers.toBeHex(challengeHash, 32), sig);
  console.log("ethers recovered:", recovered, "== bob?", recovered.toLowerCase() === bobAddr.toLowerCase());

  // Check sigBuf is 65 bytes
  if (sigBuf.length !== 65) {
    console.log("ERROR: Buffer is not 65 bytes!");
    return;
  }

  try {
    await registry.connect(alice).linkWallet(primaryAddr, bobAddr, sigBuf);
    console.log("SUCCESS with Buffer!");
  } catch(e: any) {
    console.log("FAILED:", e.message.split('\n')[0]);
  }

  // Now try with ethers.getBytes(ethers.concat(...))
  const rBytes = ethers.getBytes(r);
  const sBytes = ethers.getBytes(s);
  const vBytes = ethers.getBytes(ethers.toBeHex(v, 1));
  const concatResult = ethers.concat([rBytes, sBytes, vBytes]);
  console.log("\nConcat result type:", typeof concatResult, "length:", (concatResult as any).length);
  const sigBytesFixed = ethers.getBytes(concatResult);
  console.log("sigBytesFixed type:", typeof sigBytesFixed, "length:", sigBytesFixed.length);
  if (sigBytesFixed.length === 65) {
    console.log("sigBytesFixed last byte:", sigBytesFixed[64]);
  }

  if (sigBytesFixed.length === 65) {
    try {
      const reg2 = await LinkRegistry.deploy();
      await reg2.waitForDeployment();
      await reg2.connect(alice).linkWallet(primaryAddr, bobAddr, sigBytesFixed);
      console.log("SUCCESS with ethers.getBytes(concat(...))!");
    } catch(e: any) {
      console.log("FAILED with getBytes(concat):", e.message.split('\n')[0]);
    }
  }
}

main().catch(console.error);
