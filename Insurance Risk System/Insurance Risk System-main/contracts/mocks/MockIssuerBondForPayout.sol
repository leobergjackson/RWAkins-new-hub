// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MockIssuerBondForPayout — Mock IssuerBond for PayoutEngine unit tests
 */
contract MockIssuerBondForPayout {
    mapping(address => uint256) public liquidationReturn;
    mapping(address => bool) public liquidateCalled;

    function setLiquidationReturn(address tokenAddress, uint256 amount) external {
        liquidationReturn[tokenAddress] = amount;
    }

    function liquidate(address tokenAddress) external returns (uint256) {
        liquidateCalled[tokenAddress] = true;
        return liquidationReturn[tokenAddress];
    }
}
