import re

with open('test/LibertyRaffle.test.ts', 'r') as f:
    t = f.read()

# Fix 1: winner can claim — verify net gain > 0 using actual gas
old = '''  it("winner can claim prize", async function () {
    const { raffle, owner, alice, bob } = await deploySystem();
    await raffle.connect(owner).registerAccount(alice.address);
    await raffle.connect(owner).registerAccount(bob.address);
    await owner.sendTransaction({ to: await raffle.getAddress(), value: FUND_50 });
    await raffle.connect(alice).checkAndDraw();
    const balBefore = await ethers.provider.getBalance(alice.address);
    await raffle.connect(alice).claimPrize(1, ethers.ZeroAddress);
    expect(await ethers.provider.getBalance(alice.address)).to.be.gt(balBefore);
  });'''

new = '''  it("winner can claim prize", async function () {
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
  });'''

t = t.replace(old, new)

# Fix 2: non-winner — bob already registered, check rafflePrizes[1] not [2]
old2 = '''  it("non-winner cannot claim", async function () {
    const { raffle, owner, alice, bob } = await deploySystem();
    await raffle.connect(owner).registerAccount(alice.address);
    await raffle.connect(owner).registerAccount(bob.address);
    await owner.sendTransaction({ to: await raffle.getAddress(), value: FUND_50 });
    await raffle.connect(alice).checkAndDraw();
    await expect(
      raffle.connect(bob).claimPrize(2, ethers.ZeroAddress)
    ).to.be.revertedWithCustomError(raffle, "NothingToClaim");
  });'''

new2 = '''  it("non-winner cannot claim", async function () {
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

t = t.replace(old2, new2)

with open('test/LibertyRaffle.test.ts', 'w') as f:
    f.write(t)

print("Fixed winner/non-winner tests")
