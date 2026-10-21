import { ethers } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();
  const bob = signers[1];
  const primary = signers[0];
  const primaryAddr = primary.address;
  const bobAddr = bob.address;

  // The actual hash that ethers.js uses (computed by ethers from signMessage result)
  const ethersHash = "0x82b82f98caeb3fbde766b25262a3cf9df634cc315098790ad01697ba339f45c3";

  // Get signature
  const challengeHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint256"],
      [primaryAddr, bobAddr, 0n]
    )
  );
  const sig = await bob.signMessage(ethers.toBeHex(challengeHash, 32));
  const { r, s, v } = ethers.Signature.from(sig);
  const sigBytes = ethers.concat([r, s, ethers.toBeHex(v, 1)]);

  // Deploy LinkRegistry
  const LinkRegistry = await ethers.getContractFactory("LinkRegistry");
  const registry = await LinkRegistry.deploy();
  await registry.waitForDeployment();

  // Try calling with the exact ethers hash
  // We need to pass it as a challengeHash - but contract computes internally
  // Let's modify the call to use a workaround: call with a dummy challenge
  
  // Better: just check what ethers would recover
  console.log("ethersHash:", ethersHash);
  console.log("r:", r, "s:", s, "v:", v);
  
  // Verify ethers recovers correctly
  const recovered = ethers.verifyMessage(ethers.toBeHex(challengeHash, 32), sig);
  console.log("\nethers.verifyMessage:", recovered);
  
  // What hash does ethers.js ACTUALLY use? Let's compute it in node
  const crypto = require('crypto');
  // The 32-byte challenge hash
  const challengeBytes = Buffer.from(challengeHash.slice(2), 'hex');
  // Standard Ethereum prefix: "\x19Ethereum Signed Message:\n" + len(message) + message
  // For 32 bytes: len = 32
  const prefix = Buffer.from("\x19Ethereum Signed Message:\n32", 'utf8');
  const data = Buffer.concat([prefix, challengeBytes]);
  const sha256Hash = crypto.createHash('sha256').update(data).digest();
  console.log("\nNode crypto SHA-256(prefix || 32bytes):", "0x" + sha256Hash.toString('hex'));
  console("Compare with ethers hash:", ethersHash);
  console.log("Match?", "0x" + sha256Hash.toString('hex') === ethersHash);
  
  // Now check keccak256 of the same
  const keccak256Hash = ethers.keccak256(data);
  console.log("Keccak256(prefix || 32bytes):", keccak256Hash);
}

main().catch(console.error);
