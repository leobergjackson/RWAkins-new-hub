// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MockChainlinkPoR — Simulates Chainlink Proof of Reserve for demo
 */
contract MockChainlinkPoR {
    mapping(address => uint256) public collateralRatios; // basis points

    function setCollateralRatio(address token, uint256 ratioBPS) external {
        collateralRatios[token] = ratioBPS;
    }

    function getCollateralRatio(address token) external view returns (uint256) {
        return collateralRatios[token];
    }

    // Chainlink AggregatorV3 compatible
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (1, 10000, block.timestamp, block.timestamp, 1);
    }
}
