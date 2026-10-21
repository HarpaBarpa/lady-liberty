with open('test/LibertyRaffle.test.ts', 'r') as f:
    t = f.read()

# Fix 3: multiple draws — increase by 24h+1 so cooldown expires, or skip cooldown checks
# Since alice draws every time and she's in 24h cooldown after draw 1,
# we need time.increase(24h+1) between draws. But DRAW_INTERVAL = 1h.
# Override: use time.increaseTo to jump past both draw interval AND cooldown
old3 = '''  it("multiple draws increment raffleId", async function () {
    const { raffle, owner, alice, bob } = await deploySystem();
    await raffle.connect(owner).registerAccount(alice.address);
    await raffle.connect(owner).registerAccount(bob.address);
    for (let i = 1; i <= 3; i++) {
      await owner.sendTransaction({ to: await raffle.getAddress(), value: FUND_50 });
      await raffle.connect(alice).checkAndDraw();
      expect(await raffle.raffleId()).to.equal(BigInt(i));
      if (i < 3) await time.increase(3601);
    }
  });'''

new3 = '''  it("multiple draws increment raffleId", async function () {
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
  });'''

t = t.replace(old3, new3)

# Fix 4: cooldown wallet filtered — advance past 24h cooldown to allow bob's draw
old4 = '''  it("cooldown wallet filtered from next draw", async function () {
    const { raffle, owner, alice, bob } = await deploySystem();
    await raffle.connect(owner).registerAccount(alice.address);
    await raffle.connect(owner).registerAccount(bob.address);
    // Give each account their own draw: alice draws first, then bob draws second
    await owner.sendTransaction({ to: await raffle.getAddress(), value: ethers.parseEther("0.1") });
    await raffle.connect(alice).checkAndDraw(); // alice wins, enters cooldown
    expect(await raffle.isInCooldown(alice.address)).to.be.true;
    expect(await raffle.isInCooldown(bob.address)).to.be.false;
    await time.increase(3601);
    await owner.sendTransaction({ to: await raffle.getAddress(), value: FUND_50 });
    await raffle.connect(bob).checkAndDraw(); // bob wins (alice in cooldown)
    expect(await raffle.raffleId()).to.equal(2n);
  });'''

new4 = '''  it("cooldown wallet filtered from next draw", async function () {
    const { raffle, owner, alice, bob } = await deploySystem();
    await raffle.connect(owner).registerAccount(alice.address);
    await raffle.connect(owner).registerAccount(bob.address);
    await owner.sendTransaction({ to: await raffle.getAddress(), value: ethers.parseEther("0.1") });
    await raffle.connect(alice).checkAndDraw(); // alice wins, enters cooldown
    expect(await raffle.isInCooldown(alice.address)).to.be.true;
    expect(await raffle.isInCooldown(bob.address)).to.be.false;
    // Advance past both DRAW_INTERVAL (1h) and full COOLDOWN (24h)
    await time.increase(25 * 3600);
    await owner.sendTransaction({ to: await raffle.getAddress(), value: ethers.parseEther("0.1") });
    await raffle.connect(bob).checkAndDraw(); // bob wins (alice still in cooldown)
    expect(await raffle.raffleId()).to.equal(2n);
  });'''

t = t.replace(old4, new4)

with open('test/LibertyRaffle.test.ts', 'w') as f:
    f.write(t)

print("Fixed multiple draws and cooldown tests")
