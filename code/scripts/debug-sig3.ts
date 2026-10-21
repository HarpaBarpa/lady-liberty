import { ethers, network } from "hardhat";
import { Signer } from "ethers";

async function main() {
  const signers = await ethers.getSigners();
  const primary = signers[0]; // alice
  const bob = signers[1];    // bob

  const primaryAddr = primary.address;
  const bobAddr = bob.address;
  console.log("Primary:", primaryAddr);
  console.log("Bob:    ", bobAddr);

  // Build challenge hash (same as contract)
  const challengeHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint256"],
      [primaryAddr, bobAddr, 0n]
    )
  );
  console.log("Challenge hash:", challengeHash);

  // Sign with bob's signer (HardhatEthersSigner → Wallet → signMessage)
  // This uses SHA-256 (node crypto) not keccak256
  const sig = await bob.signMessage(ethers.toBeHex(challengeHash, 32));
  console.log("Signature:", sig);

  const { r, s, v } = ethers.Signature.from(sig);
  const rBytes = ethers.getBytes(r);
  const sBytes = ethers.getBytes(s);
  const vBytes = ethers.getBytes(ethers.toBeHex(v, 1));
  console.log("r:", r);
  console.log("s:", s);
  console.log("v:", v, "(27 or 28)");

  // Build 65-byte signature: r(32) + s(32) + v(1)
  // Try both v conventions
  const sigBytes_0or1 = ethers.concat([r, s, ethers.toBeHex(v === 27 ? 0 : 1, 1)]);
  const sigBytes_27or28 = ethers.concat([r, s, ethers.toBeHex(v, 1)]);
  console.log("\nSig bytes (v=0/1):", sigBytes_0or1.length, "bytes");
  console.log("Sig bytes (v=27/28):", sigBytes_27or28.length, "bytes");

  const LinkRegistry = await ethers.getContractFactory("LinkRegistry");
  
  // Try v=0/1
  const reg1 = await LinkRegistry.deploy();
  await reg1.waitForDeployment();
  console.log("\n=== v=0/1 ===");
  try {
    await reg1.connect(primary).linkWallet(primaryAddr, bobAddr, sigBytes_0or1);
    console.log("SUCCESS");
  } catch(e: any) {
    console.log("FAILED:", e.message.split('\n')[0]);
  }

  // Try v=27/28
  const reg2 = await LinkRegistry.deploy();
  await reg2.waitForDeployment();
  console.log("\n=== v=27/28 ===");
  try {
    await reg2.connect(primary).linkWallet(primaryAddr, bobAddr, sigBytes_27or28);
    console.log("SUCCESS");
  } catch(e: any) {
    console.log("FAILED:", e.message.split('\n')[0]);
  }
}

main().catch(console.error);
