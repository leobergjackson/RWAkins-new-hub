import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

// ═══════════════════════════════════════════════════════════════════════
//  Token Unit Tests: srCVR, jrCVR, ProtectionCert, SubrogationNFT
// ═══════════════════════════════════════════════════════════════════════

describe("Token Contracts", function () {
  // ─── Shared fixture ────────────────────────────────────────────────

  async function deployTokensFixture() {
    const [owner, pool, payoutEngine, foundation, user1, user2, attacker] =
      await ethers.getSigners();

    // Deploy MockUSDT
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const usdt = await MockUSDT.deploy();

    // Deploy srCVR (pool = pool signer)
    const SrCVR = await ethers.getContractFactory("srCVR");
    const srCVR = await SrCVR.deploy(pool.address, await usdt.getAddress());

    // Deploy jrCVR (pool = pool signer)
    const JrCVR = await ethers.getContractFactory("jrCVR");
    const jrCVR = await JrCVR.deploy(pool.address, await usdt.getAddress());

    // Deploy ProtectionCert
    const ProtectionCert = await ethers.getContractFactory("ProtectionCert");
    const protectionCert = await ProtectionCert.deploy();
    await protectionCert.setPayoutEngine(payoutEngine.address);

    // Deploy SubrogationNFT
    const SubrogationNFT = await ethers.getContractFactory("SubrogationNFT");
    const subrogationNFT = await SubrogationNFT.deploy(
      payoutEngine.address,
      foundation.address
    );

    // Fund the srCVR and jrCVR contracts with USDT for redemption tests
    const srCVRAddr = await srCVR.getAddress();
    const jrCVRAddr = await jrCVR.getAddress();
    await usdt.mint(srCVRAddr, ethers.parseEther("100000"));
    await usdt.mint(jrCVRAddr, ethers.parseEther("100000"));

    // Use a dummy issuer token address
    const issuerToken = ethers.Wallet.createRandom().address;

    return {
      usdt,
      srCVR,
      jrCVR,
      protectionCert,
      subrogationNFT,
      owner,
      pool,
      payoutEngine,
      foundation,
      user1,
      user2,
      attacker,
      issuerToken,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  srCVR Tests
  // ═══════════════════════════════════════════════════════════════════

  describe("srCVR", function () {
    // ─── 1. Mint on deposit, burn on withdrawal ──────────────────────

    describe("Mint on deposit, burn on withdrawal", function () {
      it("should mint srCVR tokens proportional to USDT deposit at current rate", async function () {
        const { srCVR, pool, user1, issuerToken } = await loadFixture(deployTokensFixture);

        // At 1:1 exchange rate, 1000 USDT => 1000 srCVR
        const tx = await srCVR
          .connect(pool)
          .mint(user1.address, ethers.parseEther("1000"), issuerToken);

        expect(await srCVR.balanceOf(user1.address)).to.equal(ethers.parseEther("1000"));
        await expect(tx).to.emit(srCVR, "Minted");
      });

      it("should burn srCVR and return USDT on redeem", async function () {
        const { srCVR, usdt, pool, user1, issuerToken } = await loadFixture(deployTokensFixture);

        await srCVR.connect(pool).mint(user1.address, ethers.parseEther("1000"), issuerToken);

        const balBefore = await usdt.balanceOf(user1.address);
        await srCVR.connect(pool).redeem(user1.address, ethers.parseEther("500"), issuerToken);
        const balAfter = await usdt.balanceOf(user1.address);

        // At 1:1 rate, 500 srCVR = 500 USDT
        expect(balAfter - balBefore).to.equal(ethers.parseEther("500"));
        expect(await srCVR.balanceOf(user1.address)).to.equal(ethers.parseEther("500"));
      });
    });

    // ─── 2. Exchange rate increases with premium accrual ─────────────

    describe("Exchange rate increases with premium accrual", function () {
      it("should increase exchangeRateMantissa after yield accrual", async function () {
        const { srCVR, pool, user1, issuerToken } = await loadFixture(deployTokensFixture);

        // Mint 1000 srCVR at 1:1
        await srCVR.connect(pool).mint(user1.address, ethers.parseEther("1000"), issuerToken);

        const rateBefore = await srCVR.exchangeRateMantissa();

        // Accrue 200 USDT yield
        await srCVR.connect(pool).accrueYield(ethers.parseEther("200"), issuerToken);

        const rateAfter = await srCVR.exchangeRateMantissa();

        // Rate should have increased: (1000 + 200) * 1e18 / 1000 = 1.2e18
        expect(rateAfter).to.be.gt(rateBefore);
        expect(rateAfter).to.equal(ethers.parseEther("1.2"));
      });

      it("should return more USDT on redeem after yield accrual", async function () {
        const { srCVR, usdt, pool, user1, issuerToken } = await loadFixture(deployTokensFixture);

        await srCVR.connect(pool).mint(user1.address, ethers.parseEther("1000"), issuerToken);

        // Accrue 500 USDT yield => rate = 1.5
        await srCVR.connect(pool).accrueYield(ethers.parseEther("500"), issuerToken);

        const balBefore = await usdt.balanceOf(user1.address);

        // Redeem 100 srCVR => should get 150 USDT
        await srCVR.connect(pool).redeem(user1.address, ethers.parseEther("100"), issuerToken);

        const balAfter = await usdt.balanceOf(user1.address);
        expect(balAfter - balBefore).to.equal(ethers.parseEther("150"));
      });
    });

    // ─── 3. Only InsurancePool can mint/burn ─────────────────────────

    describe("Only InsurancePool (pool) can mint/burn", function () {
      it("should revert mint from non-pool address", async function () {
        const { srCVR, attacker, user1, issuerToken } = await loadFixture(deployTokensFixture);

        await expect(
          srCVR.connect(attacker).mint(user1.address, ethers.parseEther("100"), issuerToken)
        ).to.be.revertedWith("srCVR: only pool");
      });

      it("should revert redeem from non-pool address", async function () {
        const { srCVR, pool, attacker, user1, issuerToken } = await loadFixture(deployTokensFixture);

        await srCVR.connect(pool).mint(user1.address, ethers.parseEther("100"), issuerToken);

        await expect(
          srCVR.connect(attacker).redeem(user1.address, ethers.parseEther("50"), issuerToken)
        ).to.be.revertedWith("srCVR: only pool");
      });

      it("should revert accrueYield from non-pool address", async function () {
        const { srCVR, attacker, issuerToken } = await loadFixture(deployTokensFixture);

        await expect(
          srCVR.connect(attacker).accrueYield(ethers.parseEther("100"), issuerToken)
        ).to.be.revertedWith("srCVR: only pool");
      });

      it("should revert liquidate from non-pool address", async function () {
        const { srCVR, attacker, issuerToken } = await loadFixture(deployTokensFixture);

        await expect(
          srCVR.connect(attacker).liquidate(issuerToken)
        ).to.be.revertedWith("srCVR: only pool");
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  jrCVR Tests
  // ═══════════════════════════════════════════════════════════════════

  describe("jrCVR", function () {
    // ─── 4. 1:1 USDT minting ────────────────────────────────────────

    describe("1:1 USDT minting", function () {
      it("should mint jrCVR tokens 1:1 with USDT amount", async function () {
        const { jrCVR, pool, user1, issuerToken } = await loadFixture(deployTokensFixture);

        await jrCVR.connect(pool).mint(user1.address, ethers.parseEther("5000"), issuerToken);

        expect(await jrCVR.balanceOf(user1.address)).to.equal(ethers.parseEther("5000"));
        expect(await jrCVR.totalUnderlying()).to.equal(ethers.parseEther("5000"));
      });

      it("should track per-issuer pool underlying and supply", async function () {
        const { jrCVR, pool, user1, issuerToken } = await loadFixture(deployTokensFixture);

        await jrCVR.connect(pool).mint(user1.address, ethers.parseEther("3000"), issuerToken);

        expect(await jrCVR.poolUnderlying(issuerToken)).to.equal(ethers.parseEther("3000"));
        expect(await jrCVR.poolSupply(issuerToken)).to.equal(ethers.parseEther("3000"));
      });
    });

    // ─── 5. Epoch-based yield distribution ──────────────────────────

    describe("Epoch-based yield distribution", function () {
      it("should accumulate yield in the current epoch", async function () {
        const { jrCVR, pool, issuerToken } = await loadFixture(deployTokensFixture);

        const epochBefore = await jrCVR.currentEpoch();
        await jrCVR.connect(pool).accrueYield(ethers.parseEther("100"), issuerToken);

        expect(await jrCVR.epochYield(epochBefore)).to.equal(ethers.parseEther("100"));
      });

      it("should advance epoch and track yield separately", async function () {
        const { jrCVR, pool, issuerToken } = await loadFixture(deployTokensFixture);

        // Yield in epoch 0
        await jrCVR.connect(pool).accrueYield(ethers.parseEther("100"), issuerToken);
        expect(await jrCVR.epochYield(0)).to.equal(ethers.parseEther("100"));

        // Advance to epoch 1
        await jrCVR.connect(pool).advanceEpoch();
        expect(await jrCVR.currentEpoch()).to.equal(1);

        // Yield in epoch 1
        await jrCVR.connect(pool).accrueYield(ethers.parseEther("200"), issuerToken);
        expect(await jrCVR.epochYield(1)).to.equal(ethers.parseEther("200"));

        // Epoch 0 yield unchanged
        expect(await jrCVR.epochYield(0)).to.equal(ethers.parseEther("100"));
      });

      it("should increase poolUnderlying when yield accrues", async function () {
        const { jrCVR, pool, user1, issuerToken } = await loadFixture(deployTokensFixture);

        await jrCVR.connect(pool).mint(user1.address, ethers.parseEther("1000"), issuerToken);
        await jrCVR.connect(pool).accrueYield(ethers.parseEther("200"), issuerToken);

        expect(await jrCVR.poolUnderlying(issuerToken)).to.equal(ethers.parseEther("1200"));
        expect(await jrCVR.totalUnderlying()).to.equal(ethers.parseEther("1200"));
      });

      it("should redeem more USDT after yield accrual (pro-rata)", async function () {
        const { jrCVR, usdt, pool, user1, issuerToken } = await loadFixture(deployTokensFixture);

        await jrCVR.connect(pool).mint(user1.address, ethers.parseEther("1000"), issuerToken);

        // Accrue 500 USDT yield => poolUnderlying = 1500, poolSupply = 1000
        await jrCVR.connect(pool).accrueYield(ethers.parseEther("500"), issuerToken);

        const balBefore = await usdt.balanceOf(user1.address);

        // Redeem 200 jrCVR => share = (200 * 1500) / 1000 = 300
        await jrCVR.connect(pool).redeem(user1.address, ethers.parseEther("200"), issuerToken);

        const balAfter = await usdt.balanceOf(user1.address);
        expect(balAfter - balBefore).to.equal(ethers.parseEther("300"));
      });
    });

    // ─── 6. Only InsurancePool can mint/burn ─────────────────────────

    describe("Only InsurancePool (pool) can mint/burn", function () {
      it("should revert mint from non-pool address", async function () {
        const { jrCVR, attacker, user1, issuerToken } = await loadFixture(deployTokensFixture);

        await expect(
          jrCVR.connect(attacker).mint(user1.address, ethers.parseEther("100"), issuerToken)
        ).to.be.revertedWith("jrCVR: only pool");
      });

      it("should revert redeem from non-pool address", async function () {
        const { jrCVR, pool, attacker, user1, issuerToken } = await loadFixture(deployTokensFixture);

        await jrCVR.connect(pool).mint(user1.address, ethers.parseEther("100"), issuerToken);

        await expect(
          jrCVR.connect(attacker).redeem(user1.address, ethers.parseEther("50"), issuerToken)
        ).to.be.revertedWith("jrCVR: only pool");
      });

      it("should revert advanceEpoch from non-pool address", async function () {
        const { jrCVR, attacker } = await loadFixture(deployTokensFixture);

        await expect(
          jrCVR.connect(attacker).advanceEpoch()
        ).to.be.revertedWith("jrCVR: only pool");
      });

      it("should revert liquidate from non-pool address", async function () {
        const { jrCVR, attacker, issuerToken } = await loadFixture(deployTokensFixture);

        await expect(
          jrCVR.connect(attacker).liquidate(issuerToken)
        ).to.be.revertedWith("jrCVR: only pool");
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  ProtectionCert Tests
  // ═══════════════════════════════════════════════════════════════════

  describe("ProtectionCert", function () {
    // ─── 7. Soulbound (no transfers) ─────────────────────────────────

    describe("ERC-721 soulbound (no transfers)", function () {
      it("should allow minting (from = address(0))", async function () {
        const { protectionCert, payoutEngine, user1, issuerToken } =
          await loadFixture(deployTokensFixture);

        const tx = await protectionCert
          .connect(payoutEngine)
          .mint(user1.address, issuerToken, ethers.parseEther("1000"), ethers.parseEther("5000"), ethers.parseEther("1000"));

        await expect(tx).to.emit(protectionCert, "CertMinted");
        expect(await protectionCert.ownerOf(1)).to.equal(user1.address);
      });

      it("should block transfer between holders", async function () {
        const { protectionCert, payoutEngine, user1, user2, issuerToken } =
          await loadFixture(deployTokensFixture);

        await protectionCert
          .connect(payoutEngine)
          .mint(user1.address, issuerToken, ethers.parseEther("1000"), ethers.parseEther("5000"), ethers.parseEther("1000"));

        await expect(
          protectionCert
            .connect(user1)
            .transferFrom(user1.address, user2.address, 1)
        ).to.be.revertedWith("ProCert: soulbound, non-transferable");
      });

      it("should block safeTransferFrom between holders", async function () {
        const { protectionCert, payoutEngine, user1, user2, issuerToken } =
          await loadFixture(deployTokensFixture);

        await protectionCert
          .connect(payoutEngine)
          .mint(user1.address, issuerToken, ethers.parseEther("1000"), ethers.parseEther("5000"), ethers.parseEther("1000"));

        await expect(
          protectionCert
            .connect(user1)
            ["safeTransferFrom(address,address,uint256)"](user1.address, user2.address, 1)
        ).to.be.revertedWith("ProCert: soulbound, non-transferable");
      });

      it("should allow burning (to = address(0))", async function () {
        const { protectionCert, payoutEngine, user1, issuerToken } =
          await loadFixture(deployTokensFixture);

        await protectionCert
          .connect(payoutEngine)
          .mint(user1.address, issuerToken, ethers.parseEther("1000"), ethers.parseEther("5000"), ethers.parseEther("1000"));

        await expect(
          protectionCert.connect(payoutEngine).burn(1)
        ).to.emit(protectionCert, "CertBurned");
      });
    });

    // ─── 8. locked() always returns true (ERC-5192) ──────────────────

    describe("locked() always returns true (ERC-5192)", function () {
      it("should return true for any tokenId", async function () {
        const { protectionCert, payoutEngine, user1, issuerToken } =
          await loadFixture(deployTokensFixture);

        await protectionCert
          .connect(payoutEngine)
          .mint(user1.address, issuerToken, ethers.parseEther("1000"), ethers.parseEther("5000"), ethers.parseEther("1000"));

        expect(await protectionCert.locked(1)).to.be.true;
        // Even non-existent token IDs return true (pure function)
        expect(await protectionCert.locked(999)).to.be.true;
      });
    });

    // ─── 9. Only PayoutEngine can mint/burn ──────────────────────────

    describe("Only PayoutEngine can mint/burn", function () {
      it("should revert mint from unauthorized address", async function () {
        const { protectionCert, attacker, user1, issuerToken } =
          await loadFixture(deployTokensFixture);

        await expect(
          protectionCert
            .connect(attacker)
            .mint(user1.address, issuerToken, ethers.parseEther("1000"), ethers.parseEther("5000"), ethers.parseEther("1000"))
        ).to.be.revertedWith("ProCert: unauthorized");
      });

      it("should revert burn from unauthorized address", async function () {
        const { protectionCert, payoutEngine, attacker, user1, issuerToken } =
          await loadFixture(deployTokensFixture);

        await protectionCert
          .connect(payoutEngine)
          .mint(user1.address, issuerToken, ethers.parseEther("1000"), ethers.parseEther("5000"), ethers.parseEther("1000"));

        await expect(
          protectionCert.connect(attacker).burn(1)
        ).to.be.revertedWith("ProCert: unauthorized");
      });

      it("should allow owner to mint", async function () {
        const { protectionCert, owner, user1, issuerToken } =
          await loadFixture(deployTokensFixture);

        // owner() is also authorized in the require check
        await expect(
          protectionCert
            .connect(owner)
            .mint(user1.address, issuerToken, ethers.parseEther("500"), ethers.parseEther("2000"), ethers.parseEther("500"))
        ).to.not.be.reverted;
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  SubrogationNFT Tests
  // ═══════════════════════════════════════════════════════════════════

  describe("SubrogationNFT", function () {
    // ─── 10. Non-transferable except by Foundation ───────────────────

    describe("Non-transferable except by Foundation", function () {
      it("should allow minting (from = address(0))", async function () {
        const { subrogationNFT, payoutEngine, foundation, issuerToken } =
          await loadFixture(deployTokensFixture);

        const tx = await subrogationNFT
          .connect(payoutEngine)
          .mint(
            foundation.address,
            issuerToken,
            0, // defaultType
            ethers.parseEther("5000"),
            ethers.parseEther("1000"),
            ethers.parseEther("2000"),
            ethers.parseEther("2000"),
            5 // holderCount
          );

        await expect(tx).to.emit(subrogationNFT, "SubrogationClaimed");
        expect(await subrogationNFT.ownerOf(1)).to.equal(foundation.address);
      });

      it("should allow foundation to transfer", async function () {
        const { subrogationNFT, payoutEngine, foundation, user1, issuerToken } =
          await loadFixture(deployTokensFixture);

        await subrogationNFT
          .connect(payoutEngine)
          .mint(
            foundation.address,
            issuerToken,
            0,
            ethers.parseEther("5000"),
            ethers.parseEther("1000"),
            ethers.parseEther("2000"),
            ethers.parseEther("2000"),
            5
          );

        // Foundation can transfer
        await expect(
          subrogationNFT
            .connect(foundation)
            .transferFrom(foundation.address, user1.address, 1)
        ).to.not.be.reverted;

        expect(await subrogationNFT.ownerOf(1)).to.equal(user1.address);
      });

      it("should block transfer by non-foundation holder", async function () {
        const { subrogationNFT, payoutEngine, foundation, user1, user2, issuerToken } =
          await loadFixture(deployTokensFixture);

        // Mint to foundation, then foundation transfers to user1
        await subrogationNFT
          .connect(payoutEngine)
          .mint(
            foundation.address,
            issuerToken,
            0,
            ethers.parseEther("5000"),
            ethers.parseEther("1000"),
            ethers.parseEther("2000"),
            ethers.parseEther("2000"),
            5
          );

        await subrogationNFT
          .connect(foundation)
          .transferFrom(foundation.address, user1.address, 1);

        // user1 should NOT be able to transfer further
        await expect(
          subrogationNFT
            .connect(user1)
            .transferFrom(user1.address, user2.address, 1)
        ).to.be.revertedWith("SubrogationNFT: only foundation can transfer");
      });
    });

    // ─── 11. Claim data storage and retrieval ────────────────────────

    describe("Claim data storage and retrieval", function () {
      it("should store and return correct claim data", async function () {
        const { subrogationNFT, payoutEngine, foundation, issuerToken } =
          await loadFixture(deployTokensFixture);

        await subrogationNFT
          .connect(payoutEngine)
          .mint(
            foundation.address,
            issuerToken,
            2, // COLLATERAL_SHORTFALL
            ethers.parseEther("10000"),
            ethers.parseEther("2000"),
            ethers.parseEther("3000"),
            ethers.parseEther("5000"),
            10
          );

        const claim = await subrogationNFT.getClaimData(1);

        expect(claim.issuerToken).to.equal(issuerToken);
        expect(claim.defaultType).to.equal(2);
        expect(claim.totalPayoutAmount).to.equal(ethers.parseEther("10000"));
        expect(claim.bondLiquidated).to.equal(ethers.parseEther("2000"));
        expect(claim.juniorLiquidated).to.equal(ethers.parseEther("3000"));
        expect(claim.seniorLiquidated).to.equal(ethers.parseEther("5000"));
        expect(claim.insuredHolderCount).to.equal(10);
        expect(claim.payoutBlock).to.be.gt(0);
      });

      it("should map issuerToken to tokenId via claimByIssuer", async function () {
        const { subrogationNFT, payoutEngine, foundation, issuerToken } =
          await loadFixture(deployTokensFixture);

        await subrogationNFT
          .connect(payoutEngine)
          .mint(
            foundation.address,
            issuerToken,
            0,
            ethers.parseEther("5000"),
            ethers.parseEther("1000"),
            ethers.parseEther("2000"),
            ethers.parseEther("2000"),
            5
          );

        expect(await subrogationNFT.getClaimByIssuer(issuerToken)).to.equal(1);
      });
    });

    // ─── 12. Only PayoutEngine can mint ──────────────────────────────

    describe("Only PayoutEngine can mint", function () {
      it("should revert mint from unauthorized address", async function () {
        const { subrogationNFT, attacker, foundation, issuerToken } =
          await loadFixture(deployTokensFixture);

        await expect(
          subrogationNFT
            .connect(attacker)
            .mint(
              foundation.address,
              issuerToken,
              0,
              ethers.parseEther("5000"),
              ethers.parseEther("1000"),
              ethers.parseEther("2000"),
              ethers.parseEther("2000"),
              5
            )
        ).to.be.revertedWith("SubrogationNFT: unauthorized");
      });

      it("should allow owner to mint", async function () {
        const { subrogationNFT, owner, foundation, issuerToken } =
          await loadFixture(deployTokensFixture);

        await expect(
          subrogationNFT
            .connect(owner)
            .mint(
              foundation.address,
              issuerToken,
              1, // GHOST_ISSUER
              ethers.parseEther("3000"),
              ethers.parseEther("500"),
              ethers.parseEther("1000"),
              ethers.parseEther("1500"),
              3
            )
        ).to.not.be.reverted;
      });
    });
  });
});
