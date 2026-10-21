import { ethers } from "hardhat";
import crypto from "crypto";

async function main() {
  // Challenge hash as 32-byte buffer
  const challengeHex = "85b9ac977c4419e73b2e808fcf6d29288cb2afcad7fc03d0d7616ff388407d3f";
  const challengeBytes = Buffer.from(challengeHex, 'hex');
  console.log("Challenge bytes length:", challengeBytes.length);

  // Standard Ethereum personal_sign: sha256("\x19Ethereum Signed Message:\n" + len + message)
  const prefix = Buffer.from("\x19Ethereum Signed Message:\n32", 'utf8');
  const data = Buffer.concat([prefix, challengeBytes]);
  const nodeSha256 = crypto.createHash('sha256').update(data).digest('hex');
  console.log("Node SHA-256: 0x" + nodeSha256);

  // Check ethers hashMessage output
  const ethersHash = ethers.hashMessage(challengeBytes); // pass raw bytes
  console.log("ethers.hashMessage(bytes):", ethersHash);
  console.log("Match?", "0x" + nodeSha256 === ethersHash);

  // Try with hex string
  const ethersHashHex = ethers.hashMessage("0x" + challengeHex);
  console.log("ethers.hashMessage(hex):", ethersHashHex);
  console.log("Match hex?", "0x" + nodeSha256 === ethersHashHex);

  // What if ethers converts the 32-byte data differently?
  // Try: ethers.solidityPackedKeccak256 vs ethers.keccak256
  console.log("\n--- Hash comparisons ---");
  console.log("ethers.keccak256(challengeHex):", ethers.keccak256("0x" + challengeHex));
  console.log("ethers.keccak256(challengeBytes):", ethers.keccak256(challengeBytes));

  // Check: ethers hashMessage uses SHA-256 or keccak?
  // Let's verify by checking ethers source behavior
  const testStr = "hello";
  const testBytes = Buffer.from(testStr, 'utf8');
  const nodeHashStr = crypto.createHash('sha256').update(Buffer.from("\x19Ethereum Signed Message:\n5hello", 'utf8')).digest('hex');
  const ethersHashStr = ethers.hashMessage(testStr);
  console.log("\nString 'hello':");
  console.log("Node SHA-256: 0x" + nodeHashStr);
  console.log("ethers.hashMessage:", ethersHashStr);
  console.log("Match?", "0x" + nodeHashStr === ethersHashStr);
}

main().catch(console.error);
