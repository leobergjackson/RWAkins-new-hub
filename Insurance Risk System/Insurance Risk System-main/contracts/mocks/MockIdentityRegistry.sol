// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IIdentityRegistry.sol";

/**
 * @title MockIdentityRegistry — Simulates ERC-3643 identity registry for demo
 */
contract MockIdentityRegistry is IIdentityRegistry {
    mapping(address => bool) public verified;

    function setVerified(address user, bool status) external {
        verified[user] = status;
    }

    function isVerified(address user) external view override returns (bool) {
        return verified[user];
    }
}
