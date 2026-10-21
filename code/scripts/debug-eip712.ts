import { ethers } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();
  const [owner, alice, bob] = signers;

  const LinkRegistry = await ethers.getContractFactory("LinkRegistry");
  const registry = await LinkRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();

  const TS = Math.floor(Date.now() / 1000);
  const nonce = 0;

  // Build EIP-712 signature exactly like the test does
  const domain = {
    name: "LibertyTorchLink",
    version: "1",
    chainId: 31337,
    verifyingContract: registryAddr  // ← real address
  };
  const types = {
    LinkRequest: [
      { name: "primary",   type: "address" },
      { name: "secondary", type: "address" },
      { name: "nonce",    type: "uint256" },
      { name: "timestamp", type: "uint256" }
    ]
  };
  const value = {
    primary: alice.address,
    secondary: bob.address,
    nonce,
    timestamp: TS
  };

  console.log("Domain:", JSON.stringify(domain, null, 2));
  console.log("Types:", JSON.stringify(types, null, 2));
  console.log("Value:", JSON.stringify(value, null, 2));

  // Sign as bob (secondary)
  const sig = await bob.signTypedData(domain, types, value);
  console.log("Raw sig:", sig);
  const bytes = ethers.getBytes(sig);
  console.log("Sig bytes length:", bytes.length);

  // Try linking
  try {
    const tx = await registry.connect(alice).linkWallet(alice.address, bob.address, TS, bytes);
    console.log("✅ linkWallet succeeded! TX:", tx.hash);
    console.log("Nonce after:", await registry.getLinkNonce(alice.address));
  } catch (e: any) {
    console.log("❌ linkWallet reverted:", e.message);
  }

  // Try again with old nonce
  console.log("\n--- Now trying with nonce=1 (carol's case) ---");
  const sig2 = await bob.signTypedData(domain, types, { ...value, nonce: 1, secondary: ethers.getSigners()[4].address });
  console.log("sig2:", sig2);
  try {
    await registry.connect(alice).linkWallet(ethers.getSigners()[4].address, ethers.getSigners()[4].address, TS, ethers.getBytes(sig2));
    console.log("✅ second link succeeded");
  } catch (e: any) {
    console.log("❌ second link reverted:", e.reason ?? e.message);
  }
}

main().catch(console.error);
