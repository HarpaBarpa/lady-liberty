import { ethers } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();
  const alice = signers[1];
  const bob = signers[2];
  const carol = signers[4];
  console.log("alice:", alice.address);
  console.log("bob:", bob.address);
  console.log("carol:", carol.address);

  const LinkRegistry = await ethers.getContractFactory("LinkRegistry");
  const registry = await LinkRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("Registry at:", registryAddr);

  const TS = 1700000000; // fixed timestamp

  const domain = {
    name: "LibertyTorchLink", version: "1",
    chainId: 31337, verifyingContract: registryAddr
  };
  const types = {
    LinkRequest: [
      { name: "primary",   type: "address" },
      { name: "secondary", type: "address" },
      { name: "nonce",    type: "uint256" },
      { name: "timestamp", type: "uint256" }
    ]
  };

  // Test 1: bob links with nonce=0
  const val1 = { primary: alice.address, secondary: bob.address, nonce: 0, timestamp: TS };
  const sig1 = await bob.signTypedData(domain, types, val1);
  console.log("\nSig1:", sig1);
  try {
    const tx = await registry.connect(alice).linkWallet(alice.address, bob.address, TS, ethers.getBytes(sig1));
    await tx.wait();
    console.log("✅ Test1 PASSED — bob linked");
    console.log("Nonce after:", await registry.getLinkNonce(alice.address));
  } catch(e: any) {
    console.log("❌ Test1 FAILED —", e.message.split('\n')[0]);
    return;
  }

  // Test 2: carol tries with nonce=0 (old nonce = should fail)
  const val2 = { primary: alice.address, secondary: carol.address, nonce: 0, timestamp: TS };
  const sig2 = await carol.signTypedData(domain, types, val2);
  console.log("\nSig2:", sig2);
  try {
    const tx = await registry.connect(alice).linkWallet(alice.address, carol.address, TS, ethers.getBytes(sig2));
    await tx.wait();
    console.log("❌ Test2 FAILED — carol linked (should have reverted)");
  } catch(e: any) {
    console.log("✅ Test2 PASSED — reverted:", e.message.includes('InvalidSignature') ? 'InvalidSignature' : 'other');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
