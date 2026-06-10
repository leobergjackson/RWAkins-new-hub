// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IIdentityRegistry — Minimal interface for ERC-3643 identity registry
 * @notice Used by PayoutEngine to check KYC status before payout
 */
interface IIdentityRegistry {
    function isVerified(address _userAddress) external view returns (bool);
}
