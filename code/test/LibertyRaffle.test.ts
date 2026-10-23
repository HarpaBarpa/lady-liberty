import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

// ─────────────────────────────────────────────────────────────────────────────
//  Helper: deploy fresh system
// ─────────────────────────────────────────────────────────────────────────────

async function deploySystem() {
  const signers = await ethers.getSigners();
  const [owner, alice, bob, carol, dusty] = signers;

  const LinkRegistry = await ethers.getContractFactory("LinkRegistry");
  const linkRegistry = await LinkRegistry.deploy();
  await linkRegistry.waitForDeployment();

  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const liberty = await MockERC20.deploy("Liberty", "LIBERTY", 18);
  await liberty.waitForDeployment();
  const dust = await MockERC20.deploy("Dust", "DUST", 18);
  await dust.waitForDeployment();

  const VaultF = await ethers.getContractFactory("LibertyVault");
  const vault = await VaultF.deploy(
    await linkRegistry.getAddress(),
    await liberty.getAddress(),
    owner.address,
  );
  await vault.waitForDeployment();

  const RaffleF = await ethers.getContractFactory("LibertyRaffle");
  const raffle = await RaffleF.deploy(
    await vault.getAddress(),
    await linkRegistry.getAddress(),
    await liberty.getAddress(),
    ethers.ZeroAddress
  );
  await raffle.waitForDeployment();

  // Give wallets tokens
  await liberty.mint(alice.address, ethers.parseEther("100"));
  await liberty.mint(bob.address, ethers.parseEther("100"));
  await liberty.mint(carol.address, ethers.parseEther("5")); // < $10
  await dust.mint(dusty.address, ethers.parseEther("10000"));

  return { owner, alice, bob, carol, dusty, linkRegistry, linkRegistryAddr: await linkRegistry.getAddress(), liberty, dust, vault, raffle };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Helper: build a valid linking signature
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The secondary signs the challenge hash via personal_sign.
 *
 * Frontend (ethers.js v6):
 *   const challengeHash = ethers.keccak256(
 *     ethers.AbiCoder.defaultAbiCoder().encode(
 *       ["address","address","uint256"],
 *       [primary, secondary, linkNonce]
 *     )
 *   );
 *   const sig = await secondary.signMessage(ethers.toBeHex(challengeHash, 32));
 *
 * The contract verifies the same hash using the SHA-256 ecrecover path.
 * Result: 65 bytes (r=32, s=32, v=1)
 */
/**
 * Build a 65-byte EIP-712 linking signature.
 *
 * Frontend (ethers.js v6):
 *   const sig = await secondary.signTypedData(domain, types, value)
 *   domain = { name: "LibertyTorchLink", version: "1",
 *              chainId, verifyingContract: registryAddr }
 *   types  = { LinkRequest: [
 *                { name: "primary",   type: "address" },
 *                { name: "secondary", type: "address" },
 *                { name: "nonce",    type: "uint256" },
 *                { name: "timestamp", type: "uint256" }
 *              ] }
 *   value  = { primary, secondary: secondaryAddr, nonce, timestamp }
 *
 * Result: 65 bytes (ethers.getBytes(sig) — Uint8Array of the signature).
 */
/**
 * Build a 65-byte EIP-712 linking signature.
 *
 * Frontend (ethers.js v6):
 *   const sig = await secondary.signTypedData(domain, types, value)
 *   domain = { name: "LibertyTorchLink", version: "1",
 *              chainId, verifyingContract: registryAddr }
 *   types  = { LinkRequest: [
 *                { name: "primary",   type: "address" },
 *                { name: "secondary", type: "address" },
 *                { name: "nonce",    type: "uint256" },
 *                { name: "timestamp", type: "uint256" }
 *              ] }
 *   value  = { primary, secondary: secondaryAddr, nonce, timestamp }
 *
 * Result: 65 bytes (ethers.getBytes(sig) — Uint8Array of the signature).
 */
async function buildLinkSig(
  secondary: any,
  primary: string,
  secondaryAddr: string,
  nonce = 0,
  timestamp?: number,
  verifyingContract?: string
) {
  const domain = {
    name: "LibertyTorchLink",
    version: "1",
    chainId: 31337,
    verifyingContract: verifyingContract ?? ethers.ZeroAddress
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
    primary,
    secondary: secondaryAddr,
    nonce,
    timestamp: timestamp ?? Math.floor(Date.now() / 1000)
  };
  const sig = await secondary.signTypedData(domain, types, value);
  return ethers.getBytes(sig);
}

// ─────────────────────────────────────────────────────────────────────────────
//  LinkRegistry Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("LinkRegistry", function () {
  const TS = Math.floor(Date.now() / 1000);
  let linkRegistryAddr: string;
  it("starts with zero links", async function () {
    const { linkRegistry, linkRegistryAddr } = await deploySystem();
    expect(await linkRegistry.getLinkedWalletCount(ethers.ZeroAddress)).to.equal(0);
  });

  it("links a valid secondary wallet", async function () {
    const { linkRegistry, linkRegistryAddr, alice, bob } = await deploySystem();
    const sig = await buildLinkSig(bob, alice.address, bob.address, 0, TS, linkRegistryAddr);
    await expect(
      linkRegistry.connect(alice).linkWallet(alice.address, bob.address, TS, sig)
    ).to.emit(linkRegistry, "WalletLinked");
    expect(await linkRegistry.isLinkedTo(alice.address, bob.address)).to.be.true;
    expect(await linkRegistry.getLinkedWalletCount(alice.address)).to.equal(1);
  });

  it("rejects wrong-signer", async function () {
    const { linkRegistry, linkRegistryAddr, alice, bob, carol } = await deploySystem();
    // carol signs with bob's parameters → wrong signer
    const sig = await buildLinkSig(carol, alice.address, bob.address, 0, TS, linkRegistryAddr);
    await expect(
      linkRegistry.connect(alice).linkWallet(alice.address, bob.address, TS, sig)
    ).to.be.reverted;
  });

  it("rejects old-nonce signature", async function () {
    const { linkRegistry, linkRegistryAddr, alice, bob } = await deploySystem();
    // First: bob links with nonce 0 → succeeds
    let sig = await buildLinkSig(bob, alice.address, bob.address, 0, TS, linkRegistryAddr);
    await linkRegistry.connect(alice).linkWallet(alice.address, bob.address, TS, sig);
    expect(await linkRegistry.getLinkNonce(alice.address)).to.equal(1);
    // Second: carol tries to link with nonce=0 (old nonce, now invalid)
    const carol = (await ethers.getSigners())[4];
    sig = await buildLinkSig(carol, alice.address, carol.address, 0, TS, linkRegistryAddr); // nonce 0 but should be 1
    await expect(
      linkRegistry.connect(alice).linkWallet(alice.address, carol.address, TS, sig)
    ).to.be.reverted;
  });

  it("enforces max 5 linked wallets", async function () {
    const { linkRegistry, linkRegistryAddr } = await deploySystem();
    const signers = await ethers.getSigners();
    const primary = signers[0];
    const wallets = signers.slice(1, 7); // 6 wallets

    for (let i = 0; i < 5; i++) {
      const sec = wallets[i];
      const sig = await buildLinkSig(sec, primary.address, sec.address, i, TS, linkRegistryAddr);
      await linkRegistry.connect(primary).linkWallet(primary.address, sec.address, TS, sig);
    }
    // 6th should fail
    const sig6 = await buildLinkSig(wallets[5], primary.address, wallets[5].address, 5, TS, linkRegistryAddr);
    await expect(
      linkRegistry.connect(primary).linkWallet(primary.address, wallets[5].address, TS, sig6)
    ).to.be.revertedWithCustomError(linkRegistry, "MaxLinkedWalletsReached");
  });

  it("unlink works", async function () {
    const { linkRegistry, linkRegistryAddr, alice, bob } = await deploySystem();
    const sig = await buildLinkSig(bob, alice.address, bob.address, 0, TS, linkRegistryAddr);
    await linkRegistry.connect(alice).linkWallet(alice.address, bob.address, TS, sig);
    await expect(
      linkRegistry.connect(alice).unlinkWallet(alice.address, bob.address)
    ).to.emit(linkRegistry, "WalletUnlinked");
    expect(await linkRegistry.isLinkedTo(alice.address, bob.address)).to.be.false;
  });

  it("only primary can unlink", async function () {
    const { linkRegistry, linkRegistryAddr, alice, bob, carol } = await deploySystem();
    const sig = await buildLinkSig(bob, alice.address, bob.address, 0, TS, linkRegistryAddr);
    await linkRegistry.connect(alice).linkWallet(alice.address, bob.address, TS, sig);
    await expect(
      linkRegistry.connect(carol).unlinkWallet(alice.address, bob.address)
    ).to.be.reverted;
  });

  it("rejects self-link", async function () {
    const { linkRegistry, linkRegistryAddr, alice } = await deploySystem();
    await expect(
      linkRegistry.connect(alice).linkWallet(alice.address, alice.address, TS, "0x")
    ).to.be.revertedWithCustomError(linkRegistry, "SelfLink");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  LibertyVault Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("LibertyVault", function () {
  const TS = Math.floor(Date.now() / 1000);
  it("constants are correct", async function () {
    const { vault } = await deploySystem();
    expect(await vault.DUST_ENTRY_STEP_CENTS()).to.equal(50n);
    expect(await vault.MAX_DUST_ENTRIES_PER_WALLET()).to.equal(5n);
    expect(await vault.CYCLE_DURATION()).to.equal(3600n);
    expect(await vault.PROTOCOL_FEE_BPS()).to.equal(300n);
  });

  it("rejects unsupported token deposits", async function () {
    const { vault, alice, dust } = await deploySystem();
    await expect(
      vault.connect(alice).depositDust(alice.address, await dust.getAddress(), 1000)
    ).to.be.revertedWithCustomError(vault, "UnsupportedToken");
  });

  it("rejects zero amount", async function () {
    const { vault, alice, dust } = await deploySystem();
    await vault.addSupportedToken(await dust.getAddress(), ethers.ZeroAddress);
    await expect(
      vault.connect(alice).depositDust(alice.address, await dust.getAddress(), 0)
    ).to.be.revertedWithCustomError(vault, "ZeroAmount");
  });

  it("takes 2% protocol fee on deposit", async function () {
    const { vault, owner, dusty, dust, linkRegistry, linkRegistryAddr } = await deploySystem();
    await vault.addSupportedToken(await dust.getAddress(), ethers.ZeroAddress);
    // dusty must be linked to owner before dusty can deposit dust for owner
    const sig = await buildLinkSig(dusty, owner.address, dusty.address, 0, TS, linkRegistryAddr);
    await linkRegistry.connect(owner).linkWallet(owner.address, dusty.address, TS, sig);
    const amount = ethers.parseEther("100");
    await dust.connect(dusty).approve(await vault.getAddress(), amount);
    const ownerBalBefore = await dust.balanceOf(owner.address);
    await vault.connect(dusty).depositDust(owner.address, await dust.getAddress(), amount);
    const fee = amount * 300n / 10000n;
    expect(await dust.balanceOf(owner.address)).to.equal(ownerBalBefore + fee);
    expect(await dust.balanceOf(await vault.getAddress())).to.equal(amount - fee);
  });

  it("linked secondary earns dust entries for primary", async function () {
    const { vault, linkRegistry, linkRegistryAddr, alice, dusty, dust } = await deploySystem();
    await vault.addSupportedToken(await dust.getAddress(), ethers.ZeroAddress);
    const sig = await buildLinkSig(dusty, alice.address, dusty.address, 0, TS, linkRegistryAddr);
    await linkRegistry.connect(alice).linkWallet(alice.address, dusty.address, TS, sig);
    const deposit = ethers.parseEther("10"); // 10 tokens @ $1 = 10 entries, capped at 5
    await dust.connect(dusty).approve(await vault.getAddress(), deposit);
    await vault.connect(dusty).depositDust(alice.address, await dust.getAddress(), deposit);
    expect(await vault.getDustEntries(alice.address)).to.equal(5n); // capped
  });

  it("caps entries at 5 per wallet per cycle", async function () {
    const { vault, linkRegistry, linkRegistryAddr, alice, dusty, dust } = await deploySystem();
    await vault.addSupportedToken(await dust.getAddress(), ethers.ZeroAddress);
    const sig = await buildLinkSig(dusty, alice.address, dusty.address, 0, TS, linkRegistryAddr);
    await linkRegistry.connect(alice).linkWallet(alice.address, dusty.address, TS, sig);
    // $25 → 50 entries → capped at 5
    const deposit = ethers.parseEther("25");
    await dust.connect(dusty).approve(await vault.getAddress(), deposit);
    await vault.connect(dusty).depositDust(alice.address, await dust.getAddress(), deposit);
    expect(await vault.getDustEntries(alice.address)).to.equal(5n);
  });

  it("accumulates across multiple small deposits", async function () {
    const { vault, linkRegistry, linkRegistryAddr, alice, dusty, dust } = await deploySystem();
    await vault.addSupportedToken(await dust.getAddress(), ethers.ZeroAddress);
    const sig = await buildLinkSig(dusty, alice.address, dusty.address, 0, TS, linkRegistryAddr);
    await linkRegistry.connect(alice).linkWallet(alice.address, dusty.address, TS, sig);
    // 2 × $0.53 → post-fee ≈ $0.5194 = 51.94 cents each → 1 entry each → 2 total
    const smol = ethers.parseEther("0.53");
    await dust.connect(dusty).approve(await vault.getAddress(), smol * 2n);
    await vault.connect(dusty).depositDust(alice.address, await dust.getAddress(), smol);
    await vault.connect(dusty).depositDust(alice.address, await dust.getAddress(), smol);
    expect(await vault.getDustEntries(alice.address)).to.equal(2n);
  });

  it("unlinked wallet earns no entries", async function () {
    const { vault, linkRegistry, linkRegistryAddr, alice, dusty, bob, dust } = await deploySystem();
    await vault.addSupportedToken(await dust.getAddress(), ethers.ZeroAddress);
    // dusty is linked to alice
    const sig = await buildLinkSig(dusty, alice.address, dusty.address, 0, TS, linkRegistryAddr);
    await linkRegistry.connect(alice).linkWallet(alice.address, dusty.address, TS, sig);
    // dusty deposits — works fine
    const deposit = ethers.parseEther("10");
    await dust.connect(dusty).approve(await vault.getAddress(), deposit);
    await vault.connect(dusty).depositDust(alice.address, await dust.getAddress(), deposit);
    expect(await vault.getDustEntries(alice.address)).to.equal(5n); // dusty only
    // bob deposits with alice as primary but bob is not linked to alice → reverts
    await dust.mint(bob.address, ethers.parseEther("10"));
    await dust.connect(bob).approve(await vault.getAddress(), deposit);
    await expect(
      vault.connect(bob).depositDust(alice.address, await dust.getAddress(), deposit)
    ).to.be.revertedWith("wallet not linked");
  });

  it("entries reset at new cycle", async function () {
    const { vault, linkRegistry, linkRegistryAddr, alice, dusty, dust } = await deploySystem();
    await vault.addSupportedToken(await dust.getAddress(), ethers.ZeroAddress);
    const sig = await buildLinkSig(dusty, alice.address, dusty.address, 0, TS, linkRegistryAddr);
    await linkRegistry.connect(alice).linkWallet(alice.address, dusty.address, TS, sig);
    const deposit = ethers.parseEther("5");
    await dust.connect(dusty).approve(await vault.getAddress(), deposit);
    await vault.connect(dusty).depositDust(alice.address, await dust.getAddress(), deposit);
    expect(await vault.getDustEntries(alice.address)).to.equal(5n);
    await time.increase(3600); // new cycle
    expect(await vault.getDustEntries(alice.address)).to.equal(0n);
  });

  it("owner can add/remove supported tokens", async function () {
    const { vault, owner, dust } = await deploySystem();
    const addr = await dust.getAddress();
    await vault.connect(owner).addSupportedToken(addr, ethers.ZeroAddress);
    expect(await vault.isSupported(addr)).to.be.true;
    await vault.connect(owner).removeSupportedToken(addr);
    expect(await vault.isSupported(addr)).to.be.false;
  });

  it("non-owner cannot add supported tokens", async function () {
    const { vault, alice, dust } = await deploySystem();
    await expect(
      vault.connect(alice).addSupportedToken(await dust.getAddress(), ethers.ZeroAddress)
    ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  LibertyRaffle Tests
// ─────────────────────────────────────────────────────────────────────────────

/** Fund the raffle with ETH such that prizePoolCents >= 5000 ($50).
 *  With $1 fallback: 1 ETH = 1e18 wei → 1e7 cents = $100,000
 *  Need: 5000 cents = 5000 * 1e10 = 5e13 wei = 0.00005 ETH  */
const FUND_50 = 5n * 10n ** 13n; // 0.05 ETH → 5000 cents

describe("LibertyRaffle", function () {
  const TS = Math.floor(Date.now() / 1000);
  it("constants are correct", async function () {
    const { raffle } = await deploySystem();
    expect(await raffle.MIN_POOL_CENTS()).to.equal(5000n);
    expect(await raffle.MIN_HOLD_CENTS()).to.equal(1000n);
    expect(await raffle.MAX_WINNERS()).to.equal(10n);
    expect(await raffle.COOLDOWN_PERIOD()).to.equal(86400n);
    expect(await raffle.DRAW_INTERVAL()).to.equal(3600n);
    expect(await raffle.raffleId()).to.equal(0n);
  });

  it("owner registers accounts", async function () {
    const { raffle, owner, alice } = await deploySystem();
    await raffle.connect(owner).registerAccount(alice.address);
    expect(await raffle.isRegistered(alice.address)).to.be.true;
  });

  it("checkAndDraw skips when pool below $50 floor", async function () {
    const { raffle, owner, alice, liberty } = await deploySystem();
    await raffle.connect(owner).registerAccount(alice.address);
    // 1e10 wei = 1 cent (at $1/ETH fallback)
    await raffle.connect(owner).fundPrizePoolETH({ value: 10_000_000_000n });
    expect(await raffle.prizePoolCents()).to.equal(1n);
    await expect(raffle.connect(alice).checkAndDraw())
      .to.emit(raffle, "DrawSkipped");
    expect(await raffle.raffleId()).to.equal(0n); // no draw happened
  });

  it("checkAndDraw executes when pool >= $50", async function () {
    const { raffle, owner, alice } = await deploySystem();
    await raffle.connect(owner).registerAccount(alice.address);
    await owner.sendTransaction({ to: await raffle.getAddress(), value: FUND_50 });
    expect(await raffle.canDraw()).to.deep.equal([true, 0]);
    await raffle.connect(alice).checkAndDraw();
    expect(await raffle.raffleId()).to.equal(1n);
    expect(await raffle.lastDrawTime()).to.be.gt(0n);
    expect(await raffle.prizePoolCents()).to.equal(0n);
  });

  it("winner and linked wallets enter cooldown", async function () {
    const { raffle, owner, alice, linkRegistry, linkRegistryAddr, dusty } = await deploySystem();
    const sig = await buildLinkSig(dusty, alice.address, dusty.address, 0, TS, linkRegistryAddr);
    await linkRegistry.connect(alice).linkWallet(alice.address, dusty.address, TS, sig);
    await raffle.connect(owner).registerAccount(alice.address);
    await owner.sendTransaction({ to: await raffle.getAddress(), value: FUND_50 });
    await raffle.connect(alice).checkAndDraw();
    expect(await raffle.isInCooldown(alice.address)).to.be.true;
    expect(await raffle.isInCooldown(dusty.address)).to.be.true;
  });

  it("cooldown wallet filtered from next draw", async function () {
    const { raffle, owner, alice, bob } = await deploySystem();
    // Register only alice for draw 1 so she wins all 10 slots (bob = 0 entries)
    await raffle.connect(owner).registerAccount(alice.address);
    await owner.sendTransaction({ to: await raffle.getAddress(), value: ethers.parseEther("0.1") });
    await raffle.connect(alice).checkAndDraw(); // alice wins all 10, enters cooldown
    expect(await raffle.isInCooldown(alice.address)).to.be.true;
    // Bob not registered yet, has 0 entries — not in cooldown
    expect(await raffle.isInCooldown(bob.address)).to.be.false;
    // Advance past DRAW_INTERVAL (1h) AND COOLDOWN (24h)
    await time.increase(25 * 3600);
    // Register bob now (after alice's cooldown started), fund pool
    await raffle.connect(owner).registerAccount(bob.address);
    await owner.sendTransaction({ to: await raffle.getAddress(), value: ethers.parseEther("0.1") });
    await raffle.connect(bob).checkAndDraw(); // bob wins (alice in cooldown)
    expect(await raffle.raffleId()).to.equal(2n);
  });
  it("winner can claim prize", async function () {
    const { raffle, owner, alice, bob } = await deploySystem();
    await raffle.connect(owner).registerAccount(alice.address);
    await raffle.connect(owner).registerAccount(bob.address);
    await owner.sendTransaction({ to: await raffle.getAddress(), value: FUND_50 });
    await raffle.connect(alice).checkAndDraw();
    const prize = await raffle.rafflePrizes(1, alice.address);
    expect(prize).to.be.gt(0n);
    // Verify contract balance decreases by exactly the prize
    const contractBalBefore = await ethers.provider.getBalance(await raffle.getAddress());
    await raffle.connect(alice).claimPrize(1, ethers.ZeroAddress);
    const contractBalAfter = await ethers.provider.getBalance(await raffle.getAddress());
    expect(contractBalBefore - contractBalAfter).to.equal(prize * 10000000000n);
  });

  it("non-winner cannot claim", async function () {
    const { raffle, owner, alice, bob } = await deploySystem();
    // Register only alice so she wins ALL 10 prize slots (bob has 0 entries)
    await raffle.connect(owner).registerAccount(alice.address);
    await owner.sendTransaction({ to: await raffle.getAddress(), value: FUND_50 });
    await raffle.connect(alice).checkAndDraw();
    // Bob is not yet registered, has no entries, no prize
    expect(await raffle.rafflePrizes(1, bob.address)).to.equal(0n);
    // Register bob and try to claim — correctly reverts with NothingToClaim
    await raffle.connect(owner).registerAccount(bob.address);
    await expect(
      raffle.connect(bob).claimPrize(1, ethers.ZeroAddress)
    ).to.be.revertedWithCustomError(raffle, "NothingToClaim");
  });

  it("draw reverts when paused", async function () {
    const { raffle, owner, alice } = await deploySystem();
    await raffle.connect(owner).pause();
    await expect(raffle.connect(alice).checkAndDraw())
      .to.be.revertedWithCustomError(raffle, "EnforcedPause");
  });

  it("unpause works", async function () {
    const { raffle, owner } = await deploySystem();
    await raffle.connect(owner).pause();
    expect(await raffle.paused()).to.be.true;
    await raffle.connect(owner).unpause();
    expect(await raffle.paused()).to.be.false;
  });

  it("multiple draws increment raffleId", async function () {
    const { raffle, owner, alice } = await deploySystem();
    await raffle.connect(owner).registerAccount(alice.address);
    for (let i = 1; i <= 3; i++) {
      await owner.sendTransaction({ to: await raffle.getAddress(), value: FUND_50 });
      await raffle.connect(alice).checkAndDraw();
      expect(await raffle.raffleId()).to.equal(BigInt(i));
      if (i < 3) {
        // Jump past both DRAW_INTERVAL (1h) AND COOLDOWN (24h) to allow next draw
        await time.increase(26 * 3600);
      }
    }
  });

  it("prize pool fully drained after draw", async function () {
    const { raffle, owner, alice } = await deploySystem();
    await raffle.connect(owner).registerAccount(alice.address);
    await owner.sendTransaction({ to: await raffle.getAddress(), value: FUND_50 });
    await raffle.connect(alice).checkAndDraw();
    expect(await raffle.prizePoolCents()).to.equal(0n);
  });

  it("bulk register works", async function () {
    const { raffle, owner, alice, bob } = await deploySystem();
    await raffle.connect(owner).registerAccounts([alice.address, bob.address]);
    expect(await raffle.isRegistered(alice.address)).to.be.true;
    expect(await raffle.isRegistered(bob.address)).to.be.true;
  });

  it("getAccountEntries returns base entry", async function () {
    const { raffle, owner, alice } = await deploySystem();
    await raffle.connect(owner).registerAccount(alice.address);
    expect(await raffle.getAccountEntries(alice.address)).to.equal(1n);
  });

  it("unregistered account has 0 entries", async function () {
    const { raffle, alice } = await deploySystem();
    expect(await raffle.getAccountEntries(alice.address)).to.equal(0n);
  });

  it("account in cooldown has 0 entries", async function () {
    const { raffle, owner, alice } = await deploySystem();
    await raffle.connect(owner).registerAccount(alice.address);
    await owner.sendTransaction({ to: await raffle.getAddress(), value: FUND_50 });
    await raffle.connect(alice).checkAndDraw();
    expect(await raffle.getAccountEntries(alice.address)).to.equal(0n);
  });
});
