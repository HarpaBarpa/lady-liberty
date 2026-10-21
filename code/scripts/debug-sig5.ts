import { ethers } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();
  const primary = signers[0];
  const bob = signers[1];
  const primaryAddr = primary.address;
  const bobAddr = bob.address;

  // Build challenge hash
  const challengeHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint256"],
      [primaryAddr, bobAddr, 0n]
    )
  );

  // What does ethers.js actually hash the data to before signing?
  // Let's inspect ethers source by checking what hash it uses for 32-byte data
  const hexData = ethers.toBeHex(challengeHash, 32);
  
  // ethers.hashMessage on 32-byte data
  const msgHash = ethers.hashMessage(hexData);
  console.log("ethers.hashMessage(32bytes):", msgHash);

  // ethers.utils.id (keccak256 of data)
  const keccakId = ethers.keccak256(hexData);
  console.log("ethers.keccak256(data):", keccakId);

  // Try: ethers.signTypedData (EIP-712) - more standard and well-defined
  const domain = {
    name: "LibertyTorch",
    version: "1",
    chainId: 31337,
    verifyingContract: (await ethers.getContractFactory("LinkRegistry")).then(f => "0x" + "00".repeat(20))
  };
  const types = {
    LinkChallenge: [
      { name: "primary", type: "address" },
      { name: "secondary", type: "address" },
      { name: "nonce", type: "uint256" }
    ]
  };
  const value = {
    primary: primaryAddr,
    secondary: bobAddr,
    nonce: 0
  };

  try {
    const sig = await bob.signTypedData(domain, types, value);
    console.log("signTypedData sig:", sig);
    console.log("signTypedData works!");
  } catch(e: any) {
    console.log("signTypedData error:", e.message.split('\n')[0]);
  }

  // Try the simplest approach: sign a plain string and verify with keccak256
  const plainMsg = "LINK_WALLET";
  const plainHash = ethers.keccak256(ethers.toUtf8Bytes(plainMsg));
  console.log("\nPlain string hash:", plainHash);
  const sigPlain = await bob.signMessage(plainMsg);
  const recovered = ethers.verifyMessage(plainMsg, sigPlain);
  console.log("Recovered:", recovered, "== bob?", recovered.toLowerCase() === bobAddr.toLowerCase());
  
  // In contract, try keccak256("\x19Ethereum Signed Message:\n12", "LINK_WALLET")
  const contractHash = ethers.keccak256(
    ethers.concat([
      ethers.toUtf8Bytes("\x19Ethereum Signed Message:\n12"),
      ethers.toUtf8Bytes(plainMsg)
    ])
  );
  console.log("Contract hash of 'LINK_WALLET':", contractHash);
  
  // Check what ethers.hashMessage("LINK_WALLET") produces
  const ethersHash = ethers.hashMessage(plainMsg);
  console.log("ethers.hashMessage('LINK_WALLET'):", ethersHash);
  console.log("Same?", contractHash === ethersHash);
}

main().catch(console.error);
