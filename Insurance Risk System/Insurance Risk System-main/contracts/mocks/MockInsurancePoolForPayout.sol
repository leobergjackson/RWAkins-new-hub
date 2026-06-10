// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MockInsurancePoolForPayout — Mock InsurancePool for PayoutEngine unit tests
 */
contract MockInsurancePoolForPayout {
    struct PoolState {
        uint256 seniorTVL;
        uint256 juniorTVL;
        uint256 totalInsured;
    }

    mapping(address => PoolState) public poolStates;
    mapping(address => uint256) public juniorLiquidationReturn;
    mapping(address => uint256) public seniorLiquidationReturn;
    mapping(address => bool) public liquidateCalled;
    mapping(address => uint256) public lastAddedInsured;

    function setPoolState(
        address issuerToken,
        uint256 seniorTVL,
        uint256 juniorTVL,
        uint256 totalInsured
    ) external {
        poolStates[issuerToken] = PoolState(seniorTVL, juniorTVL, totalInsured);
    }

    function setLiquidationReturn(
        address issuerToken,
        uint256 juniorAmount,
        uint256 seniorAmount
    ) external {
        juniorLiquidationReturn[issuerToken] = juniorAmount;
        seniorLiquidationReturn[issuerToken] = seniorAmount;
    }

    // IInsurancePool.pools() returns (uint256, uint256, uint256, uint256, bool, bool)
    function pools(address issuerToken) external view returns (
        uint256 seniorTVL,
        uint256 juniorTVL,
        uint256 totalInsured,
        uint256 extra,
        bool flag1,
        bool flag2
    ) {
        PoolState memory ps = poolStates[issuerToken];
        return (ps.seniorTVL, ps.juniorTVL, ps.totalInsured, 0, false, false);
    }

    function liquidateForPayout(address issuerToken) external returns (uint256 juniorLiquidated, uint256 seniorLiquidated) {
        liquidateCalled[issuerToken] = true;
        juniorLiquidated = juniorLiquidationReturn[issuerToken];
        seniorLiquidated = seniorLiquidationReturn[issuerToken];
    }

    function addInsuredAmount(address issuerToken, uint256 amount) external {
        lastAddedInsured[issuerToken] = amount;
        poolStates[issuerToken].totalInsured += amount;
    }
}
