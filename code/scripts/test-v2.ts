import { ethers } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();
  const [alice, bob] = signers;
  console.log("alice:", alice.address);
  console.log("bob:", bob.address);

  // Let's verify bob's address by checking what signMessage recovers
  const testMsg = "hello world";
  const testSig = await bob.signMessage(testMsg);
  const recovered = ethers.verifyMessage(testMsg, testSig);
  console.log("\nVerification test:");
  console.log("signMessage('hello world') → recovers:", recovered);
  console.log("bob.address:", bob.address);
  console.log("Match?", recovered.toLowerCase() === bob.address.toLowerCase());

  // Check what ethers.hashMessage produces for the test message
  const hash = ethers.hashMessage(testMsg);
  console.log("ethers.hashMessage('hello world'):", hash);

  // Now for the challenge hash
  const primaryAddr = alice.address;
  const bobAddr = bob.address;
  const challengeHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint256"],
      [primaryAddr, bobAddr, 0n]
    )
  );
  console.log("\nChallenge hash:", challengeHash);

  const sig = await bob.signMessage(ethers.toBeHex(challengeHash, 32));
  const recovered2 = ethers.verifyMessage(ethers.toBeHex(challengeHash, 32), sig);
  console.log("verifyMessage(challengeHash, sig):", recovered2);
  console.log("bob.address:", bob.address);
  console.log("Match?", recovered2.toLowerCase() === bob.address.toLowerCase());

  // ethers.hashMessage for the challenge
  const hash2 = ethers.hashMessage(ethers.toBeHex(challengeHash, 32));
  console.log("ethers.hashMessage(challengeHash):", hash2);

  // Key question: what message did bob actually sign?
  // ethers.signMessage(32bytes) might sign the 32-byte data directly (no prefix)
  // ethers.verifyMessage(data, sig) internally hashes data with the Ethereum prefix
  // So bob signed: sha256("\x19..." || sha256(challengeHash))
  // Contract expects: keccak256("\x19..." || challengeHash)
  // These are different! That's why ecrecover recovers a wrong address.
  //
  // But wait - if the hashes are different, ecrecover would return 0 (invalid).
  // We got a non-zero address, which means ecrecover happened to recover something.
  // But it should be bob's address, not some random address.
  //
  // UNLESS: ethers.signMessage signs something DIFFERENT.
  // What if ethers.signMessage just signs the raw bytes (no prefix)?
  // And ethers.verifyMessage also hashes raw bytes with prefix?
  // Then: sig = sign(raw_challenge)
  //       verify(challenge, sig) = ecrecover(sha256(prefix || sha256(challenge)), ...)
  //       But sig was created with: sign(raw_challenge) → ECDSA over sha256(raw_challenge)
  //       So the signature is over sha256(raw_challenge), not sha256(prefix || sha256(challenge))!
  //
  // So the question is: what does ethers.signMessage sign over?
  // It's definitely NOT keccak256 (that would give 0 for v=27)
  // It's definitely NOT sha256(prefix || sha256(data)) (that would give bob's address)
  // ethers.hashMessage gives a different hash than node crypto SHA-256
  // 
  // Let me check what ethers.signMessage ACTUALLY signs
  console.log("\n--- Understanding ethers signing ---");
  
  // Let's check: ethers.signMessage(data) for 32-byte data
  // The ethers source says: "For data that is 32 bytes, it is treated as a personal_sign"
  // personal_sign in Geth: hash = sha256(prefix || sha256(data))
  // ethers.hashMessage also produces sha256(prefix || sha256(data))
  // 
  // But we saw ethers.hashMessage(challengeHash) != sha256(prefix || sha256(challengeHash))
  // and we saw ethers.hashMessage("hello") != sha256(prefix || sha256("hello"))
  //
  // This means ethers.hashMessage does NOT use standard SHA-256!
  // 
  // ethers.hashMessage must use something else.
  // 
  // Let me check: does ethers.hashMessage use keccak of the standard prefix thing?
  // ethers.hashMessage = keccak256(prefix || data) for STRING input
  // But for BYTES input, ethers.hashMessage uses SHA-256!
  //
  // From ethers source (guessing):
  // if (data.length === 32 && isBytes(data)) {
  //   return sha256(prefix || data)  // BUT we saw this doesn't match!
  // }
  // 
  // OR:
  // The ethers library might use a different SHA-256 implementation
  // OR the prefix might be different
  //
  // Let me check by verifying: ethers.hashMessage of the string "hello"
  // ethers.hashMessage("hello") should be sha256(prefix || sha256("hello"))
  // We checked: ethers.hashMessage("hello") != sha256(prefix || sha256("hello")) [node crypto]
  // 
  // This is very strange. Let me check ethers version and if it has a specific behavior
  console.log("ethers version:", require('ethers').ethersVersion ?? "unknown");
  
  // Actually, I bet the issue is that ethers.hashMessage does:
  // sha256(ethers.toUtf8Bytes("\x19Ethereum Signed Message:\n" + data.length + data)))
  // But data here is treated as UTF-8 bytes, not as raw hex!
  // For "hello" (5 bytes): sha256(prefix || 5 || "hello")
  // For challengeHash (32 bytes): sha256(prefix || 32 || challengeHash_bytes)
  // 
  // And ethers.toUtf8Bytes of a hex string like "0x85b9..." gives the UTF-8 bytes of
  // the CHARACTERS '0', 'x', '8', '5', etc.
  // So ethers.hashMessage(ethers.toBeHex(challengeHash, 32)) treats the hex string
  // as UTF-8, giving completely different bytes!
  //
  // While ethers.hashMessage(Buffer.from(challengeHash.slice(2), 'hex')) uses the
  // actual 32-byte binary representation.
  //
  // Let me verify:
  const hashFromString = ethers.hashMessage(ethers.toBeHex(challengeHash, 32));
  const hashFromBytes = ethers.hashMessage(Buffer.from(challengeHash.slice(2), 'hex'));
  console.log("\nhashMessage(hex string):", hashFromString);
  console.log("hashMessage(bytes):    ", hashFromBytes);
  console.log("Same?", hashFromString === hashFromBytes);
}

main().catch(console.error);
