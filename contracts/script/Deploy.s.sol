// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MockRWAToken} from "../src/MockRWAToken.sol";
import {RWAkinsVault} from "../src/RWAkinsVault.sol";

/// Minimal Foundry cheatcode interface — avoids a forge-std dependency so the
/// project deploys with zero `forge install` / network steps.
interface Vm {
    function envUint(string calldata name) external view returns (uint256);
    function envOr(string calldata name, uint256 defaultValue) external view returns (uint256);
    function addr(uint256 privateKey) external pure returns (address);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
    function serializeAddress(string calldata objectKey, string calldata valueKey, address value)
        external
        returns (string memory);
    function serializeUint(string calldata objectKey, string calldata valueKey, uint256 value)
        external
        returns (string memory);
    function writeJson(string calldata json, string calldata path) external;
}

/// @notice Deploys the RWAkins RWA stack to Mantle Sepolia and writes the
///         resulting addresses into ../lib/rwa-deployed.json so the frontend
///         goes live automatically.
///
/// Usage:
///   export DEPLOYER_PRIVATE_KEY=0x...        # funded Mantle Sepolia key
///   export METH_PRICE_USD=3000               # optional, initial mETH/USDY price
///   forge script script/Deploy.s.sol --rpc-url mantle_sepolia --broadcast
contract Deploy {
    Vm internal constant vm = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        uint256 methPriceUsd = vm.envOr("METH_PRICE_USD", uint256(3000));
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);

        // USDY: Ondo tokenized treasuries (stable leg) — ~4.80% APY.
        MockRWAToken usdy = new MockRWAToken("Ondo US Dollar Yield (mock)", "USDY", 480);
        // mETH: Mantle staked ETH (growth leg) — ~3.60% staking APY.
        MockRWAToken meth = new MockRWAToken("Mantle Staked ETH (mock)", "mETH", 360);

        RWAkinsVault vault = new RWAkinsVault(address(usdy), address(meth), methPriceUsd * 1e18);

        // Seed the deployer so the deposit/rebalance flow is testable immediately.
        usdy.mint(deployer, 10_000 ether);
        meth.mint(deployer, 3 ether);

        vm.stopBroadcast();

        _writeDeployment(address(usdy), address(meth), address(vault));
    }

    function _writeDeployment(address usdy, address meth, address vault) internal {
        string memory obj = "rwakins";
        vm.serializeAddress(obj, "usdy", usdy);
        vm.serializeAddress(obj, "meth", meth);
        vm.serializeUint(obj, "chainId", block.chainid);
        vm.serializeUint(obj, "deployedAt", block.timestamp);
        string memory out = vm.serializeAddress(obj, "vault", vault);
        vm.writeJson(out, "../lib/rwa-deployed.json");
    }
}
