import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ContractFactory, Contract } from "ethers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * Minimal mock ERC20 for USDT
 */
const MockERC20ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address,uint256) returns (bool)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function transferFrom(address,address,uint256) returns (bool)",
  "function mint(address,uint256)",
];

describe("InsurancePool", function () {
  // We deploy mock contracts inline using Solidity code to avoid external deps

  async function deployFixture() {
    const [owner, user1, user2, defaultOracle, payoutEngine, treasury, issuerToken] =
      await ethers.getSigners();

    // Deploy mock USDT
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const usdt = await MockERC20Factory.deploy("Mock USDT", "USDT", 6);
    await usdt.waitForDeployment();

    // Deploy mock srCVR and jrCVR tokens
    const MockTrancheFactory = await ethers.getContractFactory("MockTrancheToken");
    const srCVR = await MockTrancheFactory.deploy("Senior CVR", "srCVR", await usdt.getAddress());
    await srCVR.waitForDeployment();

    const jrCVR = await MockTrancheFactory.deploy("Junior CVR", "jrCVR", await usdt.getAddress());
    await jrCVR.waitForDeployment();

    // Deploy InsurancePool
    const InsurancePoolFactory = await ethers.getContractFactory("InsurancePool");
    const pool = await InsurancePoolFactory.deploy(
      await usdt.getAddress(),
      treasury.address
    );
    await pool.waitForDeployment();

    // Configure pool
    await pool.setSrCVR(await srCVR.getAddress());
    await pool.setJrCVR(await jrCVR.getAddress());
    await pool.setDefaultOracle(defaultOracle.address);
    await pool.setPayoutEngine(payoutEngine.address);

    // Authorize the pool in tranche tokens
    await srCVR.setPool(await pool.getAddress());
    await jrCVR.setPool(await pool.getAddress());

    // Mint USDT to users
    const mintAmount = ethers.parseUnits("1000000", 6);
    await usdt.mint(user1.address, mintAmount);
    await usdt.mint(user2.address, mintAmount);

    // Approve pool to spend USDT
    await usdt.connect(user1).approve(await pool.getAddress(), ethers.MaxUint256);
    await usdt.connect(user2).approve(await pool.getAddress(), ethers.MaxUint256);

    return {
      pool,
      usdt,
      srCVR,
      jrCVR,
      owner,
      user1,
      user2,
      defaultOracle,
      payoutEngine,
      treasury,
      issuerToken,
    };
  }

  // ───────────────────────────────────────────────────────────────────────
  // 1. Pool Activation
  // ───────────────────────────────────────────────────────────────────────
  describe("Pool Activation", function () {
    it("should allow owner to activate a pool", async function () {
      const { pool, issuerToken, owner } = await loadFixture(deployFixture);

      await expect(pool.connect(owner).activatePool(issuerToken.address))
        .to.emit(pool, "PoolActivated")
        .withArgs(issuerToken.address);

      const state = await pool.getPoolState(issuerToken.address);
      expect(state.isActive).to.be.true;
    });

    it("should reject pool activation by non-owner", async function () {
      const { pool, issuerToken, user1 } = await loadFixture(deployFixture);

      await expect(
        pool.connect(user1).activatePool(issuerToken.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 2. Senior Tranche Deposit
  // ───────────────────────────────────────────────────────────────────────
  describe("Senior Tranche Deposit", function () {
    it("should accept senior deposit and mint srCVR on empty pool", async function () {
      const { pool, usdt, srCVR, issuerToken, user1, owner } =
        await loadFixture(deployFixture);

      await pool.connect(owner).activatePool(issuerToken.address);

      const depositAmount = ethers.parseUnits("1000", 6);

      await expect(
        pool.connect(user1).depositSenior(issuerToken.address, depositAmount)
      ).to.emit(pool, "SeniorDeposited");

      const state = await pool.getPoolState(issuerToken.address);
      expect(state.seniorTVL).to.equal(depositAmount);
    });

    it("should transfer USDT from depositor to srCVR token address", async function () {
      const { pool, usdt, srCVR, issuerToken, user1, owner } =
        await loadFixture(deployFixture);

      await pool.connect(owner).activatePool(issuerToken.address);

      const depositAmount = ethers.parseUnits("500", 6);
      const srCVRAddr = await srCVR.getAddress();

      const balBefore = await usdt.balanceOf(srCVRAddr);
      await pool.connect(user1).depositSenior(issuerToken.address, depositAmount);
      const balAfter = await usdt.balanceOf(srCVRAddr);

      expect(balAfter - balBefore).to.equal(depositAmount);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 3. Junior Tranche Deposit
  // ───────────────────────────────────────────────────────────────────────
  describe("Junior Tranche Deposit", function () {
    it("should accept junior deposit and mint jrCVR", async function () {
      const { pool, jrCVR, issuerToken, user1, owner } =
        await loadFixture(deployFixture);

      await pool.connect(owner).activatePool(issuerToken.address);

      const depositAmount = ethers.parseUnits("500", 6);

      await expect(
        pool.connect(user1).depositJunior(issuerToken.address, depositAmount)
      ).to.emit(pool, "JuniorDeposited");

      const state = await pool.getPoolState(issuerToken.address);
      expect(state.juniorTVL).to.equal(depositAmount);
    });

    it("should transfer USDT from depositor to jrCVR token address", async function () {
      const { pool, usdt, jrCVR, issuerToken, user1, owner } =
        await loadFixture(deployFixture);

      await pool.connect(owner).activatePool(issuerToken.address);

      const depositAmount = ethers.parseUnits("300", 6);
      const jrCVRAddr = await jrCVR.getAddress();

      const balBefore = await usdt.balanceOf(jrCVRAddr);
      await pool.connect(user1).depositJunior(issuerToken.address, depositAmount);
      const balAfter = await usdt.balanceOf(jrCVRAddr);

      expect(balAfter - balBefore).to.equal(depositAmount);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 4. 25% Minimum Junior Ratio Enforcement
  // ───────────────────────────────────────────────────────────────────────
  describe("Junior Ratio Enforcement", function () {
    it("should allow senior deposit when junior ratio stays >= 25%", async function () {
      const { pool, issuerToken, user1, owner } = await loadFixture(deployFixture);

      await pool.connect(owner).activatePool(issuerToken.address);

      // Deposit junior first: 400
      await pool.connect(user1).depositJunior(issuerToken.address, ethers.parseUnits("400", 6));

      // Senior deposit of 1000 => junior ratio = 400/1400 = 28.5% >= 25% -- OK
      await expect(
        pool.connect(user1).depositSenior(issuerToken.address, ethers.parseUnits("1000", 6))
      ).to.not.be.reverted;
    });

    it("should reject senior deposit when junior ratio drops below 25%", async function () {
      const { pool, issuerToken, user1, owner } = await loadFixture(deployFixture);

      await pool.connect(owner).activatePool(issuerToken.address);

      // Deposit junior first: 100
      await pool.connect(user1).depositJunior(issuerToken.address, ethers.parseUnits("100", 6));

      // Senior deposit of 1000 => junior ratio = 100/1100 = 9% < 25% -- FAIL
      await expect(
        pool.connect(user1).depositSenior(issuerToken.address, ethers.parseUnits("1000", 6))
      ).to.be.revertedWith("InsurancePool: junior ratio too low");
    });

    it("should allow first senior deposit on empty pool (bypass ratio)", async function () {
      const { pool, issuerToken, user1, owner } = await loadFixture(deployFixture);

      await pool.connect(owner).activatePool(issuerToken.address);

      // Both TVLs are 0 => bypass condition
      await expect(
        pool.connect(user1).depositSenior(issuerToken.address, ethers.parseUnits("500", 6))
      ).to.not.be.reverted;
    });

    it("should correctly compute junior ratio via getJuniorRatio", async function () {
      const { pool, issuerToken, user1, owner } = await loadFixture(deployFixture);

      await pool.connect(owner).activatePool(issuerToken.address);

      await pool.connect(user1).depositJunior(issuerToken.address, ethers.parseUnits("300", 6));
      await pool.connect(user1).depositSenior(issuerToken.address, ethers.parseUnits("700", 6));

      // juniorRatio = 300 / 1000 * 100 = 30
      const ratio = await pool.getJuniorRatio(issuerToken.address);
      expect(ratio).to.equal(30);
    });

    it("should return 0 junior ratio for empty pool", async function () {
      const { pool, issuerToken } = await loadFixture(deployFixture);
      const ratio = await pool.getJuniorRatio(issuerToken.address);
      expect(ratio).to.equal(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 5. Deposit When Pool Is Not Active
  // ───────────────────────────────────────────────────────────────────────
  describe("Deposit on Inactive Pool", function () {
    it("should reject senior deposit when pool is not active", async function () {
      const { pool, issuerToken, user1 } = await loadFixture(deployFixture);

      await expect(
        pool.connect(user1).depositSenior(issuerToken.address, ethers.parseUnits("100", 6))
      ).to.be.revertedWith("InsurancePool: pool not active");
    });

    it("should reject junior deposit when pool is not active", async function () {
      const { pool, issuerToken, user1 } = await loadFixture(deployFixture);

      await expect(
        pool.connect(user1).depositJunior(issuerToken.address, ethers.parseUnits("100", 6))
      ).to.be.revertedWith("InsurancePool: pool not active");
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 6. Premium Distribution
  // ───────────────────────────────────────────────────────────────────────
  describe("Premium Distribution", function () {
    it("should split premium: 5% fee, 70/30 net to senior/junior", async function () {
      const { pool, usdt, srCVR, jrCVR, issuerToken, user1, user2, owner, treasury } =
        await loadFixture(deployFixture);

      await pool.connect(owner).activatePool(issuerToken.address);

      // Seed pool
      await pool.connect(user1).depositJunior(issuerToken.address, ethers.parseUnits("300", 6));
      await pool.connect(user1).depositSenior(issuerToken.address, ethers.parseUnits("700", 6));

      // Approve user2 to pay premium
      const premiumAmount = ethers.parseUnits("10000", 6); // 10,000 USDT
      await usdt.mint(user2.address, premiumAmount);
      await usdt.connect(user2).approve(await pool.getAddress(), premiumAmount);

      const treasuryBefore = await usdt.balanceOf(treasury.address);

      await expect(
        pool.connect(user2).payPremium(issuerToken.address, premiumAmount)
      )
        .to.emit(pool, "PremiumPaid")
        .withArgs(
          issuerToken.address,
          premiumAmount,
          ethers.parseUnits("500", 6),  // 5% of 10000
          ethers.parseUnits("9500", 6)  // 95% net
        );

      // Treasury received 500 (5%)
      const treasuryAfter = await usdt.balanceOf(treasury.address);
      expect(treasuryAfter - treasuryBefore).to.equal(ethers.parseUnits("500", 6));

      // Pool state updated: seniorTVL += 6650 (70% of 9500), juniorTVL += 2850 (30% of 9500)
      const state = await pool.getPoolState(issuerToken.address);
      expect(state.seniorTVL).to.equal(
        ethers.parseUnits("700", 6) + ethers.parseUnits("6650", 6)
      );
      expect(state.juniorTVL).to.equal(
        ethers.parseUnits("300", 6) + ethers.parseUnits("2850", 6)
      );
    });

    it("should reject premium payment on inactive pool", async function () {
      const { pool, issuerToken, user1 } = await loadFixture(deployFixture);

      await expect(
        pool.connect(user1).payPremium(issuerToken.address, ethers.parseUnits("100", 6))
      ).to.be.revertedWith("InsurancePool: pool not active");
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 7. Redemption Gate Activation/Deactivation
  // ───────────────────────────────────────────────────────────────────────
  describe("Redemption Gate", function () {
    it("should allow owner to activate redemption gate", async function () {
      const { pool, issuerToken, owner } = await loadFixture(deployFixture);

      await expect(pool.connect(owner).activateRedemptionGate(issuerToken.address))
        .to.emit(pool, "RedemptionGateActivated");

      const state = await pool.getPoolState(issuerToken.address);
      expect(state.redemptionGateActive).to.be.true;
    });

    it("should allow defaultOracle to activate redemption gate", async function () {
      const { pool, issuerToken, defaultOracle } = await loadFixture(deployFixture);

      await pool.connect(defaultOracle).activateRedemptionGate(issuerToken.address);

      const state = await pool.getPoolState(issuerToken.address);
      expect(state.redemptionGateActive).to.be.true;
    });

    it("should allow owner to deactivate redemption gate", async function () {
      const { pool, issuerToken, owner } = await loadFixture(deployFixture);

      await pool.connect(owner).activateRedemptionGate(issuerToken.address);
      await expect(pool.connect(owner).deactivateRedemptionGate(issuerToken.address))
        .to.emit(pool, "RedemptionGateLifted");

      const state = await pool.getPoolState(issuerToken.address);
      expect(state.redemptionGateActive).to.be.false;
    });

    it("should block deposits when redemption gate is active", async function () {
      const { pool, issuerToken, user1, owner } = await loadFixture(deployFixture);

      await pool.connect(owner).activatePool(issuerToken.address);
      await pool.connect(owner).activateRedemptionGate(issuerToken.address);

      await expect(
        pool.connect(user1).depositSenior(issuerToken.address, ethers.parseUnits("100", 6))
      ).to.be.revertedWith("InsurancePool: gate active");

      await expect(
        pool.connect(user1).depositJunior(issuerToken.address, ethers.parseUnits("100", 6))
      ).to.be.revertedWith("InsurancePool: gate active");
    });

    it("should reject gate activation by unauthorized caller", async function () {
      const { pool, issuerToken, user1 } = await loadFixture(deployFixture);

      await expect(
        pool.connect(user1).activateRedemptionGate(issuerToken.address)
      ).to.be.revertedWith("InsurancePool: unauthorized");
    });

    it("should reject gate deactivation by unauthorized caller", async function () {
      const { pool, issuerToken, user1 } = await loadFixture(deployFixture);

      await expect(
        pool.connect(user1).deactivateRedemptionGate(issuerToken.address)
      ).to.be.revertedWith("InsurancePool: unauthorized");
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 8. Withdrawal Request Queuing
  // ───────────────────────────────────────────────────────────────────────
  describe("Withdrawal Request Queuing", function () {
    it("should queue a senior withdrawal request", async function () {
      const { pool, issuerToken, user1, owner } = await loadFixture(deployFixture);

      await pool.connect(owner).activatePool(issuerToken.address);
      await pool.connect(user1).depositSenior(issuerToken.address, ethers.parseUnits("500", 6));

      const srAmount = ethers.parseUnits("100", 6);
      await expect(
        pool.connect(user1).initiateWithdrawalSenior(issuerToken.address, srAmount)
      )
        .to.emit(pool, "WithdrawalInitiated")
        .withArgs(1, user1.address, true, srAmount);

      const req = await pool.withdrawalRequests(1);
      expect(req.depositor).to.equal(user1.address);
      expect(req.tokenAmount).to.equal(srAmount);
      expect(req.isSenior).to.be.true;
      expect(req.frozen).to.be.false;
      expect(req.executed).to.be.false;
    });

    it("should queue a junior withdrawal request", async function () {
      const { pool, issuerToken, user1, owner } = await loadFixture(deployFixture);

      await pool.connect(owner).activatePool(issuerToken.address);
      await pool.connect(user1).depositJunior(issuerToken.address, ethers.parseUnits("500", 6));

      const jrAmount = ethers.parseUnits("200", 6);
      await expect(
        pool.connect(user1).initiateWithdrawalJunior(issuerToken.address, jrAmount)
      )
        .to.emit(pool, "WithdrawalInitiated")
        .withArgs(1, user1.address, false, jrAmount);

      const req = await pool.withdrawalRequests(1);
      expect(req.isSenior).to.be.false;
    });

    it("should increment request IDs", async function () {
      const { pool, issuerToken, user1, owner } = await loadFixture(deployFixture);

      await pool.connect(owner).activatePool(issuerToken.address);
      await pool.connect(user1).depositJunior(issuerToken.address, ethers.parseUnits("500", 6));

      await pool.connect(user1).initiateWithdrawalJunior(issuerToken.address, ethers.parseUnits("100", 6));
      await pool.connect(user1).initiateWithdrawalJunior(issuerToken.address, ethers.parseUnits("200", 6));

      expect(await pool.nextRequestId()).to.equal(3);
    });

    it("should reject withdrawal initiation when gate is active", async function () {
      const { pool, issuerToken, user1, owner } = await loadFixture(deployFixture);

      await pool.connect(owner).activatePool(issuerToken.address);
      await pool.connect(owner).activateRedemptionGate(issuerToken.address);

      await expect(
        pool.connect(user1).initiateWithdrawalSenior(issuerToken.address, ethers.parseUnits("100", 6))
      ).to.be.revertedWith("InsurancePool: gate active");

      await expect(
        pool.connect(user1).initiateWithdrawalJunior(issuerToken.address, ethers.parseUnits("100", 6))
      ).to.be.revertedWith("InsurancePool: gate active");
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 9. Liquidation Waterfall
  // ───────────────────────────────────────────────────────────────────────
  describe("Liquidation Waterfall", function () {
    it("should liquidate junior first, then senior", async function () {
      const { pool, usdt, srCVR, jrCVR, issuerToken, user1, owner, payoutEngine } =
        await loadFixture(deployFixture);

      await pool.connect(owner).activatePool(issuerToken.address);

      // Seed pool
      const juniorAmt = ethers.parseUnits("300", 6);
      const seniorAmt = ethers.parseUnits("700", 6);
      await pool.connect(user1).depositJunior(issuerToken.address, juniorAmt);
      await pool.connect(user1).depositSenior(issuerToken.address, seniorAmt);

      // Liquidate
      await expect(
        pool.connect(payoutEngine).liquidateForPayout(issuerToken.address)
      ).to.emit(pool, "PoolLiquidated");

      // Pool should be zeroed and deactivated
      const state = await pool.getPoolState(issuerToken.address);
      expect(state.seniorTVL).to.equal(0);
      expect(state.juniorTVL).to.equal(0);
      expect(state.isActive).to.be.false;
    });

    it("should reject liquidation from non-PayoutEngine", async function () {
      const { pool, issuerToken, user1 } = await loadFixture(deployFixture);

      await expect(
        pool.connect(user1).liquidateForPayout(issuerToken.address)
      ).to.be.revertedWith("InsurancePool: only PayoutEngine");
    });

    it("should forward liquidated USDT to PayoutEngine", async function () {
      const { pool, usdt, issuerToken, user1, owner, payoutEngine } =
        await loadFixture(deployFixture);

      await pool.connect(owner).activatePool(issuerToken.address);

      await pool.connect(user1).depositJunior(issuerToken.address, ethers.parseUnits("300", 6));
      await pool.connect(user1).depositSenior(issuerToken.address, ethers.parseUnits("700", 6));

      const peBefore = await usdt.balanceOf(payoutEngine.address);
      await pool.connect(payoutEngine).liquidateForPayout(issuerToken.address);
      const peAfter = await usdt.balanceOf(payoutEngine.address);

      // Total liquidated should equal 300 + 700 = 1000
      expect(peAfter - peBefore).to.equal(ethers.parseUnits("1000", 6));
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 10. Pool State Retrieval
  // ───────────────────────────────────────────────────────────────────────
  describe("Pool State Retrieval", function () {
    it("should return correct seniorTVL, juniorTVL, and totalInsured", async function () {
      const { pool, issuerToken, user1, owner, payoutEngine } =
        await loadFixture(deployFixture);

      await pool.connect(owner).activatePool(issuerToken.address);

      await pool.connect(user1).depositJunior(issuerToken.address, ethers.parseUnits("250", 6));
      await pool.connect(user1).depositSenior(issuerToken.address, ethers.parseUnits("750", 6));

      // Set totalInsuredAmount
      await pool.connect(payoutEngine).addInsuredAmount(issuerToken.address, ethers.parseUnits("500", 6));

      const state = await pool.getPoolState(issuerToken.address);
      expect(state.seniorTVL).to.equal(ethers.parseUnits("750", 6));
      expect(state.juniorTVL).to.equal(ethers.parseUnits("250", 6));
      expect(state.totalInsuredAmount).to.equal(ethers.parseUnits("500", 6));
      expect(state.isActive).to.be.true;
    });

    it("should return default values for uninitialized pool", async function () {
      const { pool, issuerToken } = await loadFixture(deployFixture);

      const state = await pool.getPoolState(issuerToken.address);
      expect(state.seniorTVL).to.equal(0);
      expect(state.juniorTVL).to.equal(0);
      expect(state.totalInsuredAmount).to.equal(0);
      expect(state.isActive).to.be.false;
      expect(state.redemptionGateActive).to.be.false;
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 11. Coverage Ratio Calculation
  // ───────────────────────────────────────────────────────────────────────
  describe("Coverage Ratio Calculation", function () {
    it("should compute coverageRatioBPS correctly", async function () {
      const { pool, issuerToken, user1, owner, payoutEngine } =
        await loadFixture(deployFixture);

      await pool.connect(owner).activatePool(issuerToken.address);

      // Deposit 250 junior + 750 senior = 1000 TVL
      await pool.connect(user1).depositJunior(issuerToken.address, ethers.parseUnits("250", 6));
      await pool.connect(user1).depositSenior(issuerToken.address, ethers.parseUnits("750", 6));

      // Set insured amount to 500 => ratio = 1000/500 * 10000 = 20000 BPS (200%)
      await pool.connect(payoutEngine).addInsuredAmount(issuerToken.address, ethers.parseUnits("500", 6));

      const state = await pool.getPoolState(issuerToken.address);
      expect(state.coverageRatioBPS).to.equal(20000n);
    });

    it("should return 0 when totalInsuredAmount is 0", async function () {
      const { pool, issuerToken, user1, owner } = await loadFixture(deployFixture);

      await pool.connect(owner).activatePool(issuerToken.address);
      await pool.connect(user1).depositJunior(issuerToken.address, ethers.parseUnits("100", 6));

      const state = await pool.getPoolState(issuerToken.address);
      expect(state.coverageRatioBPS).to.equal(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // 12. Unauthorized Access Attempts
  // ───────────────────────────────────────────────────────────────────────
  describe("Unauthorized Access", function () {
    it("should reject setSrCVR by non-owner", async function () {
      const { pool, user1 } = await loadFixture(deployFixture);
      await expect(
        pool.connect(user1).setSrCVR(user1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should reject setJrCVR by non-owner", async function () {
      const { pool, user1 } = await loadFixture(deployFixture);
      await expect(
        pool.connect(user1).setJrCVR(user1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should reject setIssuerRegistry by non-owner", async function () {
      const { pool, user1 } = await loadFixture(deployFixture);
      await expect(
        pool.connect(user1).setIssuerRegistry(user1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should reject setDefaultOracle by non-owner", async function () {
      const { pool, user1 } = await loadFixture(deployFixture);
      await expect(
        pool.connect(user1).setDefaultOracle(user1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should reject setPayoutEngine by non-owner", async function () {
      const { pool, user1 } = await loadFixture(deployFixture);
      await expect(
        pool.connect(user1).setPayoutEngine(user1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should reject addInsuredAmount by unauthorized caller", async function () {
      const { pool, issuerToken, user1 } = await loadFixture(deployFixture);
      await expect(
        pool.connect(user1).addInsuredAmount(issuerToken.address, 1000)
      ).to.be.revertedWith("InsurancePool: unauthorized");
    });

    it("should allow owner to call addInsuredAmount", async function () {
      const { pool, issuerToken, owner } = await loadFixture(deployFixture);
      await expect(
        pool.connect(owner).addInsuredAmount(issuerToken.address, 1000)
      ).to.not.be.reverted;
    });

    it("should allow payoutEngine to call addInsuredAmount", async function () {
      const { pool, issuerToken, payoutEngine } = await loadFixture(deployFixture);
      await expect(
        pool.connect(payoutEngine).addInsuredAmount(issuerToken.address, 1000)
      ).to.not.be.reverted;
    });
  });
});
