// SPDX-License-Identifier: Apache-2.0
const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  loadFixture,
  time,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("AgentEscrow", function () {
  // Preimage and hashLock for HTLC tests
  const SECRET = ethers.encodeBytes32String("my-secret-preimage");

  async function computeHashLock(preimage) {
    // SHA-256 hash matching Solidity: sha256(abi.encodePacked(preimage))
    const packed = ethers.solidityPacked(["bytes32"], [preimage]);
    return ethers.sha256(packed);
  }

  async function deployFixture() {
    const [owner, depositor, recipient, stranger] = await ethers.getSigners();

    const MockToken = await ethers.getContractFactory("MockERC20");
    const token = await MockToken.deploy("Mock USDT", "USDT", 6);
    await token.waitForDeployment();

    const AgentEscrow = await ethers.getContractFactory("AgentEscrow");
    const escrow = await AgentEscrow.deploy(
      await token.getAddress(),
      owner.address
    );
    await escrow.waitForDeployment();

    // Mint and approve
    const mintAmount = ethers.parseUnits("100000", 6);
    await token.mint(depositor.address, mintAmount);
    await token
      .connect(depositor)
      .approve(await escrow.getAddress(), mintAmount);

    const hashLock = await computeHashLock(SECRET);
    const escrowId = ethers.keccak256(ethers.toUtf8Bytes("escrow-1"));
    const duration = 3600; // 1 hour

    return {
      escrow,
      token,
      owner,
      depositor,
      recipient,
      stranger,
      hashLock,
      escrowId,
      duration,
    };
  }

  async function createEscrowFixture() {
    const fixture = await deployFixture();
    const { escrow, depositor, recipient, hashLock, escrowId, duration } =
      fixture;

    const amount = ethers.parseUnits("1000", 6);
    await escrow
      .connect(depositor)
      .createEscrow(escrowId, recipient.address, amount, hashLock, duration);

    return { ...fixture, amount };
  }

  describe("createEscrow", function () {
    it("should create an escrow with valid parameters", async function () {
      const { escrow, depositor, recipient, hashLock, escrowId, duration } =
        await loadFixture(deployFixture);

      const amount = ethers.parseUnits("500", 6);
      await expect(
        escrow
          .connect(depositor)
          .createEscrow(escrowId, recipient.address, amount, hashLock, duration)
      ).to.not.be.reverted;

      const stored = await escrow.getEscrow(escrowId);
      expect(stored.depositor).to.equal(depositor.address);
      expect(stored.recipient).to.equal(recipient.address);
      expect(stored.amount).to.equal(amount);
      expect(stored.hashLock).to.equal(hashLock);
      expect(stored.state).to.equal(0); // Active

      expect(await escrow.escrowCount()).to.equal(1);
      expect(await escrow.totalVolume()).to.equal(amount);
    });

    it("should reject escrow with zero amount", async function () {
      const { escrow, depositor, recipient, hashLock, escrowId, duration } =
        await loadFixture(deployFixture);

      await expect(
        escrow
          .connect(depositor)
          .createEscrow(escrowId, recipient.address, 0, hashLock, duration)
      ).to.be.revertedWithCustomError(escrow, "ZeroAmount");
    });

    it("should reject escrow with duration too short", async function () {
      const { escrow, depositor, recipient, hashLock, escrowId } =
        await loadFixture(deployFixture);

      // minTimelockDuration is 1 hour by default; use 60 seconds
      await expect(
        escrow
          .connect(depositor)
          .createEscrow(escrowId, recipient.address, 1000, hashLock, 60)
      ).to.be.revertedWithCustomError(escrow, "TimelockTooShort");
    });

    it("should reject duplicate escrow ID", async function () {
      const { escrow, depositor, recipient, hashLock, escrowId, duration } =
        await loadFixture(createEscrowFixture);

      await expect(
        escrow
          .connect(depositor)
          .createEscrow(
            escrowId,
            recipient.address,
            1000,
            hashLock,
            duration
          )
      ).to.be.revertedWithCustomError(escrow, "EscrowAlreadyExists");
    });

    it("should emit EscrowCreated event", async function () {
      const { escrow, depositor, recipient, hashLock, escrowId, duration } =
        await loadFixture(deployFixture);

      const amount = ethers.parseUnits("200", 6);
      await expect(
        escrow
          .connect(depositor)
          .createEscrow(escrowId, recipient.address, amount, hashLock, duration)
      )
        .to.emit(escrow, "EscrowCreated")
        .withArgs(
          escrowId,
          depositor.address,
          recipient.address,
          amount,
          hashLock,
          (timeLock) => timeLock > 0
        );
    });
  });

  describe("claim", function () {
    it("should claim escrow with correct preimage", async function () {
      const { escrow, token, recipient, escrowId, amount } =
        await loadFixture(createEscrowFixture);

      await escrow.connect(recipient).claim(escrowId, SECRET);

      expect(await token.balanceOf(recipient.address)).to.equal(amount);

      const stored = await escrow.getEscrow(escrowId);
      expect(stored.state).to.equal(1); // Claimed
    });

    it("should reject claim with wrong preimage", async function () {
      const { escrow, recipient, escrowId } =
        await loadFixture(createEscrowFixture);

      const wrongSecret = ethers.encodeBytes32String("wrong-secret");
      await expect(
        escrow.connect(recipient).claim(escrowId, wrongSecret)
      ).to.be.revertedWithCustomError(escrow, "InvalidPreimage");
    });

    it("should reject double-claim", async function () {
      const { escrow, recipient, escrowId } =
        await loadFixture(createEscrowFixture);

      await escrow.connect(recipient).claim(escrowId, SECRET);

      await expect(
        escrow.connect(recipient).claim(escrowId, SECRET)
      ).to.be.revertedWithCustomError(escrow, "EscrowNotActive");
    });
  });

  describe("refund", function () {
    it("should refund after timeout", async function () {
      const { escrow, token, depositor, escrowId, amount, duration } =
        await loadFixture(createEscrowFixture);

      const balBefore = await token.balanceOf(depositor.address);

      // Fast-forward past the timelock
      await time.increase(duration + 1);

      await escrow.connect(depositor).refund(escrowId);

      expect(await token.balanceOf(depositor.address)).to.equal(
        balBefore + amount
      );

      const stored = await escrow.getEscrow(escrowId);
      expect(stored.state).to.equal(2); // Refunded
    });

    it("should reject refund before timeout", async function () {
      const { escrow, depositor, escrowId } =
        await loadFixture(createEscrowFixture);

      await expect(
        escrow.connect(depositor).refund(escrowId)
      ).to.be.revertedWithCustomError(escrow, "TimelockNotExpired");
    });

    it("should reject refund on already-claimed escrow", async function () {
      const { escrow, recipient, depositor, escrowId, duration } =
        await loadFixture(createEscrowFixture);

      // Claim first
      await escrow.connect(recipient).claim(escrowId, SECRET);

      // Try to refund
      await time.increase(duration + 1);
      await expect(
        escrow.connect(depositor).refund(escrowId)
      ).to.be.revertedWithCustomError(escrow, "EscrowNotActive");
    });
  });

  describe("views", function () {
    it("should verify preimage off-chain", async function () {
      const { escrow, escrowId } = await loadFixture(createEscrowFixture);

      expect(await escrow.verifyPreimage(escrowId, SECRET)).to.be.true;

      const wrong = ethers.encodeBytes32String("nope");
      expect(await escrow.verifyPreimage(escrowId, wrong)).to.be.false;
    });
  });
});
