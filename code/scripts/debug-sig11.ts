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
  console.log("Bob address:", bobAddr);
  console.log("Challenge hash:", challengeHash);
  console.log("Sig v:", v);
  console.log("Sig bytes length:", sigBytes.length);
  console.log("Sig bytes hex:", sigBytes);

  // Extract signature params
  const [rVal, sVal, vVal, len] = await testRec.extractSig.staticCall(sigBytes);
  console.log("\nExtracted r:", rVal);
  console.log("Extracted s:", sVal);
  console.log("Extracted v:", vVal);
  console.log("Extracted len:", len);

  // Compute ETH_SIGN hash
  const ethSignHash = ethers.keccak256(
    ethers.concat([
      ethers.toUtf8Bytes("\x19Ethereum Signed Message:\n32"),
      challengeHash
    ])
  );
  console.log("\nETH_SIGN hash:", ethSignHash);

  // Test link
  const [recovered, vFromLink, challengeFromLink, msgHashFromLink] =
    await testRec.testLink.staticCall(primaryAddr, bobAddr, sigBytes);
  console.log("\nRecovered:", recovered);
  console.log("Matches bob?", recovered.toLowerCase() === bobAddr.toLowerCase());
  console.log("vFromLink:", vFromLink);
  console.log("challengeFromLink:", challengeFromLink);
  console.log("msgHashFromLink:", msgHashFromLink);

  // Try direct ecrecover with explicit params
  const [recovered2] = await testRec.testLink3.staticCall(ethSignHash, vVal, rVal, sVal);
  console.log("\nDirect ecrecover:", recovered2);
  console.log("Matches bob?", recovered2.toLowerCase() === bobAddr.toLowerCase());
}

main().catch(console.error);
