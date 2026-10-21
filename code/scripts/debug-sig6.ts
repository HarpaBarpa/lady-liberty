import { ethers } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();
  const bob = signers[1];
  const primary = signers[0];
  const primaryAddr = primary.address;
  const bobAddr = bob.address;

  const TestRecover = await ethers.getContractFactory("TestRecover");
  const testRec = await TestRecover.deploy();
  await testRec.waitForDeployment();

  // Challenge hash
  const challengeHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint256"],
      [primaryAddr, bobAddr, 0n]
    )
  );

  // Get signature from bob (uses SHA-256 internally in ethers.js)
  const sig = await bob.signMessage(ethers.toBeHex(challengeHash, 32));
  const { r, s, v } = ethers.Signature.from(sig);
  const sigBytes = ethers.concat([r, s, ethers.toBeHex(v, 1)]);
  console.log("Challenge hash:", challengeHash);
  console.log("Bob address:", bobAddr);
  console.log("Sig bytes v:", v, "(v in signature)");

  // Test keccak256 path
  const [keccakResult] = await testRec.testKeccakPath.staticCall(challengeHash, sigBytes);
  console.log("\nKeccak256 path recovered:", keccakResult);
  console.log("Matches bob?", keccakResult.toLowerCase() === bobAddr.toLowerCase());

  // Test SHA-256 path
  const [shaResult] = await testRec.testSha256Path.staticCall(challengeHash, sigBytes);
  console.log("\nSHA-256 path recovered:", shaResult);
  console.log("Matches bob?", shaResult.toLowerCase() === bobAddr.toLowerCase());

  // Also check: ethers recover vs contract
  const ethersRecovered = ethers.verifyMessage(ethers.toBeHex(challengeHash, 32), sig);
  console.log("\nethers.verifyMessage:", ethersRecovered);

  // Now check what hash ethers is actually using
  const ethersHashMsg = ethers.hashMessage(ethers.toBeHex(challengeHash, 32));
  console.log("ethers.hashMessage:", ethersHashMsg);

  // The hash ethers uses = sha256("\x19..." || sha256(data))
  // In contract, ecrecover(sha256Hash, v, r, s) would use the same
  // Let's verify ethers.verifyMessage = ecrecover(ethers.hashMessage, ...)
  console.log("\n=== Direct ecrecover check ===");
  // ethers.hashMessage returns the hash used in ecrecover internally
  // Let's manually do what ethers does for verification
  const hashUsed = ethersHashMsg; // this is what ethers hashed the data to
  console.log("Hash ethers uses:", hashUsed);

  // The contract SHA path uses: sha256(abi.encodePacked(prefix, challengeHash))
  // ethers uses: sha256(prefix || sha256(data))
  // These are different unless prefixHash == sha256(data)
  console.log("\nIs sha256(prefix) == challengeHash?", 
    ethers.keccak256(ethers.toUtf8Bytes("\x19Ethereum Signed Message:\n32")) === challengeHash);
}

main().catch(console.error);
