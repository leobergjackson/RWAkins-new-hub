// SPDX-License-Identifier: Apache-2.0
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("AgentRegistry", function () {
  async function deployFixture() {
    const [owner, agentA, agentB, stranger] = await ethers.getSigners();

    const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
    const registry = await AgentRegistry.deploy(owner.address);
    await registry.waitForDeployment();

    return { registry, owner, agentA, agentB, stranger };
  }

  async function registeredFixture() {
    const fixture = await deployFixture();
    const { registry, owner, agentA, agentB } = fixture;

    await registry
      .connect(owner)
      .registerAgent(agentA.address, "AgentAlpha", "1.0.0", "tips,escrow");
    await registry
      .connect(owner)
      .registerAgent(agentB.address, "AgentBeta", "2.0.0", "swap,bridge");

    return fixture;
  }

  describe("Registration", function () {
    it("should register a new agent", async function () {
      const { registry, owner, agentA } = await loadFixture(deployFixture);

      await expect(
        registry
          .connect(owner)
          .registerAgent(agentA.address, "AgentAlpha", "1.0.0", "tips,escrow")
      )
        .to.emit(registry, "AgentRegistered")
        .withArgs(agentA.address, "AgentAlpha", "1.0.0", "tips,escrow");

      expect(await registry.isRegistered(agentA.address)).to.be.true;
      expect(await registry.agentCount()).to.equal(1);

      const info = await registry.getAgent(agentA.address);
      expect(info.name).to.equal("AgentAlpha");
      expect(info.version).to.equal("1.0.0");
      expect(info.active).to.be.true;
    });

    it("should reject duplicate registration", async function () {
      const { registry, owner, agentA } = await loadFixture(registeredFixture);

      await expect(
        registry
          .connect(owner)
          .registerAgent(agentA.address, "AgentAlpha2", "1.1.0", "tips")
      ).to.be.revertedWithCustomError(registry, "AlreadyRegistered");
    });

    it("should reject registration by non-owner", async function () {
      const { registry, stranger } = await loadFixture(deployFixture);

      await expect(
        registry
          .connect(stranger)
          .registerAgent(stranger.address, "Rogue", "0.0.1", "hack")
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });
  });

  describe("Update", function () {
    it("should update agent metadata (by owner)", async function () {
      const { registry, owner, agentA } = await loadFixture(registeredFixture);

      await expect(
        registry
          .connect(owner)
          .updateAgent(agentA.address, "AlphaV2", "2.0.0", "tips,escrow,swap")
      )
        .to.emit(registry, "AgentUpdated")
        .withArgs(agentA.address, "AlphaV2", "2.0.0", "tips,escrow,swap");

      const info = await registry.getAgent(agentA.address);
      expect(info.name).to.equal("AlphaV2");
      expect(info.version).to.equal("2.0.0");
    });

    it("should allow agent to update its own metadata", async function () {
      const { registry, agentA } = await loadFixture(registeredFixture);

      await registry
        .connect(agentA)
        .updateAgent(agentA.address, "SelfUpdate", "1.1.0", "tips");

      const info = await registry.getAgent(agentA.address);
      expect(info.name).to.equal("SelfUpdate");
    });

    it("should reject update by unauthorized address", async function () {
      const { registry, agentA, stranger } =
        await loadFixture(registeredFixture);

      await expect(
        registry
          .connect(stranger)
          .updateAgent(agentA.address, "Hacked", "9.9.9", "evil")
      ).to.be.revertedWithCustomError(registry, "NotAuthorized");
    });
  });

  describe("Activation", function () {
    it("should deactivate an agent", async function () {
      const { registry, owner, agentA } = await loadFixture(registeredFixture);

      await expect(registry.connect(owner).deactivateAgent(agentA.address))
        .to.emit(registry, "AgentDeactivated")
        .withArgs(agentA.address);

      expect(await registry.isActive(agentA.address)).to.be.false;
    });

    it("should reactivate an agent", async function () {
      const { registry, owner, agentA } = await loadFixture(registeredFixture);

      await registry.connect(owner).deactivateAgent(agentA.address);
      expect(await registry.isActive(agentA.address)).to.be.false;

      await expect(registry.connect(owner).reactivateAgent(agentA.address))
        .to.emit(registry, "AgentReactivated")
        .withArgs(agentA.address);

      expect(await registry.isActive(agentA.address)).to.be.true;
    });
  });

  describe("Endorsements", function () {
    it("should add an endorsement from one agent to another", async function () {
      const { registry, agentA, agentB } =
        await loadFixture(registeredFixture);

      await expect(registry.connect(agentA).endorse(agentB.address))
        .to.emit(registry, "AgentEndorsed")
        .withArgs(agentA.address, agentB.address, 1);

      expect(await registry.getEndorsements(agentB.address)).to.equal(1);
      expect(await registry.hasEndorsed(agentA.address, agentB.address)).to.be
        .true;
    });

    it("should reject self-endorsement", async function () {
      const { registry, agentA } = await loadFixture(registeredFixture);

      await expect(
        registry.connect(agentA).endorse(agentA.address)
      ).to.be.revertedWithCustomError(registry, "CannotEndorseSelf");
    });

    it("should reject duplicate endorsement", async function () {
      const { registry, agentA, agentB } =
        await loadFixture(registeredFixture);

      await registry.connect(agentA).endorse(agentB.address);

      await expect(
        registry.connect(agentA).endorse(agentB.address)
      ).to.be.revertedWithCustomError(registry, "AlreadyEndorsed");
    });

    it("should reject endorsement of inactive agent", async function () {
      const { registry, owner, agentA, agentB } =
        await loadFixture(registeredFixture);

      await registry.connect(owner).deactivateAgent(agentB.address);

      await expect(
        registry.connect(agentA).endorse(agentB.address)
      ).to.be.revertedWithCustomError(registry, "AgentNotActive");
    });
  });

  describe("Views", function () {
    it("should query agent details correctly", async function () {
      const { registry, agentA } = await loadFixture(registeredFixture);

      const info = await registry.getAgent(agentA.address);
      expect(info.name).to.equal("AgentAlpha");
      expect(info.capabilities).to.equal("tips,escrow");
      expect(info.registeredAt).to.be.gt(0);
      expect(info.endorsements).to.equal(0);
      expect(info.active).to.be.true;
    });

    it("should return paginated agent list", async function () {
      const { registry } = await loadFixture(registeredFixture);

      const page = await registry.getAgents(0, 10);
      expect(page.length).to.equal(2);
    });
  });
});
