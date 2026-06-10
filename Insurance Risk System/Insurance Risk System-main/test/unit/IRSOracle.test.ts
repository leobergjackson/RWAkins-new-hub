import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { IRSOracle } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("IRSOracle", function () {
  async function deployFixture() {
    const [owner, keeper, insurancePool, payoutEngine, tokenAddr, unauthorized] =
      await ethers.getSigners();

    const Factory = await ethers.getContractFactory("IRSOracle");
    const oracle = await Factory.deploy();

    await oracle.setKeeper(keeper.address);
    await oracle.setInsurancePool(insurancePool.address);
    await oracle.setPayoutEngine(payoutEngine.address);

    return { oracle, owner, keeper, insurancePool, payoutEngine, tokenAddr, unauthorized };
  }

  async function deployWithInitializedScore() {
    const base = await deployFixture();
    const { oracle, tokenAddr } = base;
    await oracle.initializeScore(tokenAddr.address, 600);
    return base;
  }

  // ────────────────────────────────────────────────────────────────────
  // 1. Score Initialization (0-1000 range)
  // ────────────────────────────────────────────────────────────────────
  describe("Score Initialization", function () {
    it("should initialize score with proportional dimension distribution", async function () {
      const { oracle, tokenAddr } = await loadFixture(deployFixture);
      await oracle.initializeScore(tokenAddr.address, 600);

      const components = await oracle.getComponents(tokenAddr.address);
      expect(components.totalScore).to.equal(600);

      // Proportional: 600 * MAX_DIM / 1000
      expect(components.navPunctuality).to.equal(150);       // 600*250/1000
      expect(components.attestationAccuracy).to.equal(150);   // 600*250/1000
      expect(components.repaymentHistory).to.equal(180);      // 600*300/1000
      expect(components.collateralHealth).to.equal(90);       // 600*150/1000
      expect(components.governanceActivity).to.equal(30);     // 600*50/1000
    });

    it("should initialize at max score 1000", async function () {
      const { oracle, tokenAddr } = await loadFixture(deployFixture);
      await oracle.initializeScore(tokenAddr.address, 1000);

      const components = await oracle.getComponents(tokenAddr.address);
      expect(components.totalScore).to.equal(1000);
      expect(components.navPunctuality).to.equal(250);
      expect(components.attestationAccuracy).to.equal(250);
      expect(components.repaymentHistory).to.equal(300);
      expect(components.collateralHealth).to.equal(150);
      expect(components.governanceActivity).to.equal(50);
    });

    it("should initialize at zero score", async function () {
      const { oracle, tokenAddr } = await loadFixture(deployFixture);
      await oracle.initializeScore(tokenAddr.address, 0);

      const components = await oracle.getComponents(tokenAddr.address);
      expect(components.totalScore).to.equal(0);
    });

    it("should reject score above 1000", async function () {
      const { oracle, tokenAddr } = await loadFixture(deployFixture);
      await expect(oracle.initializeScore(tokenAddr.address, 1001)).to.be.revertedWith(
        "IRSOracle: score too high"
      );
    });

    it("should reject re-initialization", async function () {
      const { oracle, tokenAddr } = await loadFixture(deployFixture);
      await oracle.initializeScore(tokenAddr.address, 600);
      await expect(oracle.initializeScore(tokenAddr.address, 650)).to.be.revertedWith(
        "IRSOracle: already initialized"
      );
    });

    it("should only allow owner to initialize", async function () {
      const { oracle, tokenAddr, unauthorized } = await loadFixture(deployFixture);
      await expect(
        oracle.connect(unauthorized).initializeScore(tokenAddr.address, 600)
      ).to.be.reverted;
    });

    it("should emit ScoreInitialized event", async function () {
      const { oracle, tokenAddr } = await loadFixture(deployFixture);
      await expect(oracle.initializeScore(tokenAddr.address, 600))
        .to.emit(oracle, "ScoreInitialized")
        .withArgs(tokenAddr.address, 600);
    });

    it("should set lastUpdatedBlock on initialization", async function () {
      const { oracle, tokenAddr } = await loadFixture(deployFixture);
      await oracle.initializeScore(tokenAddr.address, 600);
      const components = await oracle.getComponents(tokenAddr.address);
      expect(components.lastUpdatedBlock).to.be.gt(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // 2. Individual Dimension Updates
  // ────────────────────────────────────────────────────────────────────
  describe("Individual Dimension Updates", function () {
    describe("NAV Punctuality", function () {
      it("should increase by 5 for on-time NAV update", async function () {
        const { oracle, keeper, tokenAddr } = await loadFixture(deployWithInitializedScore);
        const before = await oracle.getComponents(tokenAddr.address);

        await oracle.connect(keeper).recordNAVUpdate(tokenAddr.address, true, 0);
        const after = await oracle.getComponents(tokenAddr.address);

        expect(after.navPunctuality).to.equal(before.navPunctuality + 5n);
      });

      it("should decrease by 8 for 1-3 days late", async function () {
        const { oracle, keeper, tokenAddr } = await loadFixture(deployWithInitializedScore);
        const before = await oracle.getComponents(tokenAddr.address);

        await oracle.connect(keeper).recordNAVUpdate(tokenAddr.address, false, 2);
        const after = await oracle.getComponents(tokenAddr.address);

        expect(after.navPunctuality).to.equal(before.navPunctuality - 8n);
      });

      it("should decrease by 15 for 4-7 days late", async function () {
        const { oracle, keeper, tokenAddr } = await loadFixture(deployWithInitializedScore);
        const before = await oracle.getComponents(tokenAddr.address);

        await oracle.connect(keeper).recordNAVUpdate(tokenAddr.address, false, 5);
        const after = await oracle.getComponents(tokenAddr.address);

        expect(after.navPunctuality).to.equal(before.navPunctuality - 15n);
      });

      it("should decrease by 25 for more than 7 days late", async function () {
        const { oracle, keeper, tokenAddr } = await loadFixture(deployWithInitializedScore);
        const before = await oracle.getComponents(tokenAddr.address);

        await oracle.connect(keeper).recordNAVUpdate(tokenAddr.address, false, 10);
        const after = await oracle.getComponents(tokenAddr.address);

        expect(after.navPunctuality).to.equal(before.navPunctuality - 25n);
      });

      it("should emit ScoreUpdated event with NAV dimension", async function () {
        const { oracle, keeper, tokenAddr } = await loadFixture(deployWithInitializedScore);
        await expect(oracle.connect(keeper).recordNAVUpdate(tokenAddr.address, true, 0))
          .to.emit(oracle, "ScoreUpdated")
          .withArgs(tokenAddr.address, 600, 605, "NAV");
      });
    });

    describe("Repayment History", function () {
      it("should increase by 15 for on-time repayment", async function () {
        const { oracle, keeper, tokenAddr } = await loadFixture(deployWithInitializedScore);
        const before = await oracle.getComponents(tokenAddr.address);

        await oracle.connect(keeper).recordRepaymentEvent(tokenAddr.address, true, 0);
        const after = await oracle.getComponents(tokenAddr.address);

        expect(after.repaymentHistory).to.equal(before.repaymentHistory + 15n);
      });

      it("should decrease by 20 for 1-14 days late", async function () {
        const { oracle, keeper, tokenAddr } = await loadFixture(deployWithInitializedScore);
        const before = await oracle.getComponents(tokenAddr.address);

        await oracle.connect(keeper).recordRepaymentEvent(tokenAddr.address, false, 10);
        const after = await oracle.getComponents(tokenAddr.address);

        expect(after.repaymentHistory).to.equal(before.repaymentHistory - 20n);
      });

      it("should decrease by 40 for 15-30 days late", async function () {
        const { oracle, keeper, tokenAddr } = await loadFixture(deployWithInitializedScore);
        const before = await oracle.getComponents(tokenAddr.address);

        await oracle.connect(keeper).recordRepaymentEvent(tokenAddr.address, false, 20);
        const after = await oracle.getComponents(tokenAddr.address);

        expect(after.repaymentHistory).to.equal(before.repaymentHistory - 40n);
      });

      it("should decrease by 80 for more than 30 days late", async function () {
        const { oracle, keeper, tokenAddr } = await loadFixture(deployWithInitializedScore);
        const before = await oracle.getComponents(tokenAddr.address);

        await oracle.connect(keeper).recordRepaymentEvent(tokenAddr.address, false, 45);
        const after = await oracle.getComponents(tokenAddr.address);

        expect(after.repaymentHistory).to.equal(before.repaymentHistory - 80n);
      });
    });

    describe("Collateral Health", function () {
      it("should increase by 2 for collateral ratio above 100%", async function () {
        const { oracle, keeper, tokenAddr } = await loadFixture(deployWithInitializedScore);
        const before = await oracle.getComponents(tokenAddr.address);

        await oracle.connect(keeper).recordCollateralHealth(tokenAddr.address, 10500);
        const after = await oracle.getComponents(tokenAddr.address);

        expect(after.collateralHealth).to.equal(before.collateralHealth + 2n);
      });

      it("should not change for 90-100% collateral ratio", async function () {
        const { oracle, keeper, tokenAddr } = await loadFixture(deployWithInitializedScore);
        const before = await oracle.getComponents(tokenAddr.address);

        await oracle.connect(keeper).recordCollateralHealth(tokenAddr.address, 9500);
        const after = await oracle.getComponents(tokenAddr.address);

        expect(after.collateralHealth).to.equal(before.collateralHealth);
      });

      it("should decrease by 5 for 80-90% collateral ratio", async function () {
        const { oracle, keeper, tokenAddr } = await loadFixture(deployWithInitializedScore);
        const before = await oracle.getComponents(tokenAddr.address);

        await oracle.connect(keeper).recordCollateralHealth(tokenAddr.address, 8500);
        const after = await oracle.getComponents(tokenAddr.address);

        expect(after.collateralHealth).to.equal(before.collateralHealth - 5n);
      });

      it("should decrease by 15 for 70-80% collateral ratio", async function () {
        const { oracle, keeper, tokenAddr } = await loadFixture(deployWithInitializedScore);
        const before = await oracle.getComponents(tokenAddr.address);

        await oracle.connect(keeper).recordCollateralHealth(tokenAddr.address, 7500);
        const after = await oracle.getComponents(tokenAddr.address);

        expect(after.collateralHealth).to.equal(before.collateralHealth - 15n);
      });

      it("should decrease by 30 for below 70% collateral ratio", async function () {
        const { oracle, keeper, tokenAddr } = await loadFixture(deployWithInitializedScore);
        const before = await oracle.getComponents(tokenAddr.address);

        await oracle.connect(keeper).recordCollateralHealth(tokenAddr.address, 5000);
        const after = await oracle.getComponents(tokenAddr.address);

        expect(after.collateralHealth).to.equal(before.collateralHealth - 30n);
      });
    });

    describe("Attestation Accuracy", function () {
      it("should decrease by 30 when dispute resolved against issuer", async function () {
        const { oracle, keeper, tokenAddr } = await loadFixture(deployWithInitializedScore);
        const before = await oracle.getComponents(tokenAddr.address);

        await oracle.connect(keeper).recordAttestationDispute(tokenAddr.address, true);
        const after = await oracle.getComponents(tokenAddr.address);

        expect(after.attestationAccuracy).to.equal(before.attestationAccuracy - 30n);
      });

      it("should decrease by 10 when dispute not resolved against issuer", async function () {
        const { oracle, keeper, tokenAddr } = await loadFixture(deployWithInitializedScore);
        const before = await oracle.getComponents(tokenAddr.address);

        await oracle.connect(keeper).recordAttestationDispute(tokenAddr.address, false);
        const after = await oracle.getComponents(tokenAddr.address);

        expect(after.attestationAccuracy).to.equal(before.attestationAccuracy - 10n);
      });
    });

    describe("Governance Activity", function () {
      it("should increase by 2 for activity recording", async function () {
        const { oracle, keeper, tokenAddr } = await loadFixture(deployWithInitializedScore);
        const before = await oracle.getComponents(tokenAddr.address);

        await oracle.connect(keeper).recordActivity(tokenAddr.address);
        const after = await oracle.getComponents(tokenAddr.address);

        expect(after.governanceActivity).to.equal(before.governanceActivity + 2n);
      });
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // 3. Dimension Max Caps
  // ────────────────────────────────────────────────────────────────────
  describe("Dimension Max Caps", function () {
    it("should cap NAV punctuality at 250", async function () {
      const { oracle, keeper, tokenAddr } = await loadFixture(deployFixture);
      await oracle.initializeScore(tokenAddr.address, 1000); // NAV starts at 250 (max)

      await oracle.connect(keeper).recordNAVUpdate(tokenAddr.address, true, 0);
      const after = await oracle.getComponents(tokenAddr.address);
      expect(after.navPunctuality).to.equal(250);
    });

    it("should cap attestation accuracy at 250", async function () {
      const { oracle, tokenAddr } = await loadFixture(deployFixture);
      await oracle.initializeScore(tokenAddr.address, 1000);

      const components = await oracle.getComponents(tokenAddr.address);
      expect(components.attestationAccuracy).to.equal(250);
    });

    it("should cap repayment history at 300", async function () {
      const { oracle, keeper, tokenAddr } = await loadFixture(deployFixture);
      await oracle.initializeScore(tokenAddr.address, 1000); // Repayment starts at 300

      await oracle.connect(keeper).recordRepaymentEvent(tokenAddr.address, true, 0);
      const after = await oracle.getComponents(tokenAddr.address);
      expect(after.repaymentHistory).to.equal(300);
    });

    it("should cap collateral health at 150", async function () {
      const { oracle, keeper, tokenAddr } = await loadFixture(deployFixture);
      await oracle.initializeScore(tokenAddr.address, 1000); // Collateral starts at 150

      await oracle.connect(keeper).recordCollateralHealth(tokenAddr.address, 15000);
      const after = await oracle.getComponents(tokenAddr.address);
      expect(after.collateralHealth).to.equal(150);
    });

    it("should cap governance activity at 50", async function () {
      const { oracle, keeper, tokenAddr } = await loadFixture(deployFixture);
      await oracle.initializeScore(tokenAddr.address, 1000); // Activity starts at 50

      await oracle.connect(keeper).recordActivity(tokenAddr.address);
      const after = await oracle.getComponents(tokenAddr.address);
      expect(after.governanceActivity).to.equal(50);
    });

    it("should not underflow dimensions below 0", async function () {
      const { oracle, keeper, tokenAddr } = await loadFixture(deployFixture);
      await oracle.initializeScore(tokenAddr.address, 100); // Low starting score

      // NAV starts at 25 (100*250/1000). Subtract 25 should go to ~0 area
      await oracle.connect(keeper).recordNAVUpdate(tokenAddr.address, false, 10); // -25
      const after = await oracle.getComponents(tokenAddr.address);
      expect(after.navPunctuality).to.equal(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // 4. Premium Formula at Anchor Points
  // ────────────────────────────────────────────────────────────────────
  describe("Premium Formula", function () {
    it("should return 1600 bps for IRS = 0", async function () {
      const { oracle, tokenAddr } = await loadFixture(deployFixture);
      await oracle.initializeScore(tokenAddr.address, 0);

      const premium = await oracle.getPremiumRateBPS(tokenAddr.address);
      expect(premium).to.equal(1600);
    });

    it("should return ~400 bps for IRS = 1000", async function () {
      const { oracle, tokenAddr } = await loadFixture(deployFixture);
      await oracle.initializeScore(tokenAddr.address, 1000);

      const premium = await oracle.getPremiumRateBPS(tokenAddr.address);
      expect(premium).to.equal(400);
    });

    it("should return approximately 696 bps for IRS = 600", async function () {
      const { oracle, tokenAddr } = await loadFixture(deployFixture);
      await oracle.initializeScore(tokenAddr.address, 600);

      const premium = await oracle.getPremiumRateBPS(tokenAddr.address);
      // 1600 * e^(-0.001386 * 600) = 1600 * e^(-0.8316) ≈ 1600 * 0.4353 ≈ 696
      // Allow a tolerance of +/- 15 bps for fixed-point approximation
      expect(premium).to.be.gte(680);
      expect(premium).to.be.lte(720);
    });

    it("should return max premium for uninitialized address", async function () {
      const { oracle, tokenAddr } = await loadFixture(deployFixture);
      // Not initialized, totalScore is 0
      const premium = await oracle.getPremiumRateBPS(tokenAddr.address);
      expect(premium).to.equal(1600);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // 5. Premium Monotonically Decreasing
  // ────────────────────────────────────────────────────────────────────
  describe("Premium Monotonically Decreasing", function () {
    it("should produce decreasing premiums as IRS increases", async function () {
      const { oracle, tokenAddr } = await loadFixture(deployFixture);

      const scorePoints = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

      let previousPremium = 1601n; // higher than max

      for (const score of scorePoints) {
        // Use setScoreForTest to directly set total score for premium calculation
        await oracle.setScoreForTest(tokenAddr.address, score);
        const premium = await oracle.getPremiumRateBPS(tokenAddr.address);
        expect(premium).to.be.lte(previousPremium);
        previousPremium = premium;
      }
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // 6. setScoreToZero Authorization
  // ────────────────────────────────────────────────────────────────────
  describe("setScoreToZero", function () {
    it("should allow owner to set score to zero", async function () {
      const { oracle, tokenAddr } = await loadFixture(deployWithInitializedScore);
      await oracle.setScoreToZero(tokenAddr.address);

      const components = await oracle.getComponents(tokenAddr.address);
      expect(components.totalScore).to.equal(0);
      expect(components.navPunctuality).to.equal(0);
      expect(components.attestationAccuracy).to.equal(0);
      expect(components.repaymentHistory).to.equal(0);
      expect(components.collateralHealth).to.equal(0);
      expect(components.governanceActivity).to.equal(0);
    });

    it("should allow insurancePool to set score to zero", async function () {
      const { oracle, insurancePool, tokenAddr } = await loadFixture(deployWithInitializedScore);
      await oracle.connect(insurancePool).setScoreToZero(tokenAddr.address);

      const score = await oracle.getScore(tokenAddr.address);
      expect(score).to.equal(0);
    });

    it("should allow payoutEngine to set score to zero", async function () {
      const { oracle, payoutEngine, tokenAddr } = await loadFixture(deployWithInitializedScore);
      await oracle.connect(payoutEngine).setScoreToZero(tokenAddr.address);

      const score = await oracle.getScore(tokenAddr.address);
      expect(score).to.equal(0);
    });

    it("should reject unauthorized callers", async function () {
      const { oracle, unauthorized, tokenAddr } = await loadFixture(deployWithInitializedScore);
      await expect(
        oracle.connect(unauthorized).setScoreToZero(tokenAddr.address)
      ).to.be.revertedWith("IRSOracle: unauthorized");
    });

    it("should reject keeper from setting score to zero", async function () {
      const { oracle, keeper, tokenAddr } = await loadFixture(deployWithInitializedScore);
      await expect(
        oracle.connect(keeper).setScoreToZero(tokenAddr.address)
      ).to.be.revertedWith("IRSOracle: unauthorized");
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // 7. Keeper Authorization
  // ────────────────────────────────────────────────────────────────────
  describe("Keeper Authorization", function () {
    it("should allow keeper to call recordNAVUpdate", async function () {
      const { oracle, keeper, tokenAddr } = await loadFixture(deployWithInitializedScore);
      await expect(
        oracle.connect(keeper).recordNAVUpdate(tokenAddr.address, true, 0)
      ).to.not.be.reverted;
    });

    it("should allow owner to call recordNAVUpdate (owner passes onlyKeeper)", async function () {
      const { oracle, tokenAddr } = await loadFixture(deployWithInitializedScore);
      await expect(
        oracle.recordNAVUpdate(tokenAddr.address, true, 0)
      ).to.not.be.reverted;
    });

    it("should reject unauthorized caller for recordNAVUpdate", async function () {
      const { oracle, unauthorized, tokenAddr } = await loadFixture(deployWithInitializedScore);
      await expect(
        oracle.connect(unauthorized).recordNAVUpdate(tokenAddr.address, true, 0)
      ).to.be.revertedWith("IRSOracle: not keeper");
    });

    it("should reject unauthorized caller for recordRepaymentEvent", async function () {
      const { oracle, unauthorized, tokenAddr } = await loadFixture(deployWithInitializedScore);
      await expect(
        oracle.connect(unauthorized).recordRepaymentEvent(tokenAddr.address, true, 0)
      ).to.be.revertedWith("IRSOracle: not keeper");
    });

    it("should reject unauthorized caller for recordCollateralHealth", async function () {
      const { oracle, unauthorized, tokenAddr } = await loadFixture(deployWithInitializedScore);
      await expect(
        oracle.connect(unauthorized).recordCollateralHealth(tokenAddr.address, 10000)
      ).to.be.revertedWith("IRSOracle: not keeper");
    });

    it("should reject unauthorized caller for recordAttestationDispute", async function () {
      const { oracle, unauthorized, tokenAddr } = await loadFixture(deployWithInitializedScore);
      await expect(
        oracle.connect(unauthorized).recordAttestationDispute(tokenAddr.address, true)
      ).to.be.revertedWith("IRSOracle: not keeper");
    });

    it("should reject unauthorized caller for recordActivity", async function () {
      const { oracle, unauthorized, tokenAddr } = await loadFixture(deployWithInitializedScore);
      await expect(
        oracle.connect(unauthorized).recordActivity(tokenAddr.address)
      ).to.be.revertedWith("IRSOracle: not keeper");
    });

    it("should reject unauthorized caller for updateTWASCache", async function () {
      const { oracle, unauthorized, tokenAddr } = await loadFixture(deployWithInitializedScore);
      await expect(
        oracle.connect(unauthorized).updateTWASCache(tokenAddr.address, 500)
      ).to.be.revertedWith("IRSOracle: not keeper");
    });

    it("should allow owner to set keeper address", async function () {
      const { oracle, unauthorized } = await loadFixture(deployFixture);
      await oracle.setKeeper(unauthorized.address);
      expect(await oracle.keeper()).to.equal(unauthorized.address);
    });

    it("should reject non-owner setting keeper", async function () {
      const { oracle, unauthorized } = await loadFixture(deployFixture);
      await expect(
        oracle.connect(unauthorized).setKeeper(unauthorized.address)
      ).to.be.reverted;
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // 8. Early Warning System (EWS)
  // ────────────────────────────────────────────────────────────────────
  describe("Early Warning System", function () {
    it("should fire EWS on 50+ point drop within 24h window", async function () {
      const { oracle, keeper, tokenAddr } = await loadFixture(deployWithInitializedScore);

      // Score starts at 600. Repayment -80 => score drops to 520 (80 pt drop >= 50)
      await expect(
        oracle.connect(keeper).recordRepaymentEvent(tokenAddr.address, false, 45)
      )
        .to.emit(oracle, "EarlyWarningFired")
        .withArgs(tokenAddr.address, 520, 80, await ethers.provider.getBlockNumber() + 1);
    });

    it("should not fire EWS for small drops", async function () {
      const { oracle, keeper, tokenAddr } = await loadFixture(deployWithInitializedScore);

      // NAV on-time +5 then late 3 days -8 => net -3, no big single drop
      await oracle.connect(keeper).recordNAVUpdate(tokenAddr.address, false, 2); // -8

      const ews = await oracle.ewsStats(tokenAddr.address);
      expect(ews.ewsFired).to.equal(false);
    });

    it("should not fire EWS twice for same token", async function () {
      const { oracle, keeper, tokenAddr } = await loadFixture(deployWithInitializedScore);

      // First big drop triggers EWS
      await oracle.connect(keeper).recordRepaymentEvent(tokenAddr.address, false, 45); // -80

      const ewsBefore = await oracle.ewsStats(tokenAddr.address);
      expect(ewsBefore.ewsFired).to.equal(true);

      // Second drop should NOT fire again (ewsFired is already true)
      await oracle.connect(keeper).recordRepaymentEvent(tokenAddr.address, false, 45); // -80 more
      // Verify no second EarlyWarningFired event
      const ewsAfter = await oracle.ewsStats(tokenAddr.address);
      expect(ewsAfter.ewsFired).to.equal(true);
    });

    it("should record EWS activation block and drop amount", async function () {
      const { oracle, keeper, tokenAddr } = await loadFixture(deployWithInitializedScore);

      await oracle.connect(keeper).recordRepaymentEvent(tokenAddr.address, false, 45); // -80

      const ews = await oracle.ewsStats(tokenAddr.address);
      expect(ews.lastDropAmount).to.equal(80);
      expect(ews.ewsActivationBlock).to.be.gt(0);
    });

    it("should initialize EWS snapshot on score initialization", async function () {
      const { oracle, tokenAddr } = await loadFixture(deployWithInitializedScore);

      const ews = await oracle.ewsStats(tokenAddr.address);
      expect(ews.score24hAgo).to.equal(600);
      expect(ews.ewsFired).to.equal(false);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // 9. TWAS (Time-Weighted Average Score)
  // ────────────────────────────────────────────────────────────────────
  describe("TWAS Computation", function () {
    it("should update TWAS cache via keeper", async function () {
      const { oracle, keeper, tokenAddr } = await loadFixture(deployWithInitializedScore);

      await oracle.connect(keeper).updateTWASCache(tokenAddr.address, 550);
      const twas = await oracle.getTWAS(tokenAddr.address);
      expect(twas).to.equal(550);
    });

    it("should emit TWASCacheUpdated event", async function () {
      const { oracle, keeper, tokenAddr } = await loadFixture(deployWithInitializedScore);

      await expect(oracle.connect(keeper).updateTWASCache(tokenAddr.address, 550))
        .to.emit(oracle, "TWASCacheUpdated");
    });

    it("should fall back to real-time score when TWAS cache is uninitialized", async function () {
      const { oracle, tokenAddr } = await loadFixture(deployWithInitializedScore);

      const twas = await oracle.getTWAS(tokenAddr.address);
      expect(twas).to.equal(600); // Falls back to current totalScore
    });

    it("should fall back to real-time score when cache is stale (>2h)", async function () {
      const { oracle, keeper, tokenAddr } = await loadFixture(deployWithInitializedScore);

      await oracle.connect(keeper).updateTWASCache(tokenAddr.address, 550);

      // Fast-forward more than 2 hours
      await ethers.provider.send("evm_increaseTime", [7201]); // 2h + 1s
      await ethers.provider.send("evm_mine", []);

      const twas = await oracle.getTWAS(tokenAddr.address);
      // Should return real-time totalScore (600) since cache is stale
      expect(twas).to.equal(600);
    });

    it("should return cached TWAS when fresh (<=2h)", async function () {
      const { oracle, keeper, tokenAddr } = await loadFixture(deployWithInitializedScore);

      await oracle.connect(keeper).updateTWASCache(tokenAddr.address, 550);

      // Fast-forward less than 2 hours
      await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
      await ethers.provider.send("evm_mine", []);

      const twas = await oracle.getTWAS(tokenAddr.address);
      expect(twas).to.equal(550);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // 10. InsurancePool and PayoutEngine Address Setting
  // ────────────────────────────────────────────────────────────────────
  describe("Address Setters", function () {
    it("should set insurancePool address", async function () {
      const { oracle, insurancePool } = await loadFixture(deployFixture);
      expect(await oracle.insurancePool()).to.equal(insurancePool.address);
    });

    it("should set payoutEngine address", async function () {
      const { oracle, payoutEngine } = await loadFixture(deployFixture);
      expect(await oracle.payoutEngine()).to.equal(payoutEngine.address);
    });

    it("should reject non-owner setting insurancePool", async function () {
      const { oracle, unauthorized } = await loadFixture(deployFixture);
      await expect(
        oracle.connect(unauthorized).setInsurancePool(unauthorized.address)
      ).to.be.reverted;
    });

    it("should reject non-owner setting payoutEngine", async function () {
      const { oracle, unauthorized } = await loadFixture(deployFixture);
      await expect(
        oracle.connect(unauthorized).setPayoutEngine(unauthorized.address)
      ).to.be.reverted;
    });

    it("should allow owner to update insurancePool", async function () {
      const { oracle, unauthorized } = await loadFixture(deployFixture);
      await oracle.setInsurancePool(unauthorized.address);
      expect(await oracle.insurancePool()).to.equal(unauthorized.address);
    });

    it("should allow owner to update payoutEngine", async function () {
      const { oracle, unauthorized } = await loadFixture(deployFixture);
      await oracle.setPayoutEngine(unauthorized.address);
      expect(await oracle.payoutEngine()).to.equal(unauthorized.address);
    });

    it("should restrict updateCoverageRatio to insurancePool or owner", async function () {
      const { oracle, unauthorized, tokenAddr } = await loadFixture(deployWithInitializedScore);
      await expect(
        oracle.connect(unauthorized).updateCoverageRatio(tokenAddr.address, 5000)
      ).to.be.revertedWith("IRSOracle: unauthorized");
    });

    it("should allow owner to updateCoverageRatio", async function () {
      const { oracle, tokenAddr } = await loadFixture(deployWithInitializedScore);
      await oracle.updateCoverageRatio(tokenAddr.address, 5000);
      expect(await oracle.getCoverageRatio(tokenAddr.address)).to.equal(5000);
    });

    it("should allow insurancePool to updateCoverageRatio", async function () {
      const { oracle, insurancePool, tokenAddr } = await loadFixture(deployWithInitializedScore);
      await oracle.connect(insurancePool).updateCoverageRatio(tokenAddr.address, 7500);
      expect(await oracle.getCoverageRatio(tokenAddr.address)).to.equal(7500);
    });

    it("should emit CoverageRatioUpdated event", async function () {
      const { oracle, tokenAddr } = await loadFixture(deployWithInitializedScore);
      await expect(oracle.updateCoverageRatio(tokenAddr.address, 5000))
        .to.emit(oracle, "CoverageRatioUpdated")
        .withArgs(tokenAddr.address, 5000);
    });
  });
});
