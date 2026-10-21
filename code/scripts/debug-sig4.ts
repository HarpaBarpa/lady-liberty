import { ethers } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();
  const primary = signers[0];
  const bob = signers[1];

  const primaryAddr = primary.address;
  const bobAddr = bob.address;

  const challengeHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint256"],
      [primaryAddr, bobAddr, 0n]
    )
  );
  console.log("Challenge hash:", challengeHash);

  // What does ethers.js actually sign?
  const sig = await bob.signMessage(ethers.toBeHex(challengeHash, 32));
  console.log("Sig:", sig);

  // ethers.verifyMessage tells us what ethers.js HASHES the data to before signing
  const recovered = ethers.verifyMessage(ethers.toBeHex(challengeHash, 32), sig);
  console.log("Recovered:", recovered, "== bob?", recovered.toLowerCase() === bobAddr.toLowerCase());

  // Check what ethers.utils.hashMessage produces
  const hashMsg = ethers.hashMessage(ethers.toBeHex(challengeHash, 32));
  console.log("ethers.hashMessage:", hashMsg);

  // Check: is it sha256 or keccak of the prefixed message?
  const crypto = require('crypto');
  // Node crypto sha256
  const prefix = Buffer.from("\x19Ethereum Signed Message:\n32");
  const data = Buffer.from(challengeHash.slice(2), 'hex');
  const nodeSha256 = crypto.createHash('sha256').update(Buffer.concat([prefix, data])).digest('hex');
  console.log("Node SHA-256(prefix || data):", "0x" + nodeSha256);
  console.log("Matches ethers.hashMessage?", "0x" + nodeSha256 === hashMsg);

  // Now try ethers.utils.verifyMessage directly with known SHA-256 hash
  // ethers.verifyMessage(data, sig) = ecrecover(sha256(prefix || sha256(data)), sig)
  // But ethers signMessage signs sha256(prefix || sha256(data)) NOT sha256(data)!
  // 
  // Let me verify: ethers.signMessage(data, key) signs: sha256("\x19..." || sha256(data))
  // ecrecover in ethers.js uses: sha256("\x19..." || sha256(data))
  //
  // In Solidity contract:
  // ETH_SIGN: keccak256("\x19..." || keccak256(data)) ← different!
  // SHA_PATH: keccak256("\x19..." || sha256(data))   ← same as ethers!
  //
  // So the SHA path in our contract should work IF the Solidity SHA-256 implementation
  // matches node crypto SHA-256. Let me verify the hash matches.
  
  console.log("\n--- Hash verification ---");
  console.log("ethers.hashMessage:", hashMsg);
  const ethSignHash = ethers.keccak256(
    ethers.concat([
      ethers.toUtf8Bytes("\x19Ethereum Signed Message:\n32"),
      ethers.toUtf8Bytes(challengeHash.slice(2), 'hex')  // interpret as raw bytes
    ])
  );
  console.log("Solidity ETH_SIGN hash (keccak256 of UTF-8 bytes):", ethSignHash);
  
  // Maybe the issue is ethers.toUtf8Bytes vs ethers.hexlify
  // ethers.toUtf8Bytes interprets the hex string as UTF-8 characters
  // But the challengeHash "0x85b9..." as UTF-8 is garbage bytes
  // ethers.hashMessage probably uses the raw 32 bytes of challengeHash
  
  const hashMessage = ethers.hashMessage(challengeHash); // pass bytes32
  console.log("hashMessage(bytes32):", hashMessage);
  console.log("hashMessage(hex string):", hashMsg);
  
  // Check if they're the same
  console.log("Same?", hashMessage === hashMsg);
}

main().catch(console.error);
