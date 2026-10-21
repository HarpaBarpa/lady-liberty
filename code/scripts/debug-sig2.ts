import { ethers } from "hardhat";

async function main() {
  const [primary] = await ethers.getSigners();
  // Hardhat account 1
  const pk = "0x59c6995e998f97a5a0044966f0945389dc9e86dae97c5f23d15c3b0f8b2e8e6";
  const wallet = new ethers.Wallet(pk, ethers.provider);
  const primaryAddr = await primary.getAddress();
  const secondaryAddr = wallet.address;
  console.log("Primary:", primaryAddr);
  console.log("Secondary:", secondaryAddr);

  // Challenge hash (same formula as contract)
  const challengeHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint256"],
      [primaryAddr, secondaryAddr, 0n]
    )
  );
  console.log("Challenge:", challengeHash);

  // Compute both hashes that contract uses
  const sha256js = "0x" + require('crypto').createHash('sha256').update(
    Buffer.from([0x19, 0x45, 0x74, 0x68, 0x65, 0x72, 0x65, 0x75, 0x6d, 0x20,
      0x53, 0x69, 0x67, 0x6e, 0x65, 0x64, 0x20, 0x4d, 0x65, 0x73, 0x73, 0x61,
      0x67, 0x65, 0x3a, 0x6e, 0x33, 0x32])
      .concat(Buffer.from(challengeHash.slice(2), 'hex'))
  ).digest('hex');
  console.log("SHA-256 (node crypto):", sha256js);

  const ethSignHash = ethers.keccak256(
    ethers.concat([
      ethers.toUtf8Bytes("\x19Ethereum Signed Message:\n32"),
      challengeHash
    ])
  );
  console.log("ETH_SIGN hash (keccak256):", ethSignHash);
  console.log("SHA-256 == ETH_SIGN?", sha256js === ethSignHash);
  console.log("SHA-256 == challengeHash?", sha256js === challengeHash);

  const LinkRegistry = await ethers.getContractFactory("LinkRegistry");
  const registry = await LinkRegistry.deploy();
  await registry.waitForDeployment();

  // === METHOD 1: ethers.Wallet.signMessage with 32-byte data ===
  // ethers.js treats 32-byte data as raw binary: hash = sha256(prefix || sha256(data))
  const sig1 = await wallet.signMessage(ethers.toBeHex(challengeHash, 32));
  const { r, s, v } = ethers.Signature.from(sig1);
  console.log("\n=== METHOD 1: signMessage(32bytes) ===");
  console.log("v from Signature.from:", v, "(0=27, 1=28)");
  const sigBytes1 = ethers.concat([r, s, ethers.toBeHex(v, 1)]);
  console.log("vByte sent:", v);
  try {
    await registry.connect(primary).linkWallet(primaryAddr, secondaryAddr, sigBytes1);
    console.log("RESULT: SUCCESS");
  } catch(e: any) {
    console.log("RESULT:", e.message.split('\n')[0]);
  }

  // === METHOD 2: Same but vByte = v (not v-27) ===
  const sigBytes2 = ethers.concat([r, s, ethers.toBeHex(v, 1)]);
  const reg2 = await LinkRegistry.deploy();
  await reg2.waitForDeployment();
  console.log("\n=== METHOD 2: vByte=v (27/28) ===");
  try {
    await reg2.connect(primary).linkWallet(primaryAddr, secondaryAddr, sigBytes2);
    console.log("RESULT: SUCCESS");
  } catch(e: any) {
    console.log("RESULT:", e.message.split('\n')[0]);
  }

  // === METHOD 3: signMessage with the SHA-256 hash directly ===
  const sig3 = await wallet.signMessage(sha256js);
  const { r: r3, s: s3, v: v3 } = ethers.Signature.from(sig3);
  const sigBytes3 = ethers.concat([r3, s3, ethers.toBeHex(v3, 1)]);
  const reg3 = await LinkRegistry.deploy();
  await reg3.waitForDeployment();
  console.log("\n=== METHOD 3: signMessage(SHA-256 hash as text) ===");
  try {
    await reg3.connect(primary).linkWallet(primaryAddr, secondaryAddr, sigBytes3);
    console.log("RESULT: SUCCESS");
  } catch(e: any) {
    console.log("RESULT:", e.message.split('\n')[0]);
  }

  // === METHOD 4: ethers.utils.sign with the ETH_SIGN hash ===
  // Use SigningKey to sign arbitrary digest
  const { SigningKey } = require('ethers/crypto');
  const signingKey = new SigningKey(pk);
  const p4 = signingKey.sign(ethSignHash);
  const sigBytes4 = ethers.concat([p4.r, p4.s, ethers.toBeHex(p4.v === 27 ? 0 : 1, 1)]);
  const reg4 = await LinkRegistry.deploy();
  await reg4.waitForDeployment();
  console.log("\n=== METHOD 4: SigningKey.sign(ETH_SIGN_hash) ===");
  try {
    await reg4.connect(primary).linkWallet(primaryAddr, secondaryAddr, sigBytes4);
    console.log("RESULT: SUCCESS");
  } catch(e: any) {
    console.log("RESULT:", e.message.split('\n')[0]);
  }
}

main().catch(console.error);
