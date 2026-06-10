// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title MockTrancheToken — Minimal mock for srCVR / jrCVR used in InsurancePool tests.
 * @notice Implements mint, redeem, accrueYield, liquidate with 1:1 USDT backing.
 */
contract MockTrancheToken is ERC20 {
    using SafeERC20 for IERC20;

    IERC20 public usdt;
    address public pool;

    // Track USDT held per issuerToken
    mapping(address => uint256) public usdtHeld;

    constructor(string memory name_, string memory symbol_, address _usdt) ERC20(name_, symbol_) {
        usdt = IERC20(_usdt);
    }

    function setPool(address _pool) external {
        pool = _pool;
    }

    /// @notice Mint tranche tokens 1:1 with USDT deposited.
    ///         The InsurancePool transfers USDT here before calling mint.
    function mint(address depositor, uint256 usdtAmount, address issuerToken) external returns (uint256) {
        usdtHeld[issuerToken] += usdtAmount;
        _mint(depositor, usdtAmount);
        return usdtAmount;
    }

    /// @notice Redeem tranche tokens 1:1 for USDT.
    function redeem(address holder, uint256 amount, address issuerToken) external returns (uint256) {
        _burn(holder, amount);
        usdtHeld[issuerToken] -= amount;
        usdt.safeTransfer(holder, amount);
        return amount;
    }

    /// @notice Record yield accrual (USDT already transferred here by InsurancePool).
    function accrueYield(uint256 amount, address issuerToken) external {
        usdtHeld[issuerToken] += amount;
    }

    /// @notice Liquidate all USDT held for an issuerToken. Transfers USDT back to InsurancePool.
    function liquidate(address issuerToken) external returns (uint256) {
        uint256 held = usdtHeld[issuerToken];
        usdtHeld[issuerToken] = 0;
        if (held > 0) {
            usdt.safeTransfer(pool, held);
        }
        return held;
    }
}
