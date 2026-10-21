import { ethers } from "hardhat";

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
  console.log("Challenge hash:", challengeHash);

  // Get the signature
  const sig = await bob.signMessage(ethers.toBeHex(challengeHash, 32));
  const recovered = ethers.verifyMessage(ethers.toBeHex(challengeHash, 32), sig);
  console.log("ethers verifies:", recovered.toLowerCase() === bobAddr.toLowerCase());

  // Try all possible hashes against the actual ecrecover in the EVM
  // Use LinkRegistry._verifySecondarySignature via static call
  const LinkRegistry = await ethers.getContractFactory("LinkRegistry");
  const registry = await LinkRegistry.deploy();
  await registry.waitForDeployment();

  // Test with rawSig (what ethers.getBytes(sig) returns)
  const rawSig = ethers.getBytes(sig);
  console.log("\nrawSig last byte:", rawSig[64], "(should be 27 or 28)");
  console.log("rawSig length:", rawSig.length);

  // Try the direct linkWallet call with rawSig
  try {
    await registry.connect(alice).linkWallet(alice.address, bobAddr, rawSig);
    console.log("rawSig SUCCESS!");
  } catch(e: any) {
    console.log("rawSig FAILED:", e.message.split('\n')[0]);
  }

  // Now let's try to pass a KNOWN WORKING hash to LinkRegistry
  // We know ethers.verifyMessage works → ecrecover(msgHash_from_ethers, v, r, s) = bob
  // ethers.hashMessage tells us the ethers hash
  // But that doesn't match node crypto SHA-256...
  //
  // What if ethers.hashMessage returns keccak256 instead of sha256 for 32-byte inputs?
  const keccakOfBytes = ethers.keccak256(Buffer.from(challengeHash.slice(2), 'hex'));
  console.log("\nkeccak256(raw 32 bytes):", keccakOfBytes);
  console.log("ethers.hashMessage(hex string):", ethers.hashMessage(ethers.toBeHex(challengeHash, 32)));
  console.log("Same?", keccakOfBytes === ethers.hashMessage(ethers.toBeHex(challengeHash, 32)));

  // The only way to find the correct hash is to try calling ecrecover with each candidate
  // in the EVM. Let me deploy a test contract that tries different hashes.
  console.log("\n--- Testing hashes in EVM ---");
  const TestRecover = await ethers.getContractFactory("TestRecover");
  const testRec = await TestRecover.deploy();
  await testRec.waitForDeployment();

  // Test ethers.hashMessage hash
  const ethersHash = ethers.hashMessage(ethers.toBeHex(challengeHash, 32));
  const ethersHashBytes = ethers.getBytes(ethersHash);
  console.log("ethersHash bytes length:", ethersHashBytes.length);

  // ethersHash is 32 bytes (hex string "0x..." = 66 chars = 33 bytes, getBytes gives 32)
  // ethers.hashMessage returns a 32-byte VALUE as a hex string
  // So ethersHashBytes is the raw 32-byte hash that ethers computed

  // Now pass this as bytes32 to the contract
  // Wait, ethers.hashMessage returns a hex STRING "0x..."
  // ethers.getBytes("0x...") gives 32 bytes
  // So ethersHashBytes = the 32-byte representation of ethers' computed hash

  // We want to try: ecrecover(ethersHashBytes, v, r, s)
  // But passing bytes32 from TypeScript is tricky
  // ethers.Hashlock is... 
  
  // Actually, the simplest test: pass the ethersHash string directly as the msgHash
  // But that won't work because it's a bytes32 parameter
  
  // Let me check if ethers.hashMessage returns keccak256
  const keccakOfKeccak = ethers.keccak256(ethersHash);
  console.log("keccak256(ethersHash):", keccakOfKeccak);
  console.log("keccak256(ethersHash) == ethersHash?", keccakOfKeccak === ethersHash);

  // If they're equal, ethers.hashMessage = keccak256(input)
  // This would mean ethers uses keccak256, not SHA-256!
  // But that contradicts ethers.verifyMessage which works...
}

main().catch(console.error);
