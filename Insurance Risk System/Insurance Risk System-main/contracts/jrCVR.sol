// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title jrCVR — Junior Coverage Receipt Token
 * @notice ERC-20 with epoch-based yield. First-loss tranche after issuer bond.
 *         Higher risk, higher yield (20-28% APR target).
 */
contract jrCVR is ERC20, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdt;
    address public pool;

    uint256 public totalUnderlying;

    // Per-issuer tracking
    mapping(address => uint256) public poolUnderlying;
    mapping(address => uint256) public poolSupply;

    // Epoch-based yield
    uint256 public currentEpoch;
    mapping(uint256 => uint256) public epochYield; // epoch => yield amount

    // ─── Events ──────────────────────────────────────────────────────
    event Minted(address indexed depositor, address indexed issuerToken, uint256 usdt, uint256 jrCVRAmount);
    event Redeemed(address indexed holder, address indexed issuerToken, uint256 jrCVRAmount, uint256 usdtAmount);
    event YieldAccrued(address indexed issuerToken, uint256 amount, uint256 epoch);
    event PoolLiquidated(address indexed issuerToken, uint256 amount);

    modifier onlyPool() {
        require(msg.sender == pool, "jrCVR: only pool");
        _;
    }

    constructor(address _pool, address _usdt) ERC20("CoverFi Junior Coverage Receipt", "jrCVR") {
        pool = _pool;
        usdt = IERC20(_usdt);
    }

    /**
     * @notice Mint jrCVR tokens 1:1 with USDT deposit.
     */
    function mint(address depositor, uint256 usdtAmount, address issuerToken) external onlyPool nonReentrant returns (uint256 minted) {
        minted = usdtAmount; // 1:1 for junior

        totalUnderlying += usdtAmount;
        poolUnderlying[issuerToken] += usdtAmount;
        poolSupply[issuerToken] += minted;

        _mint(depositor, minted);

        emit Minted(depositor, issuerToken, usdtAmount, minted);
    }

    /**
     * @notice Accrue yield from premium payments.
     */
    function accrueYield(uint256 premiumForJunior, address issuerToken) external onlyPool {
        totalUnderlying += premiumForJunior;
        poolUnderlying[issuerToken] += premiumForJunior;
        epochYield[currentEpoch] += premiumForJunior;

        emit YieldAccrued(issuerToken, premiumForJunior, currentEpoch);
    }

    /**
     * @notice Redeem jrCVR for USDT (1:1 + accrued yield share).
     */
    function redeem(address holder, uint256 jrCVRAmount, address issuerToken) external onlyPool nonReentrant returns (uint256 usdtOut) {
        // Pro-rata share of underlying
        if (poolSupply[issuerToken] > 0) {
            usdtOut = (jrCVRAmount * poolUnderlying[issuerToken]) / poolSupply[issuerToken];
        } else {
            usdtOut = jrCVRAmount;
        }

        require(usdtOut <= totalUnderlying, "jrCVR: insufficient underlying");

        totalUnderlying -= usdtOut;
        poolUnderlying[issuerToken] -= usdtOut;
        poolSupply[issuerToken] -= jrCVRAmount;

        _burn(holder, jrCVRAmount);
        usdt.safeTransfer(holder, usdtOut);

        emit Redeemed(holder, issuerToken, jrCVRAmount, usdtOut);
    }

    /**
     * @notice Liquidate junior pool on confirmed default. First loss after bond.
     */
    function liquidate(address issuerToken) external onlyPool nonReentrant returns (uint256 liquidated) {
        liquidated = poolUnderlying[issuerToken];
        if (liquidated > 0) {
            totalUnderlying -= liquidated;
            poolUnderlying[issuerToken] = 0;
            usdt.safeTransfer(pool, liquidated);
        }

        emit PoolLiquidated(issuerToken, liquidated);
    }

    /**
     * @notice Advance epoch (called by pool on premium payment)
     */
    function advanceEpoch() external onlyPool {
        currentEpoch++;
    }

    // ─── View Functions ──────────────────────────────────────────────

    function getPoolUnderlying(address issuerToken) external view returns (uint256) {
        return poolUnderlying[issuerToken];
    }
}
