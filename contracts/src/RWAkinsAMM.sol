// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20Mintable {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function mint(address to, uint256 amount) external;
}

/// @title RWAkinsAMM
/// @notice A minimal Uniswap-V2-style constant-product (x*y=k) AMM for the USDY/mETH
///         pair on Mantle Sepolia. This is what makes the RWAkins rebalance a REAL
///         on-chain swap: the vault routes USDY<->mETH through swap() here, so every
///         rebalance pays a real 0.3% fee and takes real price impact / slippage from
///         the pool reserves — not a frozen oracle constant. The spot price is read
///         straight off the reserves (real price discovery).
///
///         The tokens themselves are still testnet mocks (real Ondo USDY / Mantle
///         mETH are mainnet-only, KYC-gated), so the owner — the AI-CFO agent key —
///         keeps the pool anchored to the live market via syncToPrice(), exactly the
///         job arbitrageurs do on a real DEX. The swap mechanics are fully real.
contract RWAkinsAMM {
    uint256 private constant ONE = 1e18;
    uint256 private constant FEE_NUM = 997; // 0.3% fee
    uint256 private constant FEE_DEN = 1000;

    IERC20Mintable public immutable usdy;
    IERC20Mintable public immutable meth;
    address public owner;

    uint256 public reserveUsdy; // USDY units (≈ USD)
    uint256 public reserveMeth; // mETH tokens

    event Swap(address indexed caller, address tokenIn, uint256 amountIn, uint256 amountOut);
    event LiquidityAdded(uint256 usdyAmount, uint256 methAmount);
    event Synced(uint256 spotPriceE18);

    constructor(address _usdy, address _meth) {
        require(_usdy != address(0) && _meth != address(0), "ZERO_ADDR");
        usdy = IERC20Mintable(_usdy);
        meth = IERC20Mintable(_meth);
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    // ─── Pricing (pure constant-product math) ───────────────────────────────
    function _getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        internal
        pure
        returns (uint256)
    {
        require(amountIn > 0, "ZERO_IN");
        require(reserveIn > 0 && reserveOut > 0, "NO_LIQ");
        uint256 amountInWithFee = amountIn * FEE_NUM;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * FEE_DEN + amountInWithFee;
        return numerator / denominator;
    }

    /// @notice Quote how much `tokenIn`=amountIn buys of the other token, after fee.
    function getAmountOut(address tokenIn, uint256 amountIn) external view returns (uint256) {
        if (tokenIn == address(usdy)) return _getAmountOut(amountIn, reserveUsdy, reserveMeth);
        if (tokenIn == address(meth)) return _getAmountOut(amountIn, reserveMeth, reserveUsdy);
        revert("BAD_TOKEN");
    }

    /// @notice Spot price of 1 mETH in USDY units (18 decimals) = reserveUsdy/reserveMeth.
    function spotPriceE18() public view returns (uint256) {
        if (reserveMeth == 0) return 0;
        return (reserveUsdy * ONE) / reserveMeth;
    }

    // ─── Swap (the real on-chain path the vault uses) ───────────────────────
    /// @notice Swap `amountIn` of `tokenIn` for the other token, sent to `to`.
    ///         Pulls `tokenIn` from msg.sender (must approve first). Real x*y=k with
    ///         a 0.3% fee → real slippage. Reverts if output < minOut.
    function swap(address tokenIn, uint256 amountIn, uint256 minOut, address to)
        external
        returns (uint256 amountOut)
    {
        require(to != address(0), "ZERO_TO");
        bool inIsUsdy = tokenIn == address(usdy);
        require(inIsUsdy || tokenIn == address(meth), "BAD_TOKEN");

        (IERC20Mintable tIn, IERC20Mintable tOut, uint256 rIn, uint256 rOut) = inIsUsdy
            ? (usdy, meth, reserveUsdy, reserveMeth)
            : (meth, usdy, reserveMeth, reserveUsdy);

        amountOut = _getAmountOut(amountIn, rIn, rOut);
        require(amountOut >= minOut, "SLIPPAGE");
        require(amountOut < rOut, "INSUFFICIENT_LIQ");

        require(tIn.transferFrom(msg.sender, address(this), amountIn), "TRANSFER_IN");
        require(tOut.transfer(to, amountOut), "TRANSFER_OUT");

        // Update reserves from real balances (keeps reserves honest).
        reserveUsdy = usdy.balanceOf(address(this));
        reserveMeth = meth.balanceOf(address(this));

        emit Swap(msg.sender, tokenIn, amountIn, amountOut);
    }

    // ─── Liquidity + market anchoring (owner = AI-CFO agent key) ────────────
    /// @notice Seed/add liquidity. Pulls both tokens from the owner.
    function addLiquidity(uint256 usdyAmount, uint256 methAmount) external onlyOwner {
        if (usdyAmount > 0) require(usdy.transferFrom(msg.sender, address(this), usdyAmount), "IN_USDY");
        if (methAmount > 0) require(meth.transferFrom(msg.sender, address(this), methAmount), "IN_METH");
        reserveUsdy = usdy.balanceOf(address(this));
        reserveMeth = meth.balanceOf(address(this));
        emit LiquidityAdded(usdyAmount, methAmount);
    }

    /// @notice Anchor the pool's spot price to the live market (what an arbitrageur
    ///         does on a real DEX). Keeps the mETH reserve fixed and mints/burns the
    ///         USDY reserve so spotPrice == targetPriceE18. Owner-only (agent key).
    ///         Swaps still pay real slippage around this anchored price.
    function syncToPrice(uint256 targetPriceE18) external onlyOwner {
        require(targetPriceE18 > 0, "ZERO_PRICE");
        require(reserveMeth > 0, "NO_LIQ");
        uint256 wantUsdy = (reserveMeth * targetPriceE18) / ONE;
        uint256 held = usdy.balanceOf(address(this));
        if (wantUsdy > held) {
            usdy.mint(address(this), wantUsdy - held);
        } else if (wantUsdy < held) {
            // Burn excess by sending it out of the pool (to owner).
            require(usdy.transfer(owner, held - wantUsdy), "TRANSFER_OUT");
        }
        reserveUsdy = usdy.balanceOf(address(this));
        reserveMeth = meth.balanceOf(address(this));
        emit Synced(spotPriceE18());
    }

    function getReserves() external view returns (uint256, uint256) {
        return (reserveUsdy, reserveMeth);
    }
}
