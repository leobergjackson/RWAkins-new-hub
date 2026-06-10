// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../interfaces/IERC3643.sol";
import "../interfaces/IIdentityRegistry.sol";

/**
 * @title MockERC3643Token — Simulates an ERC-3643 security token for demo
 * @notice Includes KYC verification and regulatory freeze flags
 */
contract MockERC3643Token is ERC20 {
    IIdentityRegistry private _identityRegistry;
    mapping(address => bool) private _frozen;

    constructor(
        string memory name_,
        string memory symbol_,
        address identityRegistry_
    ) ERC20(name_, symbol_) {
        _identityRegistry = IIdentityRegistry(identityRegistry_);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function identityRegistry() external view returns (IIdentityRegistry) {
        return _identityRegistry;
    }

    function isFrozen(address user) external view returns (bool) {
        return _frozen[user];
    }

    function setFrozen(address user, bool status) external {
        _frozen[user] = status;
    }
}
