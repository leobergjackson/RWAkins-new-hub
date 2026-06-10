import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

/**
 * SubrogationNFT — comprehensive contract test suite
 *
 * Covers categories from the test plan:
 *   F  — Token ID enumeration (nextTokenId, loop boundaries, BigInt handling)
 *   G  — getClaimData() struct deserialization (all 8 fields, BigInt wrapping)
 *   H  — NFT data correctness (amounts, ownership, struct integrity)
 *   M  — Multiple NFTs (ordering, isolation, all 4 default types)
 *   Q  — Regression checks (off-by-one loop, Number() vs .toNumber(), enum mapping)
 *   +  — Authorization, transfer restrictions, events, getClaimByIssuer
 */

describe("SubrogationNFT", function () {

  // Contract enum constants (mirrors SubrogationNFT.sol line 17)
  const PAYMENT_DELAY       = 0;
  const GHOST_ISSUER        = 1;
  const COLLATERAL_SHORTFALL = 2;
  const MISAPPROPRIATION    = 3;

  const E18 = ethers.parseEther;

  // ─── Fixtures ────────────────────────────────────────────────────────────

  async function deployFixture() {
    const [owner, payoutEngine, foundation, other, attacker] = await ethers.getSigners();

    const SubrogationNFT = await ethers.getContractFactory("SubrogationNFT");
    const nft = await SubrogationNFT.deploy(payoutEngine.address, foundation.address);

    const issuer1 = other.address;
    const issuer2 = attacker.address;

    return { nft, owner, payoutEngine, foundation, other, attacker, issuer1, issuer2 };
  }

  async function deployWithOneMint() {
    const base = await deployFixture();
    const { nft, payoutEngine, foundation, issuer1 } = base;
    await nft.connect(payoutEngine).mint(
      foundation.address,
      issuer1,
      PAYMENT_DELAY,
      E18("15"),
      E18("5"),
      E18("3"),
      E18("7"),
      1n
    );
    return base;
  }

  async function deployWithTwoMints() {
    const base = await deployFixture();
    const { nft, payoutEngine, foundation, issuer1, issuer2 } = base;
    await nft.connect(payoutEngine).mint(
      foundation.address, issuer1, PAYMENT_DELAY, E18("15"), E18("5"), E18("3"), E18("7"), 1n
    );
    await nft.connect(payoutEngine).mint(
      foundation.address, issuer2, GHOST_ISSUER, E18("20"), E18("10"), E18("5"), E18("5"), 3n
    );
    return base;
  }

  // =========================================================================
  // CATEGORY F — Token ID Enumeration
  // =========================================================================

  describe("F — Token ID Enumeration", function () {

    describe("F1 — nextTokenId boundaries", function () {
      it("F1.1: nextTokenId = 1 before any mints", async function () {
        const { nft } = await loadFixture(deployFixture);
        expect(await nft.nextTokenId()).to.equal(1n);
      });

      it("F1.2: nextTokenId = 2 after 1 mint; totalMinted = Number(nextTokenId)-1 = 1", async function () {
        const { nft } = await loadFixture(deployWithOneMint);
        const nextId = await nft.nextTokenId();
        expect(nextId).to.equal(2n);
        expect(Number(nextId) - 1).to.equal(1);
      });

      it("F1.3: nextTokenId = 3 after 2 mints; totalMinted = 2", async function () {
        const { nft } = await loadFixture(deployWithTwoMints);
        const nextId = await nft.nextTokenId();
        expect(nextId).to.equal(3n);
        expect(Number(nextId) - 1).to.equal(2);
      });

      it("F1.4: 10 mints → nextTokenId = 11, totalMinted = 10", async function () {
        const { nft, payoutEngine, foundation, issuer1 } = await loadFixture(deployFixture);
        for (let i = 0; i < 10; i++) {
          await nft.connect(payoutEngine).mint(
            foundation.address, issuer1, PAYMENT_DELAY, E18("1"), 0n, 0n, E18("1"), 1n
          );
        }
        const nextId = await nft.nextTokenId();
        expect(nextId).to.equal(11n);
        expect(Number(nextId) - 1).to.equal(10);
      });
    });

    describe("F2 — Loop start: first valid token ID is 1, not 0", function () {
      it("F2.1: getClaimData(1) returns real data after first mint", async function () {
        const { nft } = await loadFixture(deployWithOneMint);
        const claim = await nft.getClaimData(1);
        expect(claim.issuerToken).to.not.equal(ethers.ZeroAddress);
        expect(claim.totalPayoutAmount).to.equal(E18("15"));
      });

      it("F2.2: getClaimData(0) returns empty struct (zero address, zero amounts)", async function () {
        const { nft } = await loadFixture(deployWithOneMint);
        const claim = await nft.getClaimData(0);
        expect(claim.issuerToken).to.equal(ethers.ZeroAddress);
        expect(claim.totalPayoutAmount).to.equal(0n);
        expect(claim.bondLiquidated).to.equal(0n);
      });

      it("F2.3: last valid tokenId = Number(nextTokenId) - 1", async function () {
        const { nft } = await loadFixture(deployWithTwoMints);
        const lastId = Number(await nft.nextTokenId()) - 1;
        expect(lastId).to.equal(2);
        const claim = await nft.getClaimData(lastId);
        expect(claim.issuerToken).to.not.equal(ethers.ZeroAddress);
      });
    });

    describe("F3 — BigInt handling of nextTokenId", function () {
      it("F3.1: nextTokenId is returned as BigInt by ethers v6", async function () {
        const { nft } = await loadFixture(deployFixture);
        const id = await nft.nextTokenId();
        expect(typeof id).to.equal("bigint");
      });

      it("F3.2: Number(nextTokenId) cast succeeds without .toNumber()", async function () {
        const { nft } = await loadFixture(deployFixture);
        const id = await nft.nextTokenId();
        // ethers v6: BigInt has no .toNumber method
        expect((id as any).toNumber).to.equal(undefined);
        expect(() => Number(id)).to.not.throw();
        expect(Number(id)).to.equal(1);
      });

      it("F3.3: totalMinted = Number(nextTokenId) - 1 arithmetic is exact", async function () {
        const { nft } = await loadFixture(deployWithOneMint);
        const nextId = await nft.nextTokenId();
        const totalMinted = Number(nextId) - 1;
        expect(totalMinted).to.equal(1);
      });
    });
  });

  // =========================================================================
  // CATEGORY G — getClaimData() Struct Deserialization
  // =========================================================================

  describe("G — Struct Deserialization", function () {

    describe("G1 — All 8 fields stored and retrievable by name", function () {
      it("G1.1: issuerToken stored and returned correctly", async function () {
        const { nft, issuer1 } = await loadFixture(deployWithOneMint);
        expect((await nft.getClaimData(1)).issuerToken).to.equal(issuer1);
      });

      it("G1.2: defaultType stored correctly (0 = PAYMENT_DELAY)", async function () {
        const { nft } = await loadFixture(deployWithOneMint);
        expect((await nft.getClaimData(1)).defaultType).to.equal(PAYMENT_DELAY);
      });

      it("G1.3: totalPayoutAmount = $15 stored correctly", async function () {
        const { nft } = await loadFixture(deployWithOneMint);
        expect((await nft.getClaimData(1)).totalPayoutAmount).to.equal(E18("15"));
      });

      it("G1.4: bondLiquidated = $5 stored correctly", async function () {
        const { nft } = await loadFixture(deployWithOneMint);
        expect((await nft.getClaimData(1)).bondLiquidated).to.equal(E18("5"));
      });

      it("G1.5: juniorLiquidated = $3 stored correctly", async function () {
        const { nft } = await loadFixture(deployWithOneMint);
        expect((await nft.getClaimData(1)).juniorLiquidated).to.equal(E18("3"));
      });

      it("G1.6: seniorLiquidated = $7 stored correctly", async function () {
        const { nft } = await loadFixture(deployWithOneMint);
        expect((await nft.getClaimData(1)).seniorLiquidated).to.equal(E18("7"));
      });

      it("G1.7: insuredHolderCount = 1 stored correctly", async function () {
        const { nft } = await loadFixture(deployWithOneMint);
        expect((await nft.getClaimData(1)).insuredHolderCount).to.equal(1n);
      });

      it("G1.8: payoutBlock = block.number (non-zero, non-negative)", async function () {
        const { nft } = await loadFixture(deployWithOneMint);
        const claim = await nft.getClaimData(1);
        expect(claim.payoutBlock).to.be.greaterThan(0n);
      });
    });

    describe("G2 — BigInt field handling for frontend Number() wrapping", function () {
      it("G2.1: Number(defaultType) = 0 → valid array index for DEFAULT_TYPES", async function () {
        const { nft } = await loadFixture(deployWithOneMint);
        const idx = Number((await nft.getClaimData(1)).defaultType);
        expect(idx).to.equal(0);
        // DEFAULT_TYPES[0] = 'PAYMENT_DELAY'
      });

      it("G2.2: Number(insuredHolderCount) works for integer display", async function () {
        const { nft } = await loadFixture(deployWithOneMint);
        expect(Number((await nft.getClaimData(1)).insuredHolderCount)).to.equal(1);
      });

      it("G2.3: Number(payoutBlock) works for .toLocaleString()", async function () {
        const { nft } = await loadFixture(deployWithOneMint);
        const block = Number((await nft.getClaimData(1)).payoutBlock);
        expect(() => block.toLocaleString()).to.not.throw();
        expect(block).to.be.greaterThan(0);
      });

      it("G2.4: totalPayoutAmount returned as BigInt (formatUSDT-compatible)", async function () {
        const { nft } = await loadFixture(deployWithOneMint);
        const val = (await nft.getClaimData(1)).totalPayoutAmount;
        expect(typeof val).to.equal("bigint");
        expect(val).to.equal(E18("15"));
      });

      it("G2.5: bondLiquidated is BigInt", async function () {
        const { nft } = await loadFixture(deployWithOneMint);
        expect(typeof (await nft.getClaimData(1)).bondLiquidated).to.equal("bigint");
      });

      it("G2.6: juniorLiquidated is BigInt", async function () {
        const { nft } = await loadFixture(deployWithOneMint);
        expect(typeof (await nft.getClaimData(1)).juniorLiquidated).to.equal("bigint");
      });

      it("G2.7: seniorLiquidated is BigInt", async function () {
        const { nft } = await loadFixture(deployWithOneMint);
        expect(typeof (await nft.getClaimData(1)).seniorLiquidated).to.equal("bigint");
      });
    });
  });

  // =========================================================================
  // CATEGORY H — NFT Data Correctness
  // =========================================================================

  describe("H — NFT Data Correctness", function () {

    describe("H1 — All amounts correct for $5 bond + $3 junior + $7 senior default", function () {
      it("H1.2: issuerToken matches address passed to mint", async function () {
        const { nft, issuer1 } = await loadFixture(deployWithOneMint);
        expect((await nft.getClaimData(1)).issuerToken).to.equal(issuer1);
      });

      it("H1.4: defaultType = PAYMENT_DELAY (0)", async function () {
        const { nft } = await loadFixture(deployWithOneMint);
        expect(Number((await nft.getClaimData(1)).defaultType)).to.equal(PAYMENT_DELAY);
      });

      it("H1.5: bondLiquidated = $5", async function () {
        const { nft } = await loadFixture(deployWithOneMint);
        expect((await nft.getClaimData(1)).bondLiquidated).to.equal(E18("5"));
      });

      it("H1.6: juniorLiquidated = $3", async function () {
        const { nft } = await loadFixture(deployWithOneMint);
        expect((await nft.getClaimData(1)).juniorLiquidated).to.equal(E18("3"));
      });

      it("H1.7: seniorLiquidated = $7", async function () {
        const { nft } = await loadFixture(deployWithOneMint);
        expect((await nft.getClaimData(1)).seniorLiquidated).to.equal(E18("7"));
      });

      it("H1.8: totalPayoutAmount = $15 (bond+junior+senior)", async function () {
        const { nft } = await loadFixture(deployWithOneMint);
        expect((await nft.getClaimData(1)).totalPayoutAmount).to.equal(E18("15"));
      });

      it("H1.9: insuredHolderCount = 1", async function () {
        const { nft } = await loadFixture(deployWithOneMint);
        expect((await nft.getClaimData(1)).insuredHolderCount).to.equal(1n);
      });
    });

    describe("H2 — View on Explorer: ownership and tokenId", function () {
      it("H2.2: ownerOf(1) = foundation address after mint", async function () {
        const { nft, foundation } = await loadFixture(deployWithOneMint);
        expect(await nft.ownerOf(1)).to.equal(foundation.address);
      });

      it("H2.1: getClaimData(tokenId=1) is accessible (View on Explorer href)", async function () {
        const { nft } = await loadFixture(deployWithOneMint);
        const claim = await nft.getClaimData(1);
        expect(claim.issuerToken).to.not.equal(ethers.ZeroAddress);
      });
    });

    describe("H3 — No bad values in struct", function () {
      it("H3.1: issuerToken is not zero address", async function () {
        const { nft } = await loadFixture(deployWithOneMint);
        expect((await nft.getClaimData(1)).issuerToken).to.not.equal(ethers.ZeroAddress);
      });

      it("H3.3: totalPayoutAmount > 0", async function () {
        const { nft } = await loadFixture(deployWithOneMint);
        expect((await nft.getClaimData(1)).totalPayoutAmount).to.be.greaterThan(0n);
      });

      it("H3.5: payoutBlock > 0", async function () {
        const { nft } = await loadFixture(deployWithOneMint);
        expect((await nft.getClaimData(1)).payoutBlock).to.be.greaterThan(0n);
      });
    });
  });

  // =========================================================================
  // CATEGORY M — Multiple NFTs
  // =========================================================================

  describe("M — Multiple NFTs", function () {

    describe("M1 — Ordering and isolation", function () {
      it("M1.1: both NFT #1 and #2 exist after 2 mints", async function () {
        const { nft, foundation } = await loadFixture(deployWithTwoMints);
        expect(await nft.ownerOf(1)).to.equal(foundation.address);
        expect(await nft.ownerOf(2)).to.equal(foundation.address);
      });

      it("M1.2: NFT #1 and #2 have different issuer addresses", async function () {
        const { nft } = await loadFixture(deployWithTwoMints);
        const c1 = await nft.getClaimData(1);
        const c2 = await nft.getClaimData(2);
        expect(c1.issuerToken).to.not.equal(c2.issuerToken);
      });

      it("M1.3: getClaimByIssuer maps each issuer to correct tokenId", async function () {
        const { nft, issuer1, issuer2 } = await loadFixture(deployWithTwoMints);
        expect(await nft.getClaimByIssuer(issuer1)).to.equal(1n);
        expect(await nft.getClaimByIssuer(issuer2)).to.equal(2n);
      });

      it("M1.4: each card has independent defaultType", async function () {
        const { nft } = await loadFixture(deployWithTwoMints);
        expect(Number((await nft.getClaimData(1)).defaultType)).to.equal(PAYMENT_DELAY);
        expect(Number((await nft.getClaimData(2)).defaultType)).to.equal(GHOST_ISSUER);
      });

      it("M1.5: amounts are isolated per NFT (no cross-contamination)", async function () {
        const { nft } = await loadFixture(deployWithTwoMints);
        expect((await nft.getClaimData(1)).totalPayoutAmount).to.equal(E18("15"));
        expect((await nft.getClaimData(2)).totalPayoutAmount).to.equal(E18("20"));
      });
    });

    describe("M2 — All 4 default type values can be stored", function () {
      it("M2.1: all 4 defaultType values (0-3) store and retrieve correctly", async function () {
        const { nft, payoutEngine, foundation, issuer1 } = await loadFixture(deployFixture);
        for (let t = 0; t < 4; t++) {
          await nft.connect(payoutEngine).mint(
            foundation.address, issuer1, t, E18("1"), 0n, 0n, E18("1"), 1n
          );
          expect(Number((await nft.getClaimData(t + 1)).defaultType)).to.equal(t);
        }
      });

      it("M2.2: two NFTs with same defaultType=0 both return PAYMENT_DELAY index", async function () {
        const { nft, payoutEngine, foundation, issuer1, issuer2 } = await loadFixture(deployFixture);
        await nft.connect(payoutEngine).mint(foundation.address, issuer1, PAYMENT_DELAY, E18("5"), 0n, 0n, E18("5"), 1n);
        await nft.connect(payoutEngine).mint(foundation.address, issuer2, PAYMENT_DELAY, E18("5"), 0n, 0n, E18("5"), 1n);
        expect(Number((await nft.getClaimData(1)).defaultType)).to.equal(0);
        expect(Number((await nft.getClaimData(2)).defaultType)).to.equal(0);
      });

      it("M2.3: defaultType=2 is COLLATERAL_SHORTFALL (distinct from GHOST_ISSUER=1)", async function () {
        const { nft, payoutEngine, foundation, issuer1 } = await loadFixture(deployFixture);
        await nft.connect(payoutEngine).mint(
          foundation.address, issuer1, COLLATERAL_SHORTFALL, E18("5"), 0n, 0n, E18("5"), 1n
        );
        expect(Number((await nft.getClaimData(1)).defaultType)).to.equal(2);
        expect(Number((await nft.getClaimData(1)).defaultType)).to.not.equal(GHOST_ISSUER);
      });
    });
  });

  // =========================================================================
  // Authorization
  // =========================================================================

  describe("Authorization", function () {
    it("attacker cannot mint", async function () {
      const { nft, attacker, foundation, issuer1 } = await loadFixture(deployFixture);
      await expect(
        nft.connect(attacker).mint(foundation.address, issuer1, PAYMENT_DELAY, E18("1"), 0n, 0n, E18("1"), 1n)
      ).to.be.revertedWith("SubrogationNFT: unauthorized");
    });

    it("owner can mint directly (without going through payoutEngine)", async function () {
      const { nft, owner, foundation, issuer1 } = await loadFixture(deployFixture);
      await expect(
        nft.connect(owner).mint(foundation.address, issuer1, PAYMENT_DELAY, E18("1"), 0n, 0n, E18("1"), 1n)
      ).to.not.be.reverted;
    });

    it("payoutEngine can mint", async function () {
      const { nft, payoutEngine, foundation, issuer1 } = await loadFixture(deployFixture);
      await expect(
        nft.connect(payoutEngine).mint(foundation.address, issuer1, PAYMENT_DELAY, E18("1"), 0n, 0n, E18("1"), 1n)
      ).to.not.be.reverted;
    });

    it("getClaimByIssuer returns 0 for unknown issuer", async function () {
      const { nft, issuer1 } = await loadFixture(deployFixture);
      expect(await nft.getClaimByIssuer(issuer1)).to.equal(0n);
    });
  });

  // =========================================================================
  // Transfer Restrictions
  // =========================================================================

  describe("Transfer Restrictions", function () {
    it("foundation can transfer its NFT to another address", async function () {
      const { nft, foundation, other } = await loadFixture(deployWithOneMint);
      await expect(
        nft.connect(foundation).transferFrom(foundation.address, other.address, 1)
      ).to.not.be.reverted;
    });

    it("non-foundation holder cannot transfer (reverts with reason)", async function () {
      const { nft, payoutEngine, foundation, other, issuer1 } = await loadFixture(deployFixture);
      // Mint to 'other' directly (not foundation)
      await nft.connect(payoutEngine).mint(
        other.address, issuer1, PAYMENT_DELAY, E18("1"), 0n, 0n, E18("1"), 1n
      );
      await expect(
        nft.connect(other).transferFrom(other.address, foundation.address, 1)
      ).to.be.revertedWith("SubrogationNFT: only foundation can transfer");
    });

    it("ERC-721 name and symbol are set correctly", async function () {
      const { nft } = await loadFixture(deployFixture);
      expect(await nft.name()).to.equal("CoverFi Subrogation Claim");
      expect(await nft.symbol()).to.equal("SubClaim");
    });
  });

  // =========================================================================
  // Events
  // =========================================================================

  describe("Events", function () {
    it("SubrogationClaimed emitted with tokenId=1, issuerToken, totalPayout", async function () {
      const { nft, payoutEngine, foundation, issuer1 } = await loadFixture(deployFixture);
      const tx = await nft.connect(payoutEngine).mint(
        foundation.address, issuer1, PAYMENT_DELAY, E18("15"), E18("5"), E18("3"), E18("7"), 1n
      );
      const receipt = await tx.wait();
      const event = receipt!.logs
        .map((log: any) => { try { return nft.interface.parseLog(log); } catch { return null; } })
        .find((e: any) => e && e.name === "SubrogationClaimed");
      expect(event).to.not.be.null;
      expect(event!.args[0]).to.equal(1n);           // tokenId
      expect(event!.args[1]).to.equal(issuer1);       // issuerToken
      expect(event!.args[2]).to.equal(E18("15"));     // totalPayout
    });

    it("nextTokenId increments by 1 per mint", async function () {
      const { nft, payoutEngine, foundation, issuer1 } = await loadFixture(deployFixture);
      for (let i = 1; i <= 3; i++) {
        await nft.connect(payoutEngine).mint(foundation.address, issuer1, PAYMENT_DELAY, E18("1"), 0n, 0n, E18("1"), 1n);
        expect(await nft.nextTokenId()).to.equal(BigInt(i + 1));
      }
    });
  });

  // =========================================================================
  // CATEGORY Q — Regression Tests
  // =========================================================================

  describe("Q — Regression", function () {
    it("Q1.1 + Q1.4: totalMinted = Number(nextTokenId)-1, not Number(nextTokenId)", async function () {
      const { nft } = await loadFixture(deployWithOneMint);
      const nextId = await nft.nextTokenId();
      // Correct calculation
      expect(Number(nextId) - 1).to.equal(1);
      // Off-by-one (wrong) would give 2
      expect(Number(nextId)).to.equal(2);
    });

    it("Q1.2: ethers v6 BigInt has no .toNumber() — Number() is the correct cast", async function () {
      const { nft } = await loadFixture(deployFixture);
      const nextId = await nft.nextTokenId();
      // BigInt from ethers v6 does not have .toNumber
      expect((nextId as any).toNumber).to.equal(undefined);
      // Number() cast is the replacement
      expect(Number(nextId)).to.equal(1);
    });

    it("Q1.3: tokenId=1 has data; tokenId=0 is always empty (loop must start at 1)", async function () {
      const { nft } = await loadFixture(deployWithOneMint);
      const at1 = await nft.getClaimData(1);
      const at0 = await nft.getClaimData(0);
      // Looping from i=1 gets real data
      expect(at1.totalPayoutAmount).to.equal(E18("15"));
      // Calling getClaimData(0) would return zero struct — frontend must not do this
      expect(at0.totalPayoutAmount).to.equal(0n);
      expect(at0.issuerToken).to.equal(ethers.ZeroAddress);
    });

    it("Q1.5: defaultType 0 = PAYMENT_DELAY (contract enum, not frontend legacy label)", async function () {
      const { nft } = await loadFixture(deployWithOneMint);
      const claim = await nft.getClaimData(1);
      // Contract stores 0 = PAYMENT_DELAY (not GENERAL_DEFAULT)
      expect(Number(claim.defaultType)).to.equal(PAYMENT_DELAY);
      expect(PAYMENT_DELAY).to.equal(0);
    });
  });
});
