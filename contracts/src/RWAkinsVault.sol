// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IMockRWAToken {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function mint(address to, uint256 amount) external;
}

interface IRWAkinsAMM {
    function swap(address tokenIn, uint256 amountIn, uint256 minOut, address to) external returns (uint256);
    function spotPriceE18() external view returns (uint256);
}

/// @title RWAkinsVault
/// @notice Custodies a user's two-leg RWA position (USDY + mETH) and performs the
///         AI-CFO rebalances on-chain, enforcing the hard invariants:
///           - usdyBps + methBps == 10_000 (100%)
///           - methBps <= MAX_RISK_BPS (70%)
///
///         Rebalancing is a REAL on-chain swap: the vault routes the difference
///         between the two legs through RWAkinsAMM (a constant-product x*y=k pool),
///         paying a real 0.3% fee and taking real price impact. The valuation price
///         is the pool's live spot price — real on-chain price discovery, not a
///         frozen constant. The agent keeps the pool anchored to the live market
///         (RWAkinsAMM.syncToPrice), as arbitrageurs do on a real DEX.
contract RWAkinsVault {
    uint256 public constant MAX_RISK_BPS = 7000; // mETH ceiling: 70%
    uint256 private constant TOTAL_BPS = 10_000;
    uint256 private constant ONE = 1e18;

    IMockRWAToken public immutable usdyToken;
    IMockRWAToken public immutable methToken;
    IRWAkinsAMM public immutable amm;
    address public owner;

    // Per-user vault position (token amounts, 18 decimals).
    mapping(address => uint256) public usdyBalanceOf;
    mapping(address => uint256) public methBalanceOf;

    event Deposited(address indexed user, address asset, uint256 amount);
    event Withdrawn(address indexed user, address asset, uint256 amount);
    event Rebalanced(address indexed user, uint256 usdyBps, uint256 methBps, uint256 timestamp);

    constructor(address _usdy, address _meth, address _amm) {
        require(_usdy != address(0) && _meth != address(0) && _amm != address(0), "ZERO_ADDR");
        usdyToken = IMockRWAToken(_usdy);
        methToken = IMockRWAToken(_meth);
        amm = IRWAkinsAMM(_amm);
        owner = msg.sender;
        // Approve the AMM to pull either leg when the vault swaps during a rebalance.
        usdyToken.approve(_amm, type(uint256).max);
        methToken.approve(_amm, type(uint256).max);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    // ─── ABI accessors expected by the frontend ────────────────────────────
    function usdy() external view returns (address) {
        return address(usdyToken);
    }

    function meth() external view returns (address) {
        return address(methToken);
    }

    /// @notice Live mETH price (USDY units) from the AMM pool — real price discovery.
    function methPriceE18() external view returns (uint256) {
        return amm.spotPriceE18();
    }

    // ─── User flows ────────────────────────────────────────────────────────
    function deposit(address asset, uint256 amount) external {
        require(amount > 0, "ZERO_AMOUNT");
        require(asset == address(usdyToken) || asset == address(methToken), "BAD_ASSET");
        require(IMockRWAToken(asset).transferFrom(msg.sender, address(this), amount), "TRANSFER_IN");
        if (asset == address(usdyToken)) {
            usdyBalanceOf[msg.sender] += amount;
        } else {
            methBalanceOf[msg.sender] += amount;
        }
        emit Deposited(msg.sender, asset, amount);
    }

    function withdraw(address asset, uint256 amount) external {
        require(amount > 0, "ZERO_AMOUNT");
        require(asset == address(usdyToken) || asset == address(methToken), "BAD_ASSET");
        if (asset == address(usdyToken)) {
            require(usdyBalanceOf[msg.sender] >= amount, "BALANCE");
            usdyBalanceOf[msg.sender] -= amount;
        } else {
            require(methBalanceOf[msg.sender] >= amount, "BALANCE");
            methBalanceOf[msg.sender] -= amount;
        }
        require(IMockRWAToken(asset).transfer(msg.sender, amount), "TRANSFER_OUT");
        emit Withdrawn(msg.sender, asset, amount);
    }

    /// @notice Execute the AI CFO's target allocation for the caller via a real swap.
    function rebalance(uint256 usdyBps, uint256 methBps) external {
        _rebalance(msg.sender, usdyBps, methBps);
    }

    /// @notice Autonomous rebalance — the agent owner key executes a user's target
    ///         split on a schedule without the user signing (the heartbeat cron).
    function rebalanceFor(address user, uint256 usdyBps, uint256 methBps) external onlyOwner {
        _rebalance(user, usdyBps, methBps);
    }

    /// @dev Moves the position to the target split by SWAPPING the difference through
    ///      the AMM. Input-based: we sell exactly the over-weighted leg and credit the
    ///      real output (post fee + slippage), so the final split reflects genuine
    ///      execution rather than an idealised number.
    function _rebalance(address user, uint256 usdyBps, uint256 methBps) internal {
        require(usdyBps + methBps == TOTAL_BPS, "BPS_SUM");
        require(methBps <= MAX_RISK_BPS, "RISK_CAP");

        uint256 price = amm.spotPriceE18(); // USDY per mETH
        require(price > 0, "NO_PRICE");

        uint256 curUsdy = usdyBalanceOf[user];
        uint256 curMeth = methBalanceOf[user];
        uint256 total = curUsdy + (curMeth * price) / ONE; // USDY units
        require(total > 0, "EMPTY");

        uint256 targetUsdy = (total * usdyBps) / TOTAL_BPS; // USDY ≈ $1 → tokens

        if (targetUsdy < curUsdy) {
            // Over-weight USDY → buy mETH: sell the USDY surplus into the pool.
            uint256 usdyIn = curUsdy - targetUsdy;
            uint256 methOut = amm.swap(address(usdyToken), usdyIn, 0, address(this));
            usdyBalanceOf[user] = curUsdy - usdyIn;
            methBalanceOf[user] = curMeth + methOut;
        } else if (targetUsdy > curUsdy) {
            // Under-weight USDY → sell mETH: offload enough mETH to raise the shortfall.
            uint256 usdyShort = targetUsdy - curUsdy;
            uint256 methIn = (usdyShort * ONE) / price; // mETH to sell (pre-slippage)
            if (methIn > curMeth) methIn = curMeth;
            if (methIn > 0) {
                uint256 usdyOut = amm.swap(address(methToken), methIn, 0, address(this));
                methBalanceOf[user] = curMeth - methIn;
                usdyBalanceOf[user] = curUsdy + usdyOut;
            }
        }

        emit Rebalanced(user, usdyBps, methBps, block.timestamp);
    }

    // ─── Views expected by the frontend ────────────────────────────────────
    function getPortfolio(address user)
        external
        view
        returns (uint256 usdyBal, uint256 methBal, uint256 usdyBps, uint256 methBps)
    {
        usdyBal = usdyBalanceOf[user];
        methBal = methBalanceOf[user];
        uint256 total = _totalValue(user);
        if (total == 0) {
            return (usdyBal, methBal, 0, 0);
        }
        uint256 methValue = (methBal * amm.spotPriceE18()) / ONE;
        methBps = (methValue * TOTAL_BPS) / total;
        usdyBps = TOTAL_BPS - methBps;
    }

    function getTotalValue(address user) external view returns (uint256) {
        return _totalValue(user);
    }

    // ─── Internal ──────────────────────────────────────────────────────────
    function _totalValue(address user) internal view returns (uint256) {
        uint256 methValue = (methBalanceOf[user] * amm.spotPriceE18()) / ONE;
        return usdyBalanceOf[user] + methValue;
    }
}
