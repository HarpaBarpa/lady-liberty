import { ethers } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();
  const [alice, bob] = signers;
  const primaryAddr = alice.address;
  const bobAddr = bob.address;

  // Use a test key pair with known low-S signature
  // Hardhat account 2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC (bob)
  // Private key: 0x5de4111afa1a4b94908f83103c1f2f19ced9a67a2ee90e87650c6fc5e83d3e5
  const bobPK = "0x5de4111afa1a4b94908f83103c1f2f19ced9a67a2ee90e87650c6fc5e83d3e5";
  const bobWallet = new ethers.Wallet(bobPK, ethers.provider);

  const challengeHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint256"],
      [primaryAddr, bobAddr, 0n]
    )
  );

  const sig = await bobWallet.signMessage(ethers.toBeHex(challengeHash, 32));
  console.log("Signature:", sig);
  const sigObj = ethers.Signature.from(sig);
  console.log("r:", sigObj.r.slice(0, 20) + "...");
  console.log("s:", sigObj.s.slice(0, 20) + "...");
  console.log("v:", sigObj.v, "yParity:", sigObj.yParity);
  
  // Now check what ethers sends as calldata
  const rawSig = ethers.getBytes(sig);
  console.log("\nrawSig length:", rawSig.length, "(should be 65)");
  console.log("Last byte:", rawSig[64], "(should be 0x1b=27 or 0x1c=28)");

  // Build the same way as test (should be identical to rawSig)
  const { r, s, v } = sigObj;
  const rBytes = ethers.getBytes(r);
  const sBytes = ethers.getBytes(s);
  const vBytes = ethers.getBytes(ethers.toBeHex(v, 1));
  const sigBytes = ethers.getBytes(ethers.concat([rBytes, sBytes, vBytes]));
  console.log("sigBytes length:", sigBytes.length);
  console.log("Last byte:", sigBytes[64]);
  console.log("sigBytes == rawSig?", Buffer.from(sigBytes).equals(Buffer.from(rawSig)));

  // Try calling the contract with rawSig (what ethers originally returned)
  const LinkRegistry = await ethers.getContractFactory("LinkRegistry");
  const registry = await LinkRegistry.deploy();
  await registry.waitForDeployment();

  try {
    await registry.connect(alice).linkWallet(primaryAddr, bobAddr, rawSig);
    console.log("\nrawSig: SUCCESS!");
  } catch(e: any) {
    console.log("\nrawSig: FAILED -", e.message.split('\n')[0]);
  }

  try {
    const reg2 = await LinkRegistry.deploy();
    await reg2.waitForDeployment();
    await reg2.connect(alice).linkWallet(primaryAddr, bobAddr, sigBytes);
    console.log("sigBytes: SUCCESS!");
  } catch(e: any) {
    console.log("sigBytes: FAILED -", e.message.split('\n')[0]);
  }
}

main().catch(console.error);
