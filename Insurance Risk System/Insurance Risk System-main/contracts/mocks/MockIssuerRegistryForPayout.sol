// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MockIssuerRegistryForPayout — Mock IssuerRegistry for PayoutEngine unit tests
 */
contract MockIssuerRegistryForPayout {
    mapping(address => bool) public defaultedCalled;
    mapping(address => address) public issuerEOAs;
    mapping(address => bool) public activeStatus;

    function setDefaulted(address tokenAddress) external {
        defaultedCalled[tokenAddress] = true;
    }

    function getIssuerEOA(address tokenAddress) external view returns (address) {
        return issuerEOAs[tokenAddress];
    }

    function isActive(address tokenAddress) external view returns (bool) {
        return activeStatus[tokenAddress];
    }
}
