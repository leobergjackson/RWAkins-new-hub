import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

// ═══════════════════════════════════════════════════════════════════════
//  Yield Calculation Edge Cases
//  Tests for the unrealized yield feature added to dashboard + pool pages
// ═══════════════════════════════════════════════════════════════════════

describe("Yield Calculation Edge Cases", function () {
  async function deployYieldFixture() {
    const [owner, pool, payoutEngine, foundation, user1, user2] =
      await ethers.getSigners();

    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const usdt = await MockUSDT.deploy();

    const SrCVR = await ethers.getContractFactory("srCVR");
    const srCVR = await SrCVR.deploy(pool.address, await usdt.getAddress());

    const JrCVR = await ethers.getContractFactory("jrCVR");
    const jrCVR = await JrCVR.deploy(pool.address, await usdt.getAddress());

    // Fund token contracts for redemptions
    await usdt.mint(await srCVR.getAddress(), ethers.parseEther("1000000"));
    await usdt.mint(await jrCVR.getAddress(), ethers.parseEther("1000000"));

    const issuerToken = ethers.Wallet.createRandom().address;
    const issuerToken2 = ethers.Wallet.createRandom().address;

    return { usdt, srCVR, jrCVR, owner, pool, user1, user2, issuerToken, issuerToken2 };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  1. Senior Exchange Rate Edge Cases
  // ═══════════════════════════════════════════════════════════════════

  describe("Senior (srCVR) Exchange Rate", function () {
    it("EC-1.1: getCurrentExchangeRate returns 1e18 before any deposits", async function () {
      const { srCVR } = await loadFixture(deployYieldFixture);
      const rate = await srCVR.getCurrentExchangeRate();
      expect(rate).to.equal(ethers.parseEther("1"));
    });

    it("EC-1.2: getCurrentExchangeRate stays 1e18 after deposit with no yield", async function () {
      const { srCVR, pool, user1, issuerToken } = await loadFixture(deployYieldFixture);
      await srCVR.connect(pool).mint(user1.address, ethers.parseEther("5000"), issuerToken);
      const rate = await srCVR.getCurrentExchangeRate();
      expect(rate).to.equal(ethers.parseEther("1"));
    });

    it("EC-1.3: getRedeemableUSDT matches exchange rate calculation", async function () {
      const { srCVR, pool, user1, issuerToken } = await loadFixture(deployYieldFixture);
      await srCVR.connect(pool).mint(user1.address, ethers.parseEther("1000"), issuerToken);
      await srCVR.connect(pool).accrueYield(ethers.parseEther("200"), issuerToken);

      const rate = await srCVR.getCurrentExchangeRate();
      const redeemable = await srCVR.getRedeemableUSDT(ethers.parseEther("100"));

      // 100 srCVR * 1.2 rate = 120 USDT
      expect(redeemable).to.equal(ethers.parseEther("120"));
      expect(rate).to.equal(ethers.parseEther("1.2"));
    });

    it("EC-1.4: exchange rate after multiple yield accruals", async function () {
      const { srCVR, pool, user1, issuerToken } = await loadFixture(deployYieldFixture);
      await srCVR.connect(pool).mint(user1.address, ethers.parseEther("1000"), issuerToken);

      // 3 sequential premiums
      await srCVR.connect(pool).accrueYield(ethers.parseEther("100"), issuerToken);
      await srCVR.connect(pool).accrueYield(ethers.parseEther("100"), issuerToken);
      await srCVR.connect(pool).accrueYield(ethers.parseEther("100"), issuerToken);

      // Total underlying: 1000 + 300 = 1300, supply: 1000 => rate = 1.3
      const rate = await srCVR.getCurrentExchangeRate();
      expect(rate).to.equal(ethers.parseEther("1.3"));
    });

    it("EC-1.5: late depositor gets fewer srCVR tokens at higher rate", async function () {
      const { srCVR, pool, user1, user2, issuerToken } = await loadFixture(deployYieldFixture);

      // User1 deposits 1000 at rate 1.0 => gets 1000 srCVR
      await srCVR.connect(pool).mint(user1.address, ethers.parseEther("1000"), issuerToken);

      // Yield accrues: rate goes to 1.5
      await srCVR.connect(pool).accrueYield(ethers.parseEther("500"), issuerToken);

      // User2 deposits 1500 at rate 1.5 => gets 1000 srCVR (1500/1.5)
      await srCVR.connect(pool).mint(user2.address, ethers.parseEther("1500"), issuerToken);

      const bal1 = await srCVR.balanceOf(user1.address);
      const bal2 = await srCVR.balanceOf(user2.address);

      expect(bal1).to.equal(ethers.parseEther("1000"));
      expect(bal2).to.equal(ethers.parseEther("1000"));
    });

    it("EC-1.6: exchange rate after liquidation drops below initial", async function () {
      const { srCVR, pool, user1, issuerToken } = await loadFixture(deployYieldFixture);

      await srCVR.connect(pool).mint(user1.address, ethers.parseEther("1000"), issuerToken);
      await srCVR.connect(pool).accrueYield(ethers.parseEther("200"), issuerToken);

      // Rate = 1.2 before liquidation
      expect(await srCVR.getCurrentExchangeRate()).to.equal(ethers.parseEther("1.2"));

      // Liquidate entire issuer pool
      await srCVR.connect(pool).liquidate(issuerToken);

      // totalUnderlying dropped by 1200, supply still 1000
      // If this is the only issuer, underlying = 0, rate = 0/1000... but contract guards this
      const rate = await srCVR.getCurrentExchangeRate();
      // Rate should be 0 if only one issuer (all underlying gone)
      expect(rate).to.equal(0);
    });

    it("EC-1.7: exchange rate with two issuers — liquidation of one", async function () {
      const { srCVR, pool, user1, user2, issuerToken, issuerToken2 } = await loadFixture(deployYieldFixture);

      // Deposit under issuer1
      await srCVR.connect(pool).mint(user1.address, ethers.parseEther("1000"), issuerToken);
      // Deposit under issuer2
      await srCVR.connect(pool).mint(user2.address, ethers.parseEther("1000"), issuerToken2);

      // Yield on both
      await srCVR.connect(pool).accrueYield(ethers.parseEther("200"), issuerToken);
      await srCVR.connect(pool).accrueYield(ethers.parseEther("200"), issuerToken2);

      // Rate = (2000+400) / 2000 = 1.2
      expect(await srCVR.getCurrentExchangeRate()).to.equal(ethers.parseEther("1.2"));

      // Liquidate issuer1 only
      await srCVR.connect(pool).liquidate(issuerToken);

      // Remaining: underlying = 2400 - 1200 = 1200, supply still 2000
      // Rate = 1200/2000 = 0.6
      const rate = await srCVR.getCurrentExchangeRate();
      expect(rate).to.equal(ethers.parseEther("0.6"));
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  2. Junior Pro-Rata Rate Edge Cases
  // ═══════════════════════════════════════════════════════════════════

  describe("Junior (jrCVR) Pro-Rata Rate", function () {
    it("EC-2.1: poolUnderlying/poolSupply = 1.0 with no yield", async function () {
      const { jrCVR, pool, user1, issuerToken } = await loadFixture(deployYieldFixture);
      await jrCVR.connect(pool).mint(user1.address, ethers.parseEther("1000"), issuerToken);

      const underlying = await jrCVR.getPoolUnderlying(issuerToken);
      const supply = await jrCVR.poolSupply(issuerToken);

      // Both should be 1000e18 => ratio = 1.0
      expect(underlying).to.equal(ethers.parseEther("1000"));
      expect(supply).to.equal(ethers.parseEther("1000"));
    });

    it("EC-2.2: pro-rata rate increases after yield accrual", async function () {
      const { jrCVR, pool, user1, issuerToken } = await loadFixture(deployYieldFixture);
      await jrCVR.connect(pool).mint(user1.address, ethers.parseEther("1000"), issuerToken);
      await jrCVR.connect(pool).accrueYield(ethers.parseEther("300"), issuerToken);

      const underlying = await jrCVR.getPoolUnderlying(issuerToken);
      const supply = await jrCVR.poolSupply(issuerToken);

      // underlying = 1300, supply = 1000 => rate = 1.3
      expect(underlying).to.equal(ethers.parseEther("1300"));
      expect(supply).to.equal(ethers.parseEther("1000"));
    });

    it("EC-2.3: zero supply returns zero underlying", async function () {
      const { jrCVR, issuerToken } = await loadFixture(deployYieldFixture);

      const underlying = await jrCVR.getPoolUnderlying(issuerToken);
      const supply = await jrCVR.poolSupply(issuerToken);

      expect(underlying).to.equal(0);
      expect(supply).to.equal(0);
      // Frontend: if supply === 0, rate stays at 1.0 default (no division)
    });

    it("EC-2.4: epoch yield tracks correctly across epochs", async function () {
      const { jrCVR, pool, user1, issuerToken } = await loadFixture(deployYieldFixture);
      await jrCVR.connect(pool).mint(user1.address, ethers.parseEther("1000"), issuerToken);

      // Epoch 0: accrue 100
      await jrCVR.connect(pool).accrueYield(ethers.parseEther("100"), issuerToken);
      expect(await jrCVR.epochYield(0)).to.equal(ethers.parseEther("100"));

      // Advance epoch
      await jrCVR.connect(pool).advanceEpoch();
      expect(await jrCVR.currentEpoch()).to.equal(1);

      // Epoch 1: accrue 250
      await jrCVR.connect(pool).accrueYield(ethers.parseEther("250"), issuerToken);
      expect(await jrCVR.epochYield(1)).to.equal(ethers.parseEther("250"));

      // Epoch 0 unchanged
      expect(await jrCVR.epochYield(0)).to.equal(ethers.parseEther("100"));
    });

    it("EC-2.5: liquidation zeroes poolUnderlying for issuer", async function () {
      const { jrCVR, pool, user1, issuerToken } = await loadFixture(deployYieldFixture);
      await jrCVR.connect(pool).mint(user1.address, ethers.parseEther("1000"), issuerToken);
      await jrCVR.connect(pool).accrueYield(ethers.parseEther("500"), issuerToken);

      // Before: underlying = 1500
      expect(await jrCVR.getPoolUnderlying(issuerToken)).to.equal(ethers.parseEther("1500"));

      await jrCVR.connect(pool).liquidate(issuerToken);

      // After: underlying = 0, supply unchanged
      expect(await jrCVR.getPoolUnderlying(issuerToken)).to.equal(0);
      expect(await jrCVR.poolSupply(issuerToken)).to.equal(ethers.parseEther("1000"));
      // Frontend: rate = 0/1000 = 0, yield = 1000 * (0 - 1) = -1000 (total loss)
    });

    it("EC-2.6: pro-rata redemption returns correct amount with yield", async function () {
      const { jrCVR, usdt, pool, user1, issuerToken } = await loadFixture(deployYieldFixture);
      await jrCVR.connect(pool).mint(user1.address, ethers.parseEther("1000"), issuerToken);
      await jrCVR.connect(pool).accrueYield(ethers.parseEther("500"), issuerToken);

      // Redeem 200 jrCVR: (200 * 1500) / 1000 = 300 USDT
      const balBefore = await usdt.balanceOf(user1.address);
      await jrCVR.connect(pool).redeem(user1.address, ethers.parseEther("200"), issuerToken);
      const balAfter = await usdt.balanceOf(user1.address);

      expect(balAfter - balBefore).to.equal(ethers.parseEther("300"));
    });

    it("EC-2.7: two depositors share yield pro-rata", async function () {
      const { jrCVR, usdt, pool, user1, user2, issuerToken } = await loadFixture(deployYieldFixture);

      // User1: 700, User2: 300 => total supply = 1000
      await jrCVR.connect(pool).mint(user1.address, ethers.parseEther("700"), issuerToken);
      await jrCVR.connect(pool).mint(user2.address, ethers.parseEther("300"), issuerToken);

      // Accrue 1000 yield => underlying = 2000, supply = 1000
      await jrCVR.connect(pool).accrueYield(ethers.parseEther("1000"), issuerToken);

      // User1 redeems all 700: (700 * 2000) / 1000 = 1400
      const bal1Before = await usdt.balanceOf(user1.address);
      await jrCVR.connect(pool).redeem(user1.address, ethers.parseEther("700"), issuerToken);
      const bal1After = await usdt.balanceOf(user1.address);
      expect(bal1After - bal1Before).to.equal(ethers.parseEther("1400"));
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  3. Cross-Tranche Consistency
  // ═══════════════════════════════════════════════════════════════════

  describe("Cross-Tranche Yield Consistency", function () {
    it("EC-3.1: getRedeemableUSDT and getCurrentExchangeRate are consistent", async function () {
      const { srCVR, pool, user1, issuerToken } = await loadFixture(deployYieldFixture);
      await srCVR.connect(pool).mint(user1.address, ethers.parseEther("1000"), issuerToken);
      await srCVR.connect(pool).accrueYield(ethers.parseEther("350"), issuerToken);

      const rate = await srCVR.getCurrentExchangeRate();
      const redeemable = await srCVR.getRedeemableUSDT(ethers.parseEther("1000"));

      // rate = 1.35, redeemable should = 1000 * 1.35 = 1350
      expect(rate).to.equal(ethers.parseEther("1.35"));
      expect(redeemable).to.equal(ethers.parseEther("1350"));
    });

    it("EC-3.2: senior and junior yield from same premium are independent", async function () {
      const { srCVR, jrCVR, pool, user1, issuerToken } = await loadFixture(deployYieldFixture);

      await srCVR.connect(pool).mint(user1.address, ethers.parseEther("1000"), issuerToken);
      await jrCVR.connect(pool).mint(user1.address, ethers.parseEther("1000"), issuerToken);

      // Simulate premium split: 700 to senior, 300 to junior
      await srCVR.connect(pool).accrueYield(ethers.parseEther("700"), issuerToken);
      await jrCVR.connect(pool).accrueYield(ethers.parseEther("300"), issuerToken);

      // Senior rate: (1000+700)/1000 = 1.7
      expect(await srCVR.getCurrentExchangeRate()).to.equal(ethers.parseEther("1.7"));

      // Junior rate: underlying 1300, supply 1000 => 1.3
      const jrUnderlying = await jrCVR.getPoolUnderlying(issuerToken);
      expect(jrUnderlying).to.equal(ethers.parseEther("1300"));
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  4. Overflow / Precision Edge Cases
  // ═══════════════════════════════════════════════════════════════════

  describe("Overflow and Precision", function () {
    it("EC-4.1: very small yield rounds to zero in integer math (known behavior)", async function () {
      const { srCVR, pool, user1, issuerToken } = await loadFixture(deployYieldFixture);
      await srCVR.connect(pool).mint(user1.address, ethers.parseEther("1000000"), issuerToken);

      // 1 wei of yield on 1M tokens — integer division rounds to zero
      await srCVR.connect(pool).accrueYield(1n, issuerToken);

      const rate = await srCVR.getCurrentExchangeRate();
      // Rate stays at 1e18 due to integer truncation: (1000000e18 + 1) * 1e18 / 1000000e18 = 1e18
      expect(rate).to.equal(ethers.parseEther("1"));

      // But totalUnderlying DID increase
      const underlying = await srCVR.totalUnderlying();
      expect(underlying).to.equal(ethers.parseEther("1000000") + 1n);
    });

    it("EC-4.2: large deposit + large yield does not overflow", async function () {
      const { srCVR, pool, user1, issuerToken } = await loadFixture(deployYieldFixture);

      const largeAmount = ethers.parseEther("1000000000"); // 1B
      await srCVR.connect(pool).mint(user1.address, largeAmount, issuerToken);
      await srCVR.connect(pool).accrueYield(largeAmount, issuerToken);

      // Rate = 2e18 (2.0)
      const rate = await srCVR.getCurrentExchangeRate();
      expect(rate).to.equal(ethers.parseEther("2"));
    });

    it("EC-4.3: zero yield accrual is safe", async function () {
      const { srCVR, pool, user1, issuerToken } = await loadFixture(deployYieldFixture);
      await srCVR.connect(pool).mint(user1.address, ethers.parseEther("1000"), issuerToken);

      // 0 yield — should not revert
      await srCVR.connect(pool).accrueYield(0, issuerToken);

      const rate = await srCVR.getCurrentExchangeRate();
      expect(rate).to.equal(ethers.parseEther("1"));
    });
  });
});
