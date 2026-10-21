import { ethers } from "hardhat";
import crypto from "crypto";

async function main() {
  // 32-byte challenge hash (no 0x)
  const challengeHex = "85b9ac977c4419e73b2e808fcf6d29288cb2afcad7fc03d0d7616ff388407d3f";
  const challengeBytes = Buffer.from(challengeHex, 'hex');

  // ethers.hashMessage on 32-byte data
  const ethersHash = ethers.hashMessage(Buffer.from(challengeHex, 'hex'));
  console.log("ethers.hashMessage(32bytes):", ethersHash);

  // Raw sha256 of challenge bytes (no prefix!)
  const rawSha256 = "0x" + crypto.createHash('sha256').update(challengeBytes).digest('hex');
  console.log("sha256(32bytes) [no prefix]:", rawSha256);
  console.log("Match?", rawSha256 === ethersHash);

  // sha256 with Ethereum prefix (standard personal_sign)
  const prefix = Buffer.from("\x19Ethereum Signed Message:\n32", 'utf8');
  const prefixedSha = "0x" + crypto.createHash('sha256').update(Buffer.concat([prefix, challengeBytes])).digest('hex');
  console.log("sha256(prefix || 32bytes):", prefixedSha);

  // Verify with ethers verifyMessage
  const signers = await ethers.getSigners();
  const bob = signers[1];
  const primary = signers[0];
  const primaryAddr = primary.address;
  const bobAddr = bob.address;

  const sig = await bob.signMessage(Buffer.from(challengeHex, 'hex'));
  const recovered = ethers.verifyMessage(Buffer.from(challengeHex, 'hex'), sig);
  console.log("\nethers.verifyMessage:", recovered, "== bob?", recovered.toLowerCase() === bobAddr.toLowerCase());

  // Now the contract fix: use sha256(challengeHash) in Solidity
  // And verify with a raw ecrecover call
  const { r, s, v } = ethers.Signature.from(sig);
  // sha256 of challenge bytes
  const msgHash = ethers.keccak256; // wrong, need sha256
  
  // In Solidity: bytes32 msgHash = sha256(challengeHash);
  // Then: ecrecover(msgHash, v, r, s) should recover bob
  
  console.log("\nSignature params for ecrecover:");
  console.log("msgHash (should be sha256 of challenge):", rawSha256);
  console.log("r:", r);
  console.log("s:", s);
  console.log("v:", v);
}

main().catch(console.error);
