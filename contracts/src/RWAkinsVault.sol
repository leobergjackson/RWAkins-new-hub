// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IMockRWAToken {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function mint(address to, uint256 amount) external;
}

/// @title RWAkinsVault
/// @notice Custodies a user's two-leg RWA position (USDY + mETH) and performs the
///         AI-CFO rebalances on-chain. The agent brain (informed by the Byreal
///         Agent Skills decision layer) decides the target split; this contract
///         is the on-chain executor, enforcing the hard invariants:
///           - usdyBps + methBps == 10_000 (100%)
///           - methBps <= MAX_RISK_BPS (70%)
///         Every rebalance emits `Rebalanced`, giving a verifiable Mantle tx hash.
///
///         Rebalancing converts value between the two legs at `methPriceE18`
///         (USDY units per 1 mETH). Because these are testnet mock tokens, the
///         vault mints any reserve shortfall to itself so a withdraw always
///         settles — this keeps the demo robust without a real AMM/oracle.
contract RWAkinsVault {
    uint256 public constant MAX_RISK_BPS = 7000; // mETH ceiling: 70%
    uint256 private constant TOTAL_BPS = 10_000;
    uint256 private constant ONE = 1e18;

    IMockRWAToken public immutable usdyToken;
    IMockRWAToken public immutable methToken;
    address public owner;

    /// @notice Price of 1 mETH expressed in USDY units (18 decimals).
    uint256 public methPriceE18;

    // Per-user vault position (token amounts, 18 decimals).
    mapping(address => uint256) public usdyBalanceOf;
    mapping(address => uint256) public methBalanceOf;

    event Deposited(address indexed user, address asset, uint256 amount);
    event Withdrawn(address indexed user, address asset, uint256 amount);
    event Rebalanced(address indexed user, uint256 usdyBps, uint256 methBps, uint256 timestamp);
    event MethPriceUpdated(uint256 methPriceE18);

    constructor(address _usdy, address _meth, uint256 _methPriceE18) {
        require(_usdy != address(0) && _meth != address(0), "ZERO_ADDR");
        require(_methPriceE18 > 0, "ZERO_PRICE");
        usdyToken = IMockRWAToken(_usdy);
        methToken = IMockRWAToken(_meth);
        methPriceE18 = _methPriceE18;
        owner = msg.sender;
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

    /// @notice Keeps the on-chain swap price aligned with live ETH price. The
    ///         agent backend (deployer key) can push updates so rebalance math
    ///         reflects the market rather than a frozen constant.
    function setMethPrice(uint256 _methPriceE18) external onlyOwner {
        require(_methPriceE18 > 0, "ZERO_PRICE");
        methPriceE18 = _methPriceE18;
        emit MethPriceUpdated(_methPriceE18);
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

    /// @notice Execute the AI CFO's target allocation for the caller. Converts
    ///         value between USDY and mETH legs at `methPriceE18`.
    function rebalance(uint256 usdyBps, uint256 methBps) external {
        _rebalance(msg.sender, usdyBps, methBps);
    }

    /// @notice Autonomous rebalance — lets the AI CFO agent backend (the owner
    ///         key) execute a user's target allocation on a schedule WITHOUT the
    ///         user signing. This is what the /api/agent/heartbeat cron calls so
    ///         the agent can monitor → decide → execute fully unattended. The
    ///         same on-chain invariants apply; the user remains the position
    ///         owner and the `Rebalanced` event is still indexed to them.
    function rebalanceFor(address user, uint256 usdyBps, uint256 methBps) external onlyOwner {
        _rebalance(user, usdyBps, methBps);
    }

    function _rebalance(address user, uint256 usdyBps, uint256 methBps) internal {
        require(usdyBps + methBps == TOTAL_BPS, "BPS_SUM");
        require(methBps <= MAX_RISK_BPS, "RISK_CAP");

        uint256 total = _totalValue(user); // in USDY units
        require(total > 0, "EMPTY");

        uint256 newUsdy = (total * usdyBps) / TOTAL_BPS; // USDY tokens
        uint256 newMethValue = total - newUsdy; // remaining value in USDY units
        uint256 newMeth = (newMethValue * ONE) / methPriceE18; // mETH tokens

        usdyBalanceOf[user] = newUsdy;
        methBalanceOf[user] = newMeth;

        // Back the new position with real reserves (mint shortfall — testnet mocks).
        _ensureReserve(usdyToken, newUsdy);
        _ensureReserve(methToken, newMeth);

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
        uint256 methValue = (methBal * methPriceE18) / ONE;
        methBps = (methValue * TOTAL_BPS) / total;
        usdyBps = TOTAL_BPS - methBps;
    }

    function getTotalValue(address user) external view returns (uint256) {
        return _totalValue(user);
    }

    // ─── Internal ──────────────────────────────────────────────────────────
    function _totalValue(address user) internal view returns (uint256) {
        uint256 methValue = (methBalanceOf[user] * methPriceE18) / ONE;
        return usdyBalanceOf[user] + methValue;
    }

    function _ensureReserve(IMockRWAToken token, uint256 needed) internal {
        uint256 held = token.balanceOf(address(this));
        if (held < needed) {
            token.mint(address(this), needed - held);
        }
    }
}
