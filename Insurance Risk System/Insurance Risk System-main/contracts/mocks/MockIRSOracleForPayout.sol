// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MockIRSOracleForPayout — Mock IRS Oracle for PayoutEngine unit tests
 */
contract MockIRSOracleForPayout {
    mapping(address => bool) public scoreResetCalled;

    function setScoreToZero(address tokenAddress) external {
        scoreResetCalled[tokenAddress] = true;
    }
}
