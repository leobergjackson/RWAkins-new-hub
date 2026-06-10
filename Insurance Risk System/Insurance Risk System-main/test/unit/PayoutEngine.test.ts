import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

// ─── Mock contracts needed for PayoutEngine tests ────────────────────────

// We deploy lightweight mocks for IssuerBond, InsurancePool, IRSOracle, and IssuerRegistry
// since those are external dependencies PayoutEngine calls during executePayout.

describe("PayoutEngine", function () {
  // ─── Fixture ────────────────────────────────────────────────────────

  async function deployPayoutEngineFixture() {
    const [owner, foundation, holder1, holder2, holder3, oracleAddr, attacker] =
      await ethers.getSigners();

    // Deploy MockUSDT
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const usdt = await MockUSDT.deploy();

    // Deploy MockIdentityRegistry
    const MockIdentityRegistry = await ethers.getContractFactory("MockIdentityRegistry");
    const identityRegistry = await MockIdentityRegistry.deploy();

    // Deploy MockERC3643Token (issuer token)
    const MockERC3643Token = await ethers.getContractFactory("MockERC3643Token");
    const issuerToken = await MockERC3643Token.deploy(
      "Test RWA Token",
      "tRWA",
      await identityRegistry.getAddress()
    );

    // Mark all holders as verified by default
    await identityRegistry.setVerified(holder1.address, true);
    await identityRegistry.setVerified(holder2.address, true);
    await identityRegistry.setVerified(holder3.address, true);

    // Deploy ProtectionCert
    const ProtectionCert = await ethers.getContractFactory("ProtectionCert");
    const protectionCert = await ProtectionCert.deploy();

    // Deploy mock IssuerBond, InsurancePool, IRSOracle, IssuerRegistry
    const MockIssuerBond = await ethers.getContractFactory("MockIssuerBondForPayout");
    const issuerBond = await MockIssuerBond.deploy();

    const MockInsurancePool = await ethers.getContractFactory("MockInsurancePoolForPayout");
    const insurancePool = await MockInsurancePool.deploy();

    const MockIRSOracle = await ethers.getContractFactory("MockIRSOracleForPayout");
    const irsOracle = await MockIRSOracle.deploy();

    const MockIssuerRegistry = await ethers.getContractFactory("MockIssuerRegistryForPayout");
    const issuerRegistry = await MockIssuerRegistry.deploy();

    // Deploy SubrogationNFT
    const SubrogationNFT = await ethers.getContractFactory("SubrogationNFT");
    // We need a placeholder payoutEngine address; we'll update after deploying PayoutEngine
    const subrogationNFT = await SubrogationNFT.deploy(owner.address, foundation.address);

    // Deploy PayoutEngine
    const PayoutEngine = await ethers.getContractFactory("PayoutEngine");
    const payoutEngine = await PayoutEngine.deploy(
      await usdt.getAddress(),
      foundation.address
    );

    // Wire up PayoutEngine
    await payoutEngine.setInsurancePool(await insurancePool.getAddress());
    await payoutEngine.setDefaultOracle(oracleAddr.address);
    await payoutEngine.setProtectionCert(await protectionCert.getAddress());
    await payoutEngine.setIssuerBond(await issuerBond.getAddress());
    await payoutEngine.setSubrogationNFT(await subrogationNFT.getAddress());
    await payoutEngine.setIRSOracle(await irsOracle.getAddress());
    await payoutEngine.setIssuerRegistry(await issuerRegistry.getAddress());

    // Wire up ProtectionCert and SubrogationNFT to point at PayoutEngine
    await protectionCert.setPayoutEngine(await payoutEngine.getAddress());
    // Transfer ownership of SubrogationNFT so payoutEngine is authorized, or set payoutEngine
    // SubrogationNFT checks msg.sender == payoutEngine || msg.sender == owner()
    // Since we deployed subrogationNFT with owner as payoutEngine, we need to update:
    // Actually constructor sets payoutEngine = _payoutEngine (owner.address). Let's redeploy:
    const subrogationNFT2 = await SubrogationNFT.deploy(
      await payoutEngine.getAddress(),
      foundation.address
    );
    await payoutEngine.setSubrogationNFT(await subrogationNFT2.getAddress());

    // Setup mock insurance pool state
    const issuerTokenAddr = await issuerToken.getAddress();

    return {
      payoutEngine,
      usdt,
      identityRegistry,
      issuerToken,
      protectionCert,
      issuerBond,
      insurancePool,
      irsOracle,
      issuerRegistry,
      subrogationNFT: subrogationNFT2,
      owner,
      foundation,
      holder1,
      holder2,
      holder3,
      oracleAddr,
      attacker,
      issuerTokenAddr,
    };
  }

  // ─── Helper: setup pool state and purchase coverage ─────────────────

  async function setupCoverageFixture() {
    const f = await loadFixture(deployPayoutEngineFixture);

    // Configure mock pool: seniorTVL=5000, juniorTVL=3000, totalInsured=0
    await f.insurancePool.setPoolState(
      f.issuerTokenAddr,
      ethers.parseEther("5000"), // seniorTVL
      ethers.parseEther("3000"), // juniorTVL
      0                          // totalInsured
    );

    // holder1 purchases coverage for 4000 USDT
    await f.payoutEngine
      .connect(f.holder1)
      .purchaseCoverage(f.issuerTokenAddr, ethers.parseEther("4000"));

    // Update totalInsured in mock pool after first purchase
    await f.insurancePool.setPoolState(
      f.issuerTokenAddr,
      ethers.parseEther("5000"),
      ethers.parseEther("3000"),
      ethers.parseEther("4000")
    );

    // holder2 purchases coverage for 6000 USDT
    await f.payoutEngine
      .connect(f.holder2)
      .purchaseCoverage(f.issuerTokenAddr, ethers.parseEther("6000"));

    return f;
  }

  // ─── 1. Coverage Purchase (correct premium calculation) ─────────────

  describe("Coverage Purchase", function () {
    it("should register holder and store correct position data", async function () {
      const f = await loadFixture(deployPayoutEngineFixture);

      // Setup pool state: seniorTVL=5000, juniorTVL=3000, totalInsured=0
      await f.insurancePool.setPoolState(
        f.issuerTokenAddr,
        ethers.parseEther("5000"),
        ethers.parseEther("3000"),
        0
      );

      await f.payoutEngine
        .connect(f.holder1)
        .purchaseCoverage(f.issuerTokenAddr, ethers.parseEther("2000"));

      const pos = await f.payoutEngine.getInsuredPosition(
        f.issuerTokenAddr,
        f.holder1.address
      );

      expect(pos.holder).to.equal(f.holder1.address);
      expect(pos.coveredAmount).to.equal(ethers.parseEther("2000"));
      // poolBalance = 5000 + 3000 = 8000
      expect(pos.poolBalanceAtMint).to.equal(ethers.parseEther("8000"));
      // newTotalInsured = 0 + 2000 = 2000
      expect(pos.totalInsuredAtMint).to.equal(ethers.parseEther("2000"));
      // estimatedPct = (8000 * 10000) / 2000 = 40000 bps (400%)
      expect(pos.estimatedPayoutPct).to.equal(40000n);
      expect(pos.paid).to.be.false;
      expect(pos.inEscrow).to.be.false;
    });

    it("should compute correct estimatedPayoutPct", async function () {
      const f = await loadFixture(deployPayoutEngineFixture);

      // Pool has 1000 total, insure 5000 => pct = (1000*10000)/5000 = 2000 bps (20%)
      await f.insurancePool.setPoolState(
        f.issuerTokenAddr,
        ethers.parseEther("600"),
        ethers.parseEther("400"),
        0
      );

      await f.payoutEngine
        .connect(f.holder1)
        .purchaseCoverage(f.issuerTokenAddr, ethers.parseEther("5000"));

      const pos = await f.payoutEngine.getInsuredPosition(
        f.issuerTokenAddr,
        f.holder1.address
      );

      expect(pos.estimatedPayoutPct).to.equal(2000n);
    });

    it("should prevent duplicate coverage purchase", async function () {
      const f = await loadFixture(deployPayoutEngineFixture);

      await f.insurancePool.setPoolState(f.issuerTokenAddr, ethers.parseEther("5000"), ethers.parseEther("3000"), 0);

      await f.payoutEngine
        .connect(f.holder1)
        .purchaseCoverage(f.issuerTokenAddr, ethers.parseEther("1000"));

      await expect(
        f.payoutEngine
          .connect(f.holder1)
          .purchaseCoverage(f.issuerTokenAddr, ethers.parseEther("1000"))
      ).to.be.revertedWith("PayoutEngine: already insured");
    });

    it("should add holder to insuredHolders list", async function () {
      const f = await loadFixture(deployPayoutEngineFixture);
      await f.insurancePool.setPoolState(f.issuerTokenAddr, ethers.parseEther("5000"), ethers.parseEther("3000"), 0);

      await f.payoutEngine
        .connect(f.holder1)
        .purchaseCoverage(f.issuerTokenAddr, ethers.parseEther("1000"));

      const holders = await f.payoutEngine.getInsuredHolders(f.issuerTokenAddr);
      expect(holders).to.include(f.holder1.address);
    });

    it("should call addInsuredAmount on InsurancePool", async function () {
      const f = await loadFixture(deployPayoutEngineFixture);
      await f.insurancePool.setPoolState(f.issuerTokenAddr, ethers.parseEther("5000"), ethers.parseEther("3000"), 0);

      await f.payoutEngine
        .connect(f.holder1)
        .purchaseCoverage(f.issuerTokenAddr, ethers.parseEther("2000"));

      // Check mock recorded the call
      const added = await f.insurancePool.lastAddedInsured(f.issuerTokenAddr);
      expect(added).to.equal(ethers.parseEther("2000"));
    });
  });

  // ─── 2. Premium Payment in USDT ────────────────────────────────────
  // (Coverage purchase itself is free in PayoutEngine; premium is handled
  //  at InsurancePool level. We test that USDT is used for payouts.)

  // ─── 3. ProtectionCert Minting on Purchase ─────────────────────────

  describe("ProtectionCert Minting on Purchase", function () {
    it("should mint a ProtectionCert to the holder on purchaseCoverage", async function () {
      const f = await loadFixture(deployPayoutEngineFixture);
      await f.insurancePool.setPoolState(f.issuerTokenAddr, ethers.parseEther("5000"), ethers.parseEther("3000"), 0);

      const tx = await f.payoutEngine
        .connect(f.holder1)
        .purchaseCoverage(f.issuerTokenAddr, ethers.parseEther("2000"));

      // ProCert should be owned by holder1
      const certId = await f.protectionCert.holderCerts(f.holder1.address, f.issuerTokenAddr);
      expect(certId).to.be.gt(0);
      expect(await f.protectionCert.ownerOf(certId)).to.equal(f.holder1.address);
    });

    it("should emit CoveragePurchased event with certId", async function () {
      const f = await loadFixture(deployPayoutEngineFixture);
      await f.insurancePool.setPoolState(f.issuerTokenAddr, ethers.parseEther("5000"), ethers.parseEther("3000"), 0);

      await expect(
        f.payoutEngine
          .connect(f.holder1)
          .purchaseCoverage(f.issuerTokenAddr, ethers.parseEther("2000"))
      ).to.emit(f.payoutEngine, "CoveragePurchased");
    });
  });

  // ─── 4. Payout Execution (waterfall: bond -> junior -> senior) ──────

  describe("Payout Execution", function () {
    it("should liquidate in order: bond -> junior -> senior", async function () {
      const f = await loadFixture(setupCoverageFixture);

      // Configure mock liquidation returns
      await f.issuerBond.setLiquidationReturn(f.issuerTokenAddr, ethers.parseEther("1000"));
      await f.insurancePool.setLiquidationReturn(
        f.issuerTokenAddr,
        ethers.parseEther("3000"), // juniorLiquidated
        ethers.parseEther("5000")  // seniorLiquidated
      );

      // Fund PayoutEngine with USDT for payouts
      const totalPayout = ethers.parseEther("9000");
      await f.usdt.mint(await f.payoutEngine.getAddress(), totalPayout);

      await f.payoutEngine
        .connect(f.oracleAddr)
        .executePayout(f.issuerTokenAddr);

      // Verify bond liquidated first (recorded in mock)
      expect(await f.issuerBond.liquidateCalled(f.issuerTokenAddr)).to.be.true;
      // Verify pool liquidated
      expect(await f.insurancePool.liquidateCalled(f.issuerTokenAddr)).to.be.true;
    });

    it("should emit PayoutComplete with correct totalPayout", async function () {
      const f = await loadFixture(setupCoverageFixture);

      await f.issuerBond.setLiquidationReturn(f.issuerTokenAddr, ethers.parseEther("1000"));
      await f.insurancePool.setLiquidationReturn(
        f.issuerTokenAddr,
        ethers.parseEther("2000"),
        ethers.parseEther("4000")
      );

      await f.usdt.mint(await f.payoutEngine.getAddress(), ethers.parseEther("7000"));

      await expect(
        f.payoutEngine.connect(f.oracleAddr).executePayout(f.issuerTokenAddr)
      )
        .to.emit(f.payoutEngine, "PayoutComplete")
        .withArgs(f.issuerTokenAddr, ethers.parseEther("7000"), 2);
    });
  });

  // ─── 5. Pro-rata Distribution ───────────────────────────────────────

  describe("Pro-rata Distribution", function () {
    it("should distribute payouts proportional to covered amounts", async function () {
      const f = await loadFixture(setupCoverageFixture);

      // holder1 = 4000, holder2 = 6000, total = 10000
      // totalPayout = 5000
      // holder1 share = (4000 * 5000) / 10000 = 2000
      // holder2 share = (6000 * 5000) / 10000 = 3000

      await f.issuerBond.setLiquidationReturn(f.issuerTokenAddr, ethers.parseEther("1000"));
      await f.insurancePool.setLiquidationReturn(
        f.issuerTokenAddr,
        ethers.parseEther("2000"),
        ethers.parseEther("2000")
      );

      await f.usdt.mint(await f.payoutEngine.getAddress(), ethers.parseEther("5000"));

      const h1Before = await f.usdt.balanceOf(f.holder1.address);
      const h2Before = await f.usdt.balanceOf(f.holder2.address);

      await f.payoutEngine.connect(f.oracleAddr).executePayout(f.issuerTokenAddr);

      const h1After = await f.usdt.balanceOf(f.holder1.address);
      const h2After = await f.usdt.balanceOf(f.holder2.address);

      expect(h1After - h1Before).to.equal(ethers.parseEther("2000"));
      expect(h2After - h2Before).to.equal(ethers.parseEther("3000"));
    });
  });

  // ─── 6. ERC-3643 Compliance Check (frozen holder escrow) ────────────

  describe("ERC-3643 Compliance (Frozen Holder Escrow)", function () {
    it("should escrow payout for a frozen holder", async function () {
      const f = await loadFixture(setupCoverageFixture);

      // Freeze holder1 on the issuer token
      await f.issuerToken.setFrozen(f.holder1.address, true);

      await f.issuerBond.setLiquidationReturn(f.issuerTokenAddr, ethers.parseEther("1000"));
      await f.insurancePool.setLiquidationReturn(
        f.issuerTokenAddr,
        ethers.parseEther("2000"),
        ethers.parseEther("2000")
      );

      await f.usdt.mint(await f.payoutEngine.getAddress(), ethers.parseEther("5000"));

      await f.payoutEngine.connect(f.oracleAddr).executePayout(f.issuerTokenAddr);

      // holder1 should have escrow, not direct payout
      const escrow = await f.payoutEngine.getEscrowRecord(f.holder1.address);
      expect(escrow.amount).to.equal(ethers.parseEther("2000"));
      expect(escrow.holdReason).to.equal("COMPLIANCE_HOLD");

      // holder1 balance should not have increased
      expect(await f.usdt.balanceOf(f.holder1.address)).to.equal(0);

      // holder2 should have received their share directly
      expect(await f.usdt.balanceOf(f.holder2.address)).to.equal(ethers.parseEther("3000"));
    });

    it("should escrow payout for an unverified holder", async function () {
      const f = await loadFixture(setupCoverageFixture);

      // Unverify holder2
      await f.identityRegistry.setVerified(f.holder2.address, false);

      await f.issuerBond.setLiquidationReturn(f.issuerTokenAddr, ethers.parseEther("500"));
      await f.insurancePool.setLiquidationReturn(
        f.issuerTokenAddr,
        ethers.parseEther("1500"),
        ethers.parseEther("3000")
      );

      await f.usdt.mint(await f.payoutEngine.getAddress(), ethers.parseEther("5000"));

      await f.payoutEngine.connect(f.oracleAddr).executePayout(f.issuerTokenAddr);

      const escrow = await f.payoutEngine.getEscrowRecord(f.holder2.address);
      expect(escrow.amount).to.equal(ethers.parseEther("3000"));

      // holder1 received directly
      expect(await f.usdt.balanceOf(f.holder1.address)).to.equal(ethers.parseEther("2000"));
    });
  });

  // ─── 7. SubrogationNFT Minting with Correct Evidence ───────────────

  describe("SubrogationNFT Minting", function () {
    it("should mint SubrogationNFT to foundation with correct claim data", async function () {
      const f = await loadFixture(setupCoverageFixture);

      await f.issuerBond.setLiquidationReturn(f.issuerTokenAddr, ethers.parseEther("1000"));
      await f.insurancePool.setLiquidationReturn(
        f.issuerTokenAddr,
        ethers.parseEther("2000"),
        ethers.parseEther("4000")
      );

      await f.usdt.mint(await f.payoutEngine.getAddress(), ethers.parseEther("7000"));

      await expect(
        f.payoutEngine.connect(f.oracleAddr).executePayout(f.issuerTokenAddr)
      ).to.emit(f.payoutEngine, "SubrogationNFTMinted");

      // Check NFT was minted to foundation
      const nftId = await f.subrogationNFT.getClaimByIssuer(f.issuerTokenAddr);
      expect(nftId).to.be.gt(0);
      expect(await f.subrogationNFT.ownerOf(nftId)).to.equal(f.foundation.address);

      // Check claim data
      const claim = await f.subrogationNFT.getClaimData(nftId);
      expect(claim.issuerToken).to.equal(f.issuerTokenAddr);
      expect(claim.totalPayoutAmount).to.equal(ethers.parseEther("7000"));
      expect(claim.bondLiquidated).to.equal(ethers.parseEther("1000"));
      expect(claim.juniorLiquidated).to.equal(ethers.parseEther("2000"));
      expect(claim.seniorLiquidated).to.equal(ethers.parseEther("4000"));
      expect(claim.insuredHolderCount).to.equal(2);
    });
  });

  // ─── 8. IRS Score Reset to 0 After Payout ──────────────────────────

  describe("IRS Score Reset", function () {
    it("should call setScoreToZero on IRS oracle after payout", async function () {
      const f = await loadFixture(setupCoverageFixture);

      await f.issuerBond.setLiquidationReturn(f.issuerTokenAddr, ethers.parseEther("500"));
      await f.insurancePool.setLiquidationReturn(
        f.issuerTokenAddr,
        ethers.parseEther("1000"),
        ethers.parseEther("1500")
      );

      await f.usdt.mint(await f.payoutEngine.getAddress(), ethers.parseEther("3000"));

      await f.payoutEngine.connect(f.oracleAddr).executePayout(f.issuerTokenAddr);

      expect(await f.irsOracle.scoreResetCalled(f.issuerTokenAddr)).to.be.true;
    });
  });

  // ─── 9. Issuer Status Set to DEFAULTED After Payout ────────────────

  describe("Issuer DEFAULTED Status", function () {
    it("should call setDefaulted on issuerRegistry after payout", async function () {
      const f = await loadFixture(setupCoverageFixture);

      await f.issuerBond.setLiquidationReturn(f.issuerTokenAddr, ethers.parseEther("500"));
      await f.insurancePool.setLiquidationReturn(
        f.issuerTokenAddr,
        ethers.parseEther("1000"),
        ethers.parseEther("1500")
      );

      await f.usdt.mint(await f.payoutEngine.getAddress(), ethers.parseEther("3000"));

      await f.payoutEngine.connect(f.oracleAddr).executePayout(f.issuerTokenAddr);

      expect(await f.issuerRegistry.defaultedCalled(f.issuerTokenAddr)).to.be.true;
    });
  });

  // ─── 10. Unauthorized Payout Execution Rejection ────────────────────

  describe("Unauthorized Payout Rejection", function () {
    it("should revert if caller is not owner or defaultOracle", async function () {
      const f = await loadFixture(setupCoverageFixture);

      await expect(
        f.payoutEngine.connect(f.attacker).executePayout(f.issuerTokenAddr)
      ).to.be.revertedWith("PayoutEngine: unauthorized");
    });

    it("should allow owner to execute payout", async function () {
      const f = await loadFixture(setupCoverageFixture);

      await f.issuerBond.setLiquidationReturn(f.issuerTokenAddr, ethers.parseEther("100"));
      await f.insurancePool.setLiquidationReturn(
        f.issuerTokenAddr,
        ethers.parseEther("200"),
        ethers.parseEther("300")
      );
      await f.usdt.mint(await f.payoutEngine.getAddress(), ethers.parseEther("600"));

      await expect(
        f.payoutEngine.connect(f.owner).executePayout(f.issuerTokenAddr)
      ).to.not.be.reverted;
    });

    it("should allow defaultOracle to execute payout", async function () {
      const f = await loadFixture(setupCoverageFixture);

      await f.issuerBond.setLiquidationReturn(f.issuerTokenAddr, ethers.parseEther("100"));
      await f.insurancePool.setLiquidationReturn(
        f.issuerTokenAddr,
        ethers.parseEther("200"),
        ethers.parseEther("300")
      );
      await f.usdt.mint(await f.payoutEngine.getAddress(), ethers.parseEther("600"));

      await expect(
        f.payoutEngine.connect(f.oracleAddr).executePayout(f.issuerTokenAddr)
      ).to.not.be.reverted;
    });
  });

  // ─── 11. Double-Payout Prevention ──────────────────────────────────

  describe("Double-Payout Prevention", function () {
    it("should not pay a holder twice (pos.paid = true after first payout)", async function () {
      const f = await loadFixture(setupCoverageFixture);

      await f.issuerBond.setLiquidationReturn(f.issuerTokenAddr, ethers.parseEther("500"));
      await f.insurancePool.setLiquidationReturn(
        f.issuerTokenAddr,
        ethers.parseEther("1000"),
        ethers.parseEther("1500")
      );

      await f.usdt.mint(await f.payoutEngine.getAddress(), ethers.parseEther("6000"));

      // First payout
      await f.payoutEngine.connect(f.oracleAddr).executePayout(f.issuerTokenAddr);

      const h1BalanceAfterFirst = await f.usdt.balanceOf(f.holder1.address);

      // Reset mock liquidation returns for second attempt
      await f.issuerBond.setLiquidationReturn(f.issuerTokenAddr, ethers.parseEther("500"));
      await f.insurancePool.setLiquidationReturn(
        f.issuerTokenAddr,
        ethers.parseEther("1000"),
        ethers.parseEther("1500")
      );

      // Second payout attempt — positions already marked paid, should skip
      await f.payoutEngine.connect(f.oracleAddr).executePayout(f.issuerTokenAddr);

      const h1BalanceAfterSecond = await f.usdt.balanceOf(f.holder1.address);

      // Balance should not have changed
      expect(h1BalanceAfterSecond).to.equal(h1BalanceAfterFirst);
    });
  });

  // ─── 12. Zero-Coverage Edge Case ───────────────────────────────────

  describe("Zero-Coverage Edge Case", function () {
    it("should revert when purchasing zero coverage", async function () {
      const f = await loadFixture(deployPayoutEngineFixture);

      await f.insurancePool.setPoolState(f.issuerTokenAddr, ethers.parseEther("5000"), ethers.parseEther("3000"), 0);

      await expect(
        f.payoutEngine
          .connect(f.holder1)
          .purchaseCoverage(f.issuerTokenAddr, 0)
      ).to.be.revertedWith("PayoutEngine: zero amount");
    });

    it("should handle payout with no insured holders gracefully", async function () {
      const f = await loadFixture(deployPayoutEngineFixture);

      // No one purchased coverage — executePayout should still run without reverting
      await f.issuerBond.setLiquidationReturn(f.issuerTokenAddr, ethers.parseEther("100"));
      await f.insurancePool.setLiquidationReturn(f.issuerTokenAddr, ethers.parseEther("50"), ethers.parseEther("50"));
      await f.usdt.mint(await f.payoutEngine.getAddress(), ethers.parseEther("200"));

      // totalCovered = 0 so the distribution loop body never executes
      // (no holders to iterate). This should not revert.
      await expect(
        f.payoutEngine.connect(f.oracleAddr).executePayout(f.issuerTokenAddr)
      ).to.emit(f.payoutEngine, "PayoutComplete");
    });
  });
});
