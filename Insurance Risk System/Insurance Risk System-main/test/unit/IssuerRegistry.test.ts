import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture, mine } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("IssuerRegistry", function () {
  // Status enum values matching the contract
  const Status = {
    OBSERVATION: 0,
    ACTIVE: 1,
    MONITORING: 2,
    DEFAULTED: 3,
    WIND_DOWN: 4,
    CLOSED: 5,
  };

  async function deployFixture() {
    const [
      owner,
      issuerEOA,
      issuerEOA2,
      custodian,
      legalRep,
      auditor,
      defaultOracle,
      payoutEngine,
      randomUser,
    ] = await ethers.getSigners();

    // Deploy mock contracts for TIR, IssuerBond, IRSOracle
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");

    // Use simple addresses for TIR and IssuerBond (not called in the tests)
    const tirMock = await MockERC20Factory.deploy("TIR Mock", "TIR", 18);
    await tirMock.waitForDeployment();

    const bondMock = await MockERC20Factory.deploy("Bond Mock", "BOND", 18);
    await bondMock.waitForDeployment();

    const irsMock = await MockERC20Factory.deploy("IRS Mock", "IRS", 18);
    await irsMock.waitForDeployment();

    // Deploy IssuerRegistry
    const IssuerRegistryFactory = await ethers.getContractFactory("IssuerRegistry");
    const registry = await IssuerRegistryFactory.deploy(
      await tirMock.getAddress(),
      await bondMock.getAddress(),
      await irsMock.getAddress(),
      defaultOracle.address
    );
    await registry.waitForDeployment();

    // Set payoutEngine
    await registry.setPayoutEngine(payoutEngine.address);

    // Use a deterministic "token address" for issuer tokens
    const tokenAddress = ethers.Wallet.createRandom().address;
    const tokenAddress2 = ethers.Wallet.createRandom().address;

    return {
      registry,
      owner,
      issuerEOA,
      issuerEOA2,
      custodian,
      legalRep,
      auditor,
      defaultOracle,
      payoutEngine,
      randomUser,
      tokenAddress,
      tokenAddress2,
    };
  }

  // Helper: register a standard issuer
  async function registerStandard(
    registry: any,
    tokenAddress: string,
    issuerEOA: any,
    custodian: any,
    legalRep: any,
    auditor: any,
    marketCap = ethers.parseUnits("10000000", 18)
  ) {
    await registry
      .connect(issuerEOA)
      .register(tokenAddress, 1, custodian.address, legalRep.address, auditor.address, marketCap, false);
  }

  // Helper: register a fast-track issuer
  async function registerFastTrack(
    registry: any,
    tokenAddress: string,
    issuerEOA: any,
    custodian: any,
    legalRep: any,
    auditor: any,
    marketCap = ethers.parseUnits("10000000", 18)
  ) {
    await registry
      .connect(issuerEOA)
      .register(tokenAddress, 1, custodian.address, legalRep.address, auditor.address, marketCap, true);
  }

  // ───────────────────────────────────────────────────────────────────────
  // 1. Issuer Registration
  // ───────────────────────────────────────────────────────────────────────
  describe("Issuer Registration", function () {
    it("should register an issuer with correct parameters", async function () {
      const { registry, issuerEOA, custodian, legalRep, auditor, tokenAddress } =
        await loadFixture(deployFixture);

      const marketCap = ethers.parseUnits("5000000", 18);

      await expect(
        registry
          .connect(issuerEOA)
          .register(tokenAddress, 42, custodian.address, legalRep.address, auditor.address, marketCap, false)
      )
        .to.emit(registry, "IssuerRegistered")
        .withArgs(tokenAddress, issuerEOA.address, false, (v: any) => v > 0); // observationEndBlock > 0

      const profile = await registry.getProfile(tokenAddress);
      expect(profile.tokenAddress).to.equal(tokenAddress);
      expect(profile.status).to.equal(Status.OBSERVATION);
      expect(profile.issuerEOA).to.equal(issuerEOA.address);
      expect(profile.custodianAttestor).to.equal(custodian.address);
      expect(profile.legalAttestor).to.equal(legalRep.address);
      expect(profile.auditorAttestor).to.equal(auditor.address);
      expect(profile.marketCapAtRegistration).to.equal(marketCap);
      expect(profile.fastTrack).to.be.false;
      expect(profile.attestationCount).to.equal(0);
      expect(profile.registrationBlock).to.be.gt(0);
    });

    it("should set issuerOfToken mapping", async function () {
      const { registry, issuerEOA, custodian, legalRep, auditor, tokenAddress } =
        await loadFixture(deployFixture);

      await registerStandard(registry, tokenAddress, issuerEOA, custodian, legalRep, auditor);

      expect(await registry.issuerOfToken(tokenAddress)).to.equal(issuerEOA.address);
    });

    it("should reject zero token address", async function () {
      const { registry, issuerEOA, custodian, legalRep, auditor } =
        await loadFixture(deployFixture);

      await expect(
        registry
          .connect(issuerEOA)
          .register(ethers.ZeroAddress, 1, custodian.address, legalRep.address, auditor.address, 1000, false)
      ).to.be.revertedWith("IssuerRegistry: zero token");
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 2. Status Lifecycle
  // ───────────────────────────────────────────────────────────────────────
  describe("Status Lifecycle", function () {
    it("should transition OBSERVATION -> ACTIVE -> MONITORING -> DEFAULTED", async function () {
      const { registry, owner, issuerEOA, custodian, legalRep, auditor, defaultOracle, tokenAddress } =
        await loadFixture(deployFixture);

      // Register (OBSERVATION)
      await registerStandard(registry, tokenAddress, issuerEOA, custodian, legalRep, auditor);
      expect(await registry.getStatus(tokenAddress)).to.equal(Status.OBSERVATION);

      // Add attestations and advance blocks
      await registry.connect(owner).recordAttestation(tokenAddress);
      await registry.connect(owner).recordAttestation(tokenAddress);
      await registry.connect(owner).recordAttestation(tokenAddress);

      // Mine past observation end block (60 days * 28800 blocks/day)
      const BLOCKS_60_DAYS = 60 * 28800;
      await mine(BLOCKS_60_DAYS);

      // Activate (ACTIVE)
      await registry.tryActivateCoverage(tokenAddress);
      expect(await registry.getStatus(tokenAddress)).to.equal(Status.ACTIVE);
      expect(await registry.isActive(tokenAddress)).to.be.true;

      // Set monitoring (MONITORING)
      await registry.connect(defaultOracle).setMonitoring(tokenAddress);
      expect(await registry.getStatus(tokenAddress)).to.equal(Status.MONITORING);

      // Set defaulted (DEFAULTED)
      await registry.connect(defaultOracle).setDefaulted(tokenAddress);
      expect(await registry.getStatus(tokenAddress)).to.equal(Status.DEFAULTED);
      expect(await registry.isDefaulted(tokenAddress)).to.be.true;
    });

    it("should transition ACTIVE -> WIND_DOWN -> CLOSED", async function () {
      const { registry, owner, issuerEOA, custodian, legalRep, auditor, tokenAddress } =
        await loadFixture(deployFixture);

      await registerStandard(registry, tokenAddress, issuerEOA, custodian, legalRep, auditor);

      // Force activate for demo
      await registry.connect(owner).forceActivateForDemo(tokenAddress);
      expect(await registry.getStatus(tokenAddress)).to.equal(Status.ACTIVE);

      // Initiate wind-down
      await registry.connect(issuerEOA).initiateWindDown(tokenAddress, 100, 200);
      expect(await registry.getStatus(tokenAddress)).to.equal(Status.WIND_DOWN);

      // Advance past wind-down period (30 days)
      await time.increase(30 * 24 * 60 * 60 + 1);

      // Finalize wind-down
      await registry.finalizeWindDown(tokenAddress);
      expect(await registry.getStatus(tokenAddress)).to.equal(Status.CLOSED);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 3. Standard Onboarding (60 Day Observation)
  // ───────────────────────────────────────────────────────────────────────
  describe("Standard Onboarding", function () {
    it("should set observation end block at registration + 60 days of blocks", async function () {
      const { registry, issuerEOA, custodian, legalRep, auditor, tokenAddress } =
        await loadFixture(deployFixture);

      const txBlock = await ethers.provider.getBlockNumber();

      await registerStandard(registry, tokenAddress, issuerEOA, custodian, legalRep, auditor);

      const profile = await registry.getProfile(tokenAddress);
      // registrationBlock is txBlock + 1 (the block the tx was mined in)
      const expectedEnd = profile.registrationBlock + BigInt(60 * 28800);
      expect(profile.observationEndBlock).to.equal(expectedEnd);
      expect(profile.fastTrack).to.be.false;
    });

    it("should require 3 attestations for standard track", async function () {
      const { registry, owner, issuerEOA, custodian, legalRep, auditor, tokenAddress } =
        await loadFixture(deployFixture);

      await registerStandard(registry, tokenAddress, issuerEOA, custodian, legalRep, auditor);

      // Only 2 attestations
      await registry.connect(owner).recordAttestation(tokenAddress);
      await registry.connect(owner).recordAttestation(tokenAddress);

      await mine(60 * 28800);

      await expect(registry.tryActivateCoverage(tokenAddress)).to.be.revertedWith(
        "IssuerRegistry: insufficient attestations"
      );

      // Add third attestation
      await registry.connect(owner).recordAttestation(tokenAddress);
      await expect(registry.tryActivateCoverage(tokenAddress)).to.not.be.reverted;
    });

    it("should reject activation before observation period ends", async function () {
      const { registry, owner, issuerEOA, custodian, legalRep, auditor, tokenAddress } =
        await loadFixture(deployFixture);

      await registerStandard(registry, tokenAddress, issuerEOA, custodian, legalRep, auditor);

      await registry.connect(owner).recordAttestation(tokenAddress);
      await registry.connect(owner).recordAttestation(tokenAddress);
      await registry.connect(owner).recordAttestation(tokenAddress);

      // Don't mine enough blocks
      await mine(10);

      await expect(registry.tryActivateCoverage(tokenAddress)).to.be.revertedWith(
        "IssuerRegistry: observation not ended"
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 4. Fast Track Onboarding (14 Day Observation)
  // ───────────────────────────────────────────────────────────────────────
  describe("Fast Track Onboarding", function () {
    it("should set observation end block at registration + 14 days of blocks", async function () {
      const { registry, issuerEOA, custodian, legalRep, auditor, tokenAddress } =
        await loadFixture(deployFixture);

      await registerFastTrack(registry, tokenAddress, issuerEOA, custodian, legalRep, auditor);

      const profile = await registry.getProfile(tokenAddress);
      const expectedEnd = profile.registrationBlock + BigInt(14 * 28800);
      expect(profile.observationEndBlock).to.equal(expectedEnd);
      expect(profile.fastTrack).to.be.true;
    });

    it("should require only 2 attestations for fast track", async function () {
      const { registry, owner, issuerEOA, custodian, legalRep, auditor, tokenAddress } =
        await loadFixture(deployFixture);

      await registerFastTrack(registry, tokenAddress, issuerEOA, custodian, legalRep, auditor);

      // 1 attestation -- insufficient
      await registry.connect(owner).recordAttestation(tokenAddress);
      await mine(14 * 28800);
      await expect(registry.tryActivateCoverage(tokenAddress)).to.be.revertedWith(
        "IssuerRegistry: insufficient attestations"
      );

      // 2nd attestation -- sufficient
      await registry.connect(owner).recordAttestation(tokenAddress);
      await expect(registry.tryActivateCoverage(tokenAddress)).to.not.be.reverted;
    });

    it("should emit CoverageActivated with fast track IRS of 650", async function () {
      const { registry, owner, issuerEOA, custodian, legalRep, auditor, tokenAddress } =
        await loadFixture(deployFixture);

      await registerFastTrack(registry, tokenAddress, issuerEOA, custodian, legalRep, auditor);

      await registry.connect(owner).recordAttestation(tokenAddress);
      await registry.connect(owner).recordAttestation(tokenAddress);
      await mine(14 * 28800);

      await expect(registry.tryActivateCoverage(tokenAddress))
        .to.emit(registry, "CoverageActivated")
        .withArgs(tokenAddress, 650, (v: any) => v > 0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 5. Attestation Recording and Counting
  // ───────────────────────────────────────────────────────────────────────
  describe("Attestation Recording", function () {
    it("should increment attestation count on each call", async function () {
      const { registry, owner, issuerEOA, custodian, legalRep, auditor, tokenAddress } =
        await loadFixture(deployFixture);

      await registerStandard(registry, tokenAddress, issuerEOA, custodian, legalRep, auditor);

      await registry.connect(owner).recordAttestation(tokenAddress);
      let profile = await registry.getProfile(tokenAddress);
      expect(profile.attestationCount).to.equal(1);

      await registry.connect(owner).recordAttestation(tokenAddress);
      profile = await registry.getProfile(tokenAddress);
      expect(profile.attestationCount).to.equal(2);

      await registry.connect(owner).recordAttestation(tokenAddress);
      profile = await registry.getProfile(tokenAddress);
      expect(profile.attestationCount).to.equal(3);
    });

    it("should emit AttestationRecorded event", async function () {
      const { registry, owner, issuerEOA, custodian, legalRep, auditor, tokenAddress } =
        await loadFixture(deployFixture);

      await registerStandard(registry, tokenAddress, issuerEOA, custodian, legalRep, auditor);

      await expect(registry.connect(owner).recordAttestation(tokenAddress))
        .to.emit(registry, "AttestationRecorded")
        .withArgs(tokenAddress, 1);
    });

    it("should reject attestation recording for non-OBSERVATION status", async function () {
      const { registry, owner, issuerEOA, custodian, legalRep, auditor, tokenAddress } =
        await loadFixture(deployFixture);

      await registerStandard(registry, tokenAddress, issuerEOA, custodian, legalRep, auditor);
      await registry.connect(owner).forceActivateForDemo(tokenAddress);

      await expect(
        registry.connect(owner).recordAttestation(tokenAddress)
      ).to.be.revertedWith("IssuerRegistry: not in observation");
    });

    it("should reject attestation recording by non-owner", async function () {
      const { registry, issuerEOA, custodian, legalRep, auditor, tokenAddress } =
        await loadFixture(deployFixture);

      await registerStandard(registry, tokenAddress, issuerEOA, custodian, legalRep, auditor);

      await expect(
        registry.connect(issuerEOA).recordAttestation(tokenAddress)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 6. forceActivateForDemo
  // ───────────────────────────────────────────────────────────────────────
  describe("forceActivateForDemo", function () {
    it("should activate a registered issuer immediately", async function () {
      const { registry, owner, issuerEOA, custodian, legalRep, auditor, tokenAddress } =
        await loadFixture(deployFixture);

      await registerStandard(registry, tokenAddress, issuerEOA, custodian, legalRep, auditor);

      await expect(registry.connect(owner).forceActivateForDemo(tokenAddress))
        .to.emit(registry, "CoverageActivated")
        .to.emit(registry, "StatusChanged")
        .withArgs(tokenAddress, Status.ACTIVE);

      expect(await registry.isActive(tokenAddress)).to.be.true;
    });

    it("should reject for unregistered token", async function () {
      const { registry, owner, tokenAddress } = await loadFixture(deployFixture);

      await expect(
        registry.connect(owner).forceActivateForDemo(tokenAddress)
      ).to.be.revertedWith("IssuerRegistry: not registered");
    });

    it("should reject if called by non-owner", async function () {
      const { registry, issuerEOA, custodian, legalRep, auditor, tokenAddress } =
        await loadFixture(deployFixture);

      await registerStandard(registry, tokenAddress, issuerEOA, custodian, legalRep, auditor);

      await expect(
        registry.connect(issuerEOA).forceActivateForDemo(tokenAddress)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 7. setDefaulted by Authorized Callers
  // ───────────────────────────────────────────────────────────────────────
  describe("setDefaulted", function () {
    it("should allow defaultOracle to set defaulted", async function () {
      const { registry, owner, issuerEOA, custodian, legalRep, auditor, defaultOracle, tokenAddress } =
        await loadFixture(deployFixture);

      await registerStandard(registry, tokenAddress, issuerEOA, custodian, legalRep, auditor);
      await registry.connect(owner).forceActivateForDemo(tokenAddress);

      await expect(registry.connect(defaultOracle).setDefaulted(tokenAddress))
        .to.emit(registry, "StatusChanged")
        .withArgs(tokenAddress, Status.DEFAULTED);

      expect(await registry.isDefaulted(tokenAddress)).to.be.true;
    });

    it("should allow payoutEngine to set defaulted", async function () {
      const { registry, owner, issuerEOA, custodian, legalRep, auditor, payoutEngine, tokenAddress } =
        await loadFixture(deployFixture);

      await registerStandard(registry, tokenAddress, issuerEOA, custodian, legalRep, auditor);
      await registry.connect(owner).forceActivateForDemo(tokenAddress);

      await registry.connect(payoutEngine).setDefaulted(tokenAddress);
      expect(await registry.isDefaulted(tokenAddress)).to.be.true;
    });

    it("should allow owner to set defaulted", async function () {
      const { registry, owner, issuerEOA, custodian, legalRep, auditor, tokenAddress } =
        await loadFixture(deployFixture);

      await registerStandard(registry, tokenAddress, issuerEOA, custodian, legalRep, auditor);
      await registry.connect(owner).forceActivateForDemo(tokenAddress);

      await registry.connect(owner).setDefaulted(tokenAddress);
      expect(await registry.isDefaulted(tokenAddress)).to.be.true;
    });

    it("should reject setDefaulted by unauthorized caller", async function () {
      const { registry, owner, issuerEOA, custodian, legalRep, auditor, randomUser, tokenAddress } =
        await loadFixture(deployFixture);

      await registerStandard(registry, tokenAddress, issuerEOA, custodian, legalRep, auditor);
      await registry.connect(owner).forceActivateForDemo(tokenAddress);

      await expect(
        registry.connect(randomUser).setDefaulted(tokenAddress)
      ).to.be.revertedWith("IssuerRegistry: unauthorized");
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 8. Wind-Down Initiation and Challenge
  // ───────────────────────────────────────────────────────────────────────
  describe("Wind-Down", function () {
    it("should allow issuer to initiate wind-down when ACTIVE", async function () {
      const { registry, owner, issuerEOA, custodian, legalRep, auditor, tokenAddress } =
        await loadFixture(deployFixture);

      await registerStandard(registry, tokenAddress, issuerEOA, custodian, legalRep, auditor);
      await registry.connect(owner).forceActivateForDemo(tokenAddress);

      await expect(
        registry.connect(issuerEOA).initiateWindDown(tokenAddress, 10, 20)
      )
        .to.emit(registry, "WindDownInitiated")
        .to.emit(registry, "StatusChanged")
        .withArgs(tokenAddress, Status.WIND_DOWN);

      expect(await registry.getStatus(tokenAddress)).to.equal(Status.WIND_DOWN);
    });

    it("should reject wind-down from non-issuer EOA", async function () {
      const { registry, owner, issuerEOA, custodian, legalRep, auditor, randomUser, tokenAddress } =
        await loadFixture(deployFixture);

      await registerStandard(registry, tokenAddress, issuerEOA, custodian, legalRep, auditor);
      await registry.connect(owner).forceActivateForDemo(tokenAddress);

      await expect(
        registry.connect(randomUser).initiateWindDown(tokenAddress, 10, 20)
      ).to.be.revertedWith("IssuerRegistry: not issuer");
    });

    it("should reject wind-down when not ACTIVE", async function () {
      const { registry, issuerEOA, custodian, legalRep, auditor, tokenAddress } =
        await loadFixture(deployFixture);

      await registerStandard(registry, tokenAddress, issuerEOA, custodian, legalRep, auditor);
      // Still in OBSERVATION

      await expect(
        registry.connect(issuerEOA).initiateWindDown(tokenAddress, 10, 20)
      ).to.be.revertedWith("IssuerRegistry: not active");
    });

    it("should reject finalization before wind-down deadline", async function () {
      const { registry, owner, issuerEOA, custodian, legalRep, auditor, tokenAddress } =
        await loadFixture(deployFixture);

      await registerStandard(registry, tokenAddress, issuerEOA, custodian, legalRep, auditor);
      await registry.connect(owner).forceActivateForDemo(tokenAddress);
      await registry.connect(issuerEOA).initiateWindDown(tokenAddress, 10, 20);

      // Don't advance time
      await expect(registry.finalizeWindDown(tokenAddress)).to.be.revertedWith(
        "IssuerRegistry: challenge window open"
      );
    });

    it("should allow finalization after wind-down period", async function () {
      const { registry, owner, issuerEOA, custodian, legalRep, auditor, tokenAddress } =
        await loadFixture(deployFixture);

      await registerStandard(registry, tokenAddress, issuerEOA, custodian, legalRep, auditor);
      await registry.connect(owner).forceActivateForDemo(tokenAddress);
      await registry.connect(issuerEOA).initiateWindDown(tokenAddress, 10, 20);

      // Advance past 30 days
      await time.increase(30 * 24 * 60 * 60 + 1);

      await expect(registry.finalizeWindDown(tokenAddress))
        .to.emit(registry, "StatusChanged")
        .withArgs(tokenAddress, Status.CLOSED);

      expect(await registry.getStatus(tokenAddress)).to.equal(Status.CLOSED);
    });

    it("should store wind-down record correctly", async function () {
      const { registry, owner, issuerEOA, custodian, legalRep, auditor, tokenAddress } =
        await loadFixture(deployFixture);

      await registerStandard(registry, tokenAddress, issuerEOA, custodian, legalRep, auditor);
      await registry.connect(owner).forceActivateForDemo(tokenAddress);
      await registry.connect(issuerEOA).initiateWindDown(tokenAddress, 100, 200);

      const wd = await registry.windDowns(tokenAddress);
      expect(wd.custodianAttestUID).to.equal(100);
      expect(wd.legalAttestUID).to.equal(200);
      expect(wd.challenged).to.be.false;
      expect(wd.challenger).to.equal(ethers.ZeroAddress);
      expect(wd.deadline).to.be.gt(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 9. Duplicate Registration Rejection
  // ───────────────────────────────────────────────────────────────────────
  describe("Duplicate Registration", function () {
    it("should reject registering the same token twice", async function () {
      const { registry, issuerEOA, issuerEOA2, custodian, legalRep, auditor, tokenAddress } =
        await loadFixture(deployFixture);

      await registerStandard(registry, tokenAddress, issuerEOA, custodian, legalRep, auditor);

      await expect(
        registry
          .connect(issuerEOA2)
          .register(tokenAddress, 2, custodian.address, legalRep.address, auditor.address, 1000, false)
      ).to.be.revertedWith("IssuerRegistry: already registered");
    });

    it("should allow registering different tokens", async function () {
      const { registry, issuerEOA, custodian, legalRep, auditor, tokenAddress, tokenAddress2 } =
        await loadFixture(deployFixture);

      await registerStandard(registry, tokenAddress, issuerEOA, custodian, legalRep, auditor);

      await expect(
        registry
          .connect(issuerEOA)
          .register(tokenAddress2, 2, custodian.address, legalRep.address, auditor.address, 1000, false)
      ).to.not.be.reverted;
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 10. Integration with TIR Attestation Counts
  // ───────────────────────────────────────────────────────────────────────
  describe("TIR Attestation Integration", function () {
    it("should track attestation count that gates activation", async function () {
      const { registry, owner, issuerEOA, custodian, legalRep, auditor, tokenAddress } =
        await loadFixture(deployFixture);

      await registerStandard(registry, tokenAddress, issuerEOA, custodian, legalRep, auditor);

      // 0 attestations -- cannot activate
      await mine(60 * 28800);
      await expect(registry.tryActivateCoverage(tokenAddress)).to.be.revertedWith(
        "IssuerRegistry: insufficient attestations"
      );

      // Add exactly 3 attestations
      await registry.connect(owner).recordAttestation(tokenAddress);
      await registry.connect(owner).recordAttestation(tokenAddress);
      await registry.connect(owner).recordAttestation(tokenAddress);

      const profile = await registry.getProfile(tokenAddress);
      expect(profile.attestationCount).to.equal(3);

      // Now activation should succeed
      await expect(registry.tryActivateCoverage(tokenAddress)).to.not.be.reverted;
    });

    it("should use standard IRS of 600 for standard track activation", async function () {
      const { registry, owner, issuerEOA, custodian, legalRep, auditor, tokenAddress } =
        await loadFixture(deployFixture);

      await registerStandard(registry, tokenAddress, issuerEOA, custodian, legalRep, auditor);

      await registry.connect(owner).recordAttestation(tokenAddress);
      await registry.connect(owner).recordAttestation(tokenAddress);
      await registry.connect(owner).recordAttestation(tokenAddress);

      await mine(60 * 28800);

      await expect(registry.tryActivateCoverage(tokenAddress))
        .to.emit(registry, "CoverageActivated")
        .withArgs(tokenAddress, 600, (v: any) => v > 0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // Additional: setMonitoring access control
  // ───────────────────────────────────────────────────────────────────────
  describe("setMonitoring Access Control", function () {
    it("should reject setMonitoring by unauthorized caller", async function () {
      const { registry, owner, issuerEOA, custodian, legalRep, auditor, randomUser, tokenAddress } =
        await loadFixture(deployFixture);

      await registerStandard(registry, tokenAddress, issuerEOA, custodian, legalRep, auditor);
      await registry.connect(owner).forceActivateForDemo(tokenAddress);

      await expect(
        registry.connect(randomUser).setMonitoring(tokenAddress)
      ).to.be.revertedWith("IssuerRegistry: unauthorized");
    });

    it("should reject setMonitoring when not ACTIVE", async function () {
      const { registry, owner, issuerEOA, custodian, legalRep, auditor, defaultOracle, tokenAddress } =
        await loadFixture(deployFixture);

      await registerStandard(registry, tokenAddress, issuerEOA, custodian, legalRep, auditor);
      // Still in OBSERVATION

      await expect(
        registry.connect(defaultOracle).setMonitoring(tokenAddress)
      ).to.be.revertedWith("IssuerRegistry: not active");
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // View Function Helpers
  // ───────────────────────────────────────────────────────────────────────
  describe("View Functions", function () {
    it("should return correct issuer EOA", async function () {
      const { registry, issuerEOA, custodian, legalRep, auditor, tokenAddress } =
        await loadFixture(deployFixture);

      await registerStandard(registry, tokenAddress, issuerEOA, custodian, legalRep, auditor);
      expect(await registry.getIssuerEOA(tokenAddress)).to.equal(issuerEOA.address);
    });

    it("should return false for isActive on unregistered token", async function () {
      const { registry, tokenAddress } = await loadFixture(deployFixture);
      expect(await registry.isActive(tokenAddress)).to.be.false;
    });

    it("should return false for isDefaulted on unregistered token", async function () {
      const { registry, tokenAddress } = await loadFixture(deployFixture);
      expect(await registry.isDefaulted(tokenAddress)).to.be.false;
    });
  });
});
