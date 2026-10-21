import { ethers } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();
  const [alice, bob] = signers;

  const TestRecover = await ethers.getContractFactory("TestRecover");
  const testRec = await TestRecover.deploy();
  await testRec.waitForDeployment();

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
  console.log("Challenge hash:", challengeHash);

  // Sign
  const sig = await bob.signMessage(ethers.toBeHex(challengeHash, 32));
  const { r, s, v } = ethers.Signature.from(sig);
  
  // Parse r and s as bigints for clean passing
  const rInt = BigInt(r);
  const sInt = BigInt(s);
  
  // Test which v convention works
  const [v27, v0] = await testRec.testBothV.staticCall(challengeHash, rInt, sInt);
  console.log("\nWith v=27:", v27, "== bob?", v27.toLowerCase() === bobAddr.toLowerCase());
  console.log("With v=0: ", v0, "== bob?", v0.toLowerCase() === bobAddr.toLowerCase());

  // Now build the exact 65-byte signature and try LinkRegistry
  const rawSig = ethers.getBytes(sig); // ethers' original 65-byte result
  console.log("\nrawSig length:", rawSig.length, "last byte:", rawSig[64]);

  // Try with the exact signature from ethers
  try {
    await registry.connect(alice).linkWallet(primaryAddr, bobAddr, rawSig);
    console.log("SUCCESS with rawSig!");
  } catch(e: any) {
    console.log("FAILED with rawSig:", e.message.split('\n')[0]);
  }

  // What does _splitSignature in LinkRegistry extract?
  // It uses: v := byte(0, calldataload(add(sig.offset, 64)))
  // byte(0, x) extracts the first byte of x
  // For rawSig[64] = 27: byte(0, 0x1b) = 0x1b = 27
  // But ecrecover expects v in {0, 1}!
  // So with v=27: ecrecover(..., 27, ...) → ecrecover(..., 0x1b, ...) → ??? 
  //
  // Actually: ecrecover in the EVM interprets v as:
  // v = 27 or 28 (EIP-155 style)
  // But OpenSSL and some implementations use 0/1
  // The Solidity ecrecover precompile accepts v = 27 or 28
  // Let me verify by checking what works in testBothV
  
  // If v0 works but v27 doesn't → ecrecover in this EVM uses 0/1
  // If v27 works but v0 doesn't → ecrecover in this EVM uses 27/28
}

main().catch(console.error);
