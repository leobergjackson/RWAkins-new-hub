// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MockRWAToken
/// @notice Minimal, dependency-free ERC-20 used to model the two RWAkins legs on
///         Mantle Sepolia: USDY (Ondo tokenized treasuries, stable yield) and
///         mETH (Mantle liquid-staked ETH). These are TESTNET MOCKS — `mint` is
///         intentionally open so the app can run a faucet flow, and the owner can
///         tune the reported APY so the dashboard reflects real on-chain state
///         rather than hardcoded numbers.
contract MockRWAToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    /// @notice Current annualized yield in basis points (480 = 4.80% APY).
    uint256 public yieldBps;
    address public owner;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event YieldUpdated(uint256 yieldBps);

    constructor(string memory _name, string memory _symbol, uint256 _yieldBps) {
        name = _name;
        symbol = _symbol;
        yieldBps = _yieldBps;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    /// @notice Reported APY in basis points — read live by the portfolio dashboard.
    function currentYield() external view returns (uint256) {
        return yieldBps;
    }

    function setYield(uint256 _yieldBps) external onlyOwner {
        yieldBps = _yieldBps;
        emit YieldUpdated(_yieldBps);
    }

    /// @notice Open mint — testnet faucet. Lets the vault top up its own reserves
    ///         when a rebalance converts value between the two legs.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            require(allowed >= amount, "ALLOWANCE");
            allowance[from][msg.sender] = allowed - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(to != address(0), "ZERO_ADDR");
        uint256 bal = balanceOf[from];
        require(bal >= amount, "BALANCE");
        unchecked {
            balanceOf[from] = bal - amount;
            balanceOf[to] += amount;
        }
        emit Transfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal {
        require(to != address(0), "ZERO_ADDR");
        totalSupply += amount;
        unchecked {
            balanceOf[to] += amount;
        }
        emit Transfer(address(0), to, amount);
    }
}
