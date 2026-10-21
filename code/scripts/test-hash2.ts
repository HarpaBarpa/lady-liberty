import { ethers } from "hardhat";
import crypto from "crypto";

async function main() {
  const signers = await ethers.getSigners();
  const [alice, bob] = signers;
  const bobAddr = bob.address;

  const challengeHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint256"],
      [alice.address, bobAddr, 0n]
    )
  );

  const sig = await bob.signMessage(ethers.toBeHex(challengeHash, 32));
  const recovered = ethers.verifyMessage(ethers.toBeHex(challengeHash, 32), sig);
  console.log("ethers verifies:", recovered.toLowerCase() === bobAddr.toLowerCase());

  // ethers.hashMessage result
  const ethersHash = ethers.hashMessage(ethers.toBeHex(challengeHash, 32));
  console.log("ethersHash:", ethersHash);

  // Check if ethersHash is keccak256 of something
  // Try: keccak256(challengeHash)
  const keccak_ch = ethers.keccak256(challengeHash);
  console.log("keccak256(challengeHash):", keccak_ch);

  // Try: keccak256(ethersHash) — hash of hash
  const keccak_ethersHash = ethers.keccak256(ethersHash);
  console.log("keccak256(ethersHash):", keccak_ethersHash);

  // Try: keccak256(prefix || challengeHash) [ETH_SIGN]
  const ethSignHash = ethers.keccak256(
    ethers.concat([
      ethers.toUtf8Bytes("\x19Ethereum Signed Message:\n32"),
      challengeHash
    ])
  );
  console.log("ETH_SIGN hash:", ethSignHash);

  // Try SHA-256 of challengeHash using node crypto
  const nodeSha256 = crypto.createHash('sha256')
    .update(Buffer.from(challengeHash.slice(2), 'hex'))
    .digest('hex');
  console.log("Node sha256(challenge):", "0x" + nodeSha256);

  // Try: sha256(prefix || challengeHash) using node crypto
  const prefix = Buffer.from("\x19Ethereum Signed Message:\n32", 'utf8');
  const challengeBytes = Buffer.from(challengeHash.slice(2), 'hex');
  const nodeSha256Prefix = crypto.createHash('sha256')
    .update(Buffer.concat([prefix, challengeBytes]))
    .digest('hex');
  console.log("Node sha256(prefix || challenge):", "0x" + nodeSha256Prefix);

  // Now: which of these hashes, when passed to ecrecover with the signature,
  // recovers bob's address?
  // ethers.verifyMessage says: ethers.hashMessage recovers bob
  // So: ecrecover(ethersHash, 27, r, s) = bob in ethers.js
  // But: ecrecover(ethersHash, 27, r, s) != bob in EVM (we tested: FAILED)
  // 
  // This means ethers uses DIFFERENT hash in sign vs verify!
  // sign: ECDSA over some hash H
  // verify: ECDSA over ethersHash (different from H)
  //
  // That can't be right. Let me test: ethersHash IS the hash used in signing.
  // If ethers signs over H, then ecrecover(H, v, r, s) = bob in EVM.
  // If ethersHash != H, then ecrecover(ethersHash, ...) != bob.
  //
  // But ethers.verifyMessage uses ethersHash and returns bob!
  // ethers.verifyMessage must internally call ecrecover(ethersHash, ...).
  // 
  // So: ethers.verifyMessage = ethers.ecrecover = ecrecover(ethersHash, ...)
  // And ethers.ecrecover(ethersHash, ...) = bob.
  //
  // But the EVM's ecrecover(ethersHash, ...) = 0 (FAILED earlier)!
  //
  // THIS IS THE BUG: ethers v6 in Node.js uses a DIFFERENT ecrecover 
  // implementation than the EVM. The Node.js crypto library's ecrecover
  // (or ethers' polyfill) handles v=27 differently than the EVM.
  //
  // In Node.js (ethers): ecrecover(hash, 27, r, s) → works
  // In EVM (Hardhat):   ecrecover(hash, 27, r, s) → returns 0
  //
  // Wait, but the TestRecover contract returned non-zero for v=27:
  // With v=27: 0x2410b4dE4fA846984bfdB2476F68a1AF365B864e
  // That's a valid address! So ecrecover(ethersHash, 27, ...) works in the EVM.
  // But it recovers the WRONG address (not bob).
  //
  // So the ethersHash is NOT the hash that was signed over.
  // The hash that was signed over must be something else.
  //
  // Let me try: what if ethers signs the RAW 32 bytes (no prefix)?
  // signingHash = sha256(challengeHash) [raw SHA-256 of 32 bytes]
  // ethers.signMessage(32bytes) = ECDSA_sign(sha256(challengeHash))
  // ethers.verifyMessage(32bytes) = ecrecover(sha256("\x19..." || sha256(challengeHash)), ...)
  //
  // If ethers uses this double-hash approach:
  // sign: over sha256(challengeHash)
  // verify: over sha256(prefix || sha256(challengeHash))
  // Then: ecrecover(sha256(prefix || sha256(challengeHash)), ...) = bob (in ethers)
  // But ecrecover in EVM with the same hash = ? 
  //
  // We need to compute: sha256(prefix || sha256(challengeHash))
  // sha256(challengeHash) = nodeSha256 = 0x4bd0b80108d7ba5ab53ea877def052185f302da9bd4b18e940418a5d96168370
  const sha256_challenge = "0x4bd0b80108d7ba5ab53ea877def052185f302da9bd4b18e940418a5d96168370";
  const sha256_prefixed = crypto.createHash('sha256')
    .update(Buffer.concat([prefix, Buffer.from(sha256_challenge.slice(2), 'hex')]))
    .digest('hex');
  console.log("\nNode sha256(prefix || sha256(challenge)):", "0x" + sha256_prefixed);
  console.log("ethersHash:", ethersHash);
  console.log("Match?", "0x" + sha256_prefixed === ethersHash);
}

main().catch(console.error);
