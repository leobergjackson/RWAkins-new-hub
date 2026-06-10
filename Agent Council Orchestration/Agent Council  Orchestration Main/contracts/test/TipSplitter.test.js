// SPDX-License-Identifier: Apache-2.0
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("TipSplitter", function () {
  async function deployFixture() {
    const [owner, creator, recipientA, recipientB, recipientC, tipper, stranger] =
      await ethers.getSigners();

    // Deploy a mock ERC-20 token
    const MockToken = await ethers.getContractFactory("MockERC20");
    const token = await MockToken.deploy("Mock USDT", "USDT", 6);
    await token.waitForDeployment();

    // Deploy TipSplitter
    const TipSplitter = await ethers.getContractFactory("TipSplitter");
    const splitter = await TipSplitter.deploy(
      await token.getAddress(),
      owner.address
    );
    await splitter.waitForDeployment();

    // Mint tokens to tipper and approve splitter
    const mintAmount = ethers.parseUnits("10000", 6);
    await token.mint(tipper.address, mintAmount);
    await token.connect(tipper).approve(await splitter.getAddress(), mintAmount);

    return { splitter, token, owner, creator, recipientA, recipientB, recipientC, tipper, stranger };
  }

  describe("Deployment", function () {
    it("should deploy with the correct owner", async function () {
      const { splitter, owner } = await loadFixture(deployFixture);
      expect(await splitter.owner()).to.equal(owner.address);
    });

    it("should store the correct tip token", async function () {
      const { splitter, token } = await loadFixture(deployFixture);
      expect(await splitter.tipToken()).to.equal(await token.getAddress());
    });
  });

  describe("configureSplit", function () {
    it("should set a split configuration (60/30/10)", async function () {
      const { splitter, owner, creator, recipientA, recipientB, recipientC } =
        await loadFixture(deployFixture);

      const recipients = [
        { account: recipientA.address, shareBps: 6000 },
        { account: recipientB.address, shareBps: 3000 },
        { account: recipientC.address, shareBps: 1000 },
      ];

      await splitter.connect(owner).configureSplit(creator.address, recipients);

      const stored = await splitter.getSplit(creator.address);
      expect(stored.length).to.equal(3);
      expect(stored[0].shareBps).to.equal(6000);
      expect(stored[1].shareBps).to.equal(3000);
      expect(stored[2].shareBps).to.equal(1000);
      expect(await splitter.hasSplit(creator.address)).to.be.true;
    });

    it("should reject unauthorized split config change", async function () {
      const { splitter, creator, recipientA, stranger } =
        await loadFixture(deployFixture);

      const recipients = [{ account: recipientA.address, shareBps: 10000 }];

      await expect(
        splitter.connect(stranger).configureSplit(creator.address, recipients)
      ).to.be.revertedWithCustomError(splitter, "OwnableUnauthorizedAccount");
    });

    it("should reject empty recipients array", async function () {
      const { splitter, owner, creator } = await loadFixture(deployFixture);

      await expect(
        splitter.connect(owner).configureSplit(creator.address, [])
      ).to.be.revertedWithCustomError(splitter, "EmptyRecipients");
    });

    it("should reject shares that don't sum to 10000", async function () {
      const { splitter, owner, creator, recipientA, recipientB } =
        await loadFixture(deployFixture);

      const recipients = [
        { account: recipientA.address, shareBps: 5000 },
        { account: recipientB.address, shareBps: 4000 },
      ];

      await expect(
        splitter.connect(owner).configureSplit(creator.address, recipients)
      ).to.be.revertedWithCustomError(splitter, "SharesSumMismatch");
    });
  });

  describe("tip", function () {
    it("should execute a tip and verify split amounts (60/30/10)", async function () {
      const { splitter, token, owner, creator, recipientA, recipientB, recipientC, tipper } =
        await loadFixture(deployFixture);

      const recipients = [
        { account: recipientA.address, shareBps: 6000 },
        { account: recipientB.address, shareBps: 3000 },
        { account: recipientC.address, shareBps: 1000 },
      ];
      await splitter.connect(owner).configureSplit(creator.address, recipients);

      const tipAmount = ethers.parseUnits("100", 6); // 100 USDT
      await splitter.connect(tipper).tip(creator.address, tipAmount);

      expect(await token.balanceOf(recipientA.address)).to.equal(ethers.parseUnits("60", 6));
      expect(await token.balanceOf(recipientB.address)).to.equal(ethers.parseUnits("30", 6));
      expect(await token.balanceOf(recipientC.address)).to.equal(ethers.parseUnits("10", 6));

      expect(await splitter.totalTipped(creator.address)).to.equal(tipAmount);
      expect(await splitter.tipCount(creator.address)).to.equal(1);
    });

    it("should reject tip with zero amount", async function () {
      const { splitter, owner, creator, recipientA, tipper } =
        await loadFixture(deployFixture);

      const recipients = [{ account: recipientA.address, shareBps: 10000 }];
      await splitter.connect(owner).configureSplit(creator.address, recipients);

      await expect(
        splitter.connect(tipper).tip(creator.address, 0)
      ).to.be.revertedWithCustomError(splitter, "ZeroAmount");
    });

    it("should reject tip to creator with no split configured", async function () {
      const { splitter, creator, tipper } = await loadFixture(deployFixture);
      const tipAmount = ethers.parseUnits("10", 6);

      await expect(
        splitter.connect(tipper).tip(creator.address, tipAmount)
      ).to.be.revertedWithCustomError(splitter, "NoSplitConfigured");
    });

    it("should emit TipSent event", async function () {
      const { splitter, owner, creator, recipientA, tipper } =
        await loadFixture(deployFixture);

      const recipients = [{ account: recipientA.address, shareBps: 10000 }];
      await splitter.connect(owner).configureSplit(creator.address, recipients);

      const tipAmount = ethers.parseUnits("50", 6);
      await expect(splitter.connect(tipper).tip(creator.address, tipAmount))
        .to.emit(splitter, "TipSent")
        .withArgs(tipper.address, creator.address, tipAmount, (ts) => ts > 0);
    });

    it("should emit TipSplit event for each recipient", async function () {
      const { splitter, owner, creator, recipientA, recipientB, tipper } =
        await loadFixture(deployFixture);

      const recipients = [
        { account: recipientA.address, shareBps: 7000 },
        { account: recipientB.address, shareBps: 3000 },
      ];
      await splitter.connect(owner).configureSplit(creator.address, recipients);

      const tipAmount = ethers.parseUnits("100", 6);
      const tx = splitter.connect(tipper).tip(creator.address, tipAmount);

      await expect(tx)
        .to.emit(splitter, "TipSplit")
        .withArgs(creator.address, recipientA.address, ethers.parseUnits("70", 6), 7000);
      await expect(tx)
        .to.emit(splitter, "TipSplit")
        .withArgs(creator.address, recipientB.address, ethers.parseUnits("30", 6), 3000);
    });

    it("should handle dust amounts correctly (remainder goes to last recipient)", async function () {
      const { splitter, token, owner, creator, recipientA, recipientB, recipientC, tipper } =
        await loadFixture(deployFixture);

      // 33.33/33.33/33.34 split — forces rounding
      const recipients = [
        { account: recipientA.address, shareBps: 3333 },
        { account: recipientB.address, shareBps: 3333 },
        { account: recipientC.address, shareBps: 3334 },
      ];
      await splitter.connect(owner).configureSplit(creator.address, recipients);

      const tipAmount = ethers.parseUnits("1", 6); // 1 USDT = 1_000_000 units
      await splitter.connect(tipper).tip(creator.address, tipAmount);

      const balA = await token.balanceOf(recipientA.address);
      const balB = await token.balanceOf(recipientB.address);
      const balC = await token.balanceOf(recipientC.address);

      // Total must equal the tip amount exactly — no dust lost
      expect(balA + balB + balC).to.equal(tipAmount);
    });

    it("should work with single recipient (100%)", async function () {
      const { splitter, token, owner, creator, recipientA, tipper } =
        await loadFixture(deployFixture);

      const recipients = [{ account: recipientA.address, shareBps: 10000 }];
      await splitter.connect(owner).configureSplit(creator.address, recipients);

      const tipAmount = ethers.parseUnits("25", 6);
      await splitter.connect(tipper).tip(creator.address, tipAmount);

      expect(await token.balanceOf(recipientA.address)).to.equal(tipAmount);
    });

    it("should work with maximum recipients (10-way split)", async function () {
      const { splitter, token, owner, creator, tipper } =
        await loadFixture(deployFixture);

      const signers = await ethers.getSigners();
      // Use signers 7..16 as 10 recipients, each gets 1000 bps (10%)
      const recipients = [];
      for (let i = 0; i < 10; i++) {
        recipients.push({ account: signers[7 + i].address, shareBps: 1000 });
      }

      await splitter.connect(owner).configureSplit(creator.address, recipients);

      const tipAmount = ethers.parseUnits("100", 6);
      await splitter.connect(tipper).tip(creator.address, tipAmount);

      for (let i = 0; i < 10; i++) {
        expect(await token.balanceOf(signers[7 + i].address)).to.equal(
          ethers.parseUnits("10", 6)
        );
      }
    });
  });
});
