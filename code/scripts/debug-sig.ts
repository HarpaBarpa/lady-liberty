import { ethers } from "hardhat";

async function main() {
  const [primary] = await ethers.getSigners();
  
  // Get the private key of the Hardhat test account 1
  // Default hardhat accounts are derived from this mnemonic
  // We can use the internal hardhat accounts provider
  const wallet = ethers.Wallet.fromPhrase(
    "test test test test test test test test test test test junk",
    ethers.provider
  );
  const secondary = wallet.address;
  console.log("Derived secondary address:", secondary);
  
  // The challenge
  const primaryAddr = await primary.getAddress();
  const challengeHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint256"],
      [primaryAddr, secondary, 0n]
    )
  );
  
  // signMessage uses SHA-256
  const sig = await wallet.signMessage(ethers.toBeHex(challengeHash, 32));
  console.log("sig:", sig);
  const { r, s, v } = ethers.Signature.from(sig);
  console.log("v:", v, "(should be 27 or 28)");
  
  const sigBytes = ethers.concat([r, s, ethers.toBeHex(v === 27 ? 0 : 1, 1)]);
  console.log("Sig bytes:", sigBytes.length, "bytes");
  
  const LinkRegistry = await ethers.getContractFactory("LinkRegistry");
  const registry = await LinkRegistry.deploy();
  await registry.waitForDeployment();
  
  console.log("\nTrying...");
  try {
    await registry.connect(primary).linkWallet(primaryAddr, secondary, sigBytes);
    console.log("SUCCESS!");
  } catch(e: any) { console.log("FAILED:", e.reason ?? e.message.split('\n')[0]); }
}

main().catch(console.error);
