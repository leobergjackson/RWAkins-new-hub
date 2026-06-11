// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MockRWAToken} from "../src/MockRWAToken.sol";
import {RWAkinsAMM} from "../src/RWAkinsAMM.sol";
import {RWAkinsVault} from "../src/RWAkinsVault.sol";

/// Dependency-free test (no forge-std). Validates that a rebalance moves the
/// position to ~target via REAL AMM swaps, and that the 70% cap holds.
contract RWAkinsTest {
    MockRWAToken usdy;
    MockRWAToken meth;
    RWAkinsAMM amm;
    RWAkinsVault vault;

    function setUp() public {
        usdy = new MockRWAToken("USDY", "USDY", 480);
        meth = new MockRWAToken("mETH", "mETH", 360);
        amm = new RWAkinsAMM(address(usdy), address(meth));
        vault = new RWAkinsVault(address(usdy), address(meth), address(amm));

        // Seed deep liquidity at price 1800 USDY/mETH.
        uint256 seedMeth = 2000 ether;
        uint256 seedUsdy = 1800 * seedMeth;
        usdy.mint(address(this), seedUsdy);
        meth.mint(address(this), seedMeth);
        usdy.approve(address(amm), seedUsdy);
        meth.approve(address(amm), seedMeth);
        amm.addLiquidity(seedUsdy, seedMeth);
    }

    function testPriceFromPool() public view {
        require(amm.spotPriceE18() == 1800 ether, "price != 1800");
        require(vault.methPriceE18() == 1800 ether, "vault price mismatch");
    }

    function testRebalanceViaRealSwap() public {
        // Deposit 10,000 USDY (100% USDY position).
        usdy.mint(address(this), 10_000 ether);
        usdy.approve(address(vault), 10_000 ether);
        vault.deposit(address(usdy), 10_000 ether);

        // Rebalance to 70% mETH — real USDY->mETH swap.
        vault.rebalance(3000, 7000);
        (, , uint256 usdyBps, uint256 methBps) = vault.getPortfolio(address(this));
        // Within ~2% of target after fee+slippage on a deep pool.
        require(methBps >= 6800 && methBps <= 7000, "meth not ~70%");
        require(usdyBps + methBps == 10000, "bps sum");

        // De-risk to 20% mETH — real mETH->USDY swap.
        vault.rebalance(8000, 2000);
        (, , , uint256 methBps2) = vault.getPortfolio(address(this));
        require(methBps2 >= 1900 && methBps2 <= 2100, "meth not ~20%");
    }

    function testRiskCapEnforced() public {
        usdy.mint(address(this), 1000 ether);
        usdy.approve(address(vault), 1000 ether);
        vault.deposit(address(usdy), 1000 ether);
        // 80% mETH must revert (cap is 70%).
        (bool ok, ) = address(vault).call(abi.encodeWithSignature("rebalance(uint256,uint256)", uint256(2000), uint256(8000)));
        require(!ok, "cap not enforced");
    }
}
