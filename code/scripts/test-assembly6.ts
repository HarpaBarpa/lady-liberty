import { ethers } from "hardhat";

async function main() {
  // Pure TypeScript type test - no blockchain
  const r = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const s = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const v = 27;
  
  const rBytes = ethers.getBytes(r);
  const sBytes = ethers.getBytes(s);
  const vBytes = ethers.getBytes(ethers.toBeHex(v, 1));
  
  console.log("rBytes:", rBytes.constructor.name, "length:", rBytes.length);
  console.log("sBytes:", sBytes.constructor.name, "length:", sBytes.length);
  console.log("vBytes:", vBytes.constructor.name, "length:", vBytes.length);

  // ethers.concat behavior
  const concatResult = ethers.concat([rBytes, sBytes, vBytes]);
  console.log("concat result:", concatResult.constructor.name, "length:", concatResult.length);
  
  // Try as Uint8Array explicitly
  const arr = new Uint8Array(65);
  arr.set(rBytes, 0);
  arr.set(sBytes, 32);
  arr[64] = v;
  console.log("Uint8Array result:", arr.constructor.name, "length:", arr.length, "last:", arr[64]);
  
  // Try ArrayBuffer approach
  const buf = new ArrayBuffer(65);
  const view = new Uint8Array(buf);
  view.set(rBytes, 0);
  view.set(sBytes, 32);
  view[64] = v;
  console.log("ArrayBuffer/Uint8Array:", view.length, "last:", view[64]);
}

main().catch(console.error);
