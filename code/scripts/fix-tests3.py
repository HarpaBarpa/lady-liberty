with open('test/LibertyRaffle.test.ts', 'r') as f:
    t = f.read()

# Fix non-winner: register only alice before draw so she wins ALL 10 slots
# bob registered AFTER draw, so he has 0 entries and 0 prize
old_nw = '''  it("non-winner cannot claim", async function () {
    const { raffle, owner, alice, bob } = await deploySystem();
    await raffle.connect(owner).registerAccount(alice.address);
    await raffle.connect(owner).registerAccount(bob.address);
    await owner.sendTransaction({ to: await raffle.getAddress(), value: FUND_50 });
    await raffle.connect(alice).checkAndDraw();
    // Bob has no prize in raffle 1
    expect(await raffle.rafflePrizes(1, bob.address)).to.equal(0n);
    await expect(
      raffle.connect(bob).claimPrize(1, ethers.ZeroAddress)
    ).to.be.revertedWithCustomError(raffle, "NothingToClaim");
  });'''

new_nw = '''  it("non-winner cannot claim", async function () {
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
  });'''

t = t.replace(old_nw, new_nw)

# Fix cooldown: register only alice for draw 1 (alice wins all 10, bob has 0 entries)
# After cooldown, register bob and draw — only bob wins
old_cd = '''  it("cooldown wallet filtered from next draw", async function () {
    const { raffle, owner, alice, bob } = await deploySystem();
    await raffle.connect(owner).registerAccount(alice.address);
    await raffle.connect(owner).registerAccount(bob.address);
    // Give each account their own draw: alice draws first, then bob draws second
    await owner.sendTransaction({ to: await raffle.getAddress(), value: ethers.parseEther("0.1") });
    await raffle.connect(alice).checkAndDraw(); // alice wins, enters cooldown
    expect(await raffle.isInCooldown(alice.address)).to.be.true;
    expect(await raffle.isInCooldown(bob.address)).to.be.false;
    // Advance past both DRAW_INTERVAL (1h) and full COOLDOWN (24h)
    await time.increase(25 * 3600);
    await owner.sendTransaction({ to: await raffle.getAddress(), value: ethers.parseEther("0.1") });
    await raffle.connect(bob).checkAndDraw(); // bob wins (alice in cooldown)
    expect(await raffle.raffleId()).to.equal(2n);
  });'''

new_cd = '''  it("cooldown wallet filtered from next draw", async function () {
    const { raffle, owner, alice, bob } = await deploySystem();
    // Register only alice for draw 1 so she wins all 10 slots
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
  });'''

t = t.replace(old_cd, new_cd)

with open('test/LibertyRaffle.test.ts', 'w') as f:
    f.write(t)

print("Both tests fixed")
# Verify
t2 = open('test/LibertyRaffle.test.ts').read()
assert('non-winner cannot claim' in t2)
assert('registerAccount(alice.address)' in t2)
assert('only alice for draw 1' in t2 or 'only alice so she wins' in t2)
print("Verification OK")
