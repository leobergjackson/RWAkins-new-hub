// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/**
 * @title AeroFytaTipSplitter
 * @notice On-chain tip splitter with configurable revenue shares.
 * @dev Reference implementation for mainnet deployment.
 *      Currently the agent uses off-chain split logic for testnet.
 *
 *      Use cases:
 *        - Rumble creator collabs: split tips between multiple creators
 *        - Platform fee collection: agent takes a configurable cut
 *        - Multi-party revenue sharing for content teams
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract AeroFytaTipSplitter is ReentrancyGuard {
    using SafeERC20 for IERC20;
    struct SplitConfig {
        address[] recipients;
        uint256[] shares; // basis points (10000 = 100%)
        address creator;  // who created this split config
        bool active;
    }

    /// @notice Split configs indexed by a unique ID
    mapping(bytes32 => SplitConfig) public splits;

    /// @dev Basis points denominator (100%)
    uint256 public constant BPS_DENOMINATOR = 10000;

    event SplitCreated(bytes32 indexed id, address[] recipients, uint256[] shares);
    event TipSplit(bytes32 indexed splitId, address indexed token, uint256 totalAmount, address sender);
    event SplitDeactivated(bytes32 indexed id);

    /**
     * @notice Create a new split configuration.
     * @param id         Unique split identifier
     * @param recipients Array of addresses to receive shares
     * @param shares     Array of basis-point shares (must sum to 10000)
     */
    function createSplit(
        bytes32 id,
        address[] calldata recipients,
        uint256[] calldata shares
    ) external {
        require(recipients.length > 0, "No recipients");
        require(recipients.length == shares.length, "Length mismatch");
        require(splits[id].creator == address(0), "Split exists");

        uint256 totalShares = 0;
        for (uint256 i = 0; i < shares.length; i++) {
            require(recipients[i] != address(0), "Zero address");
            require(shares[i] > 0, "Zero share");
            totalShares += shares[i];
        }
        require(totalShares == BPS_DENOMINATOR, "Shares must sum to 10000");

        splits[id] = SplitConfig({
            recipients: recipients,
            shares: shares,
            creator: msg.sender,
            active: true
        });

        emit SplitCreated(id, recipients, shares);
    }

    /**
     * @notice Send a tip that is automatically split among recipients.
     * @param splitId Identifier of the split configuration
     * @param token   ERC-20 token address (e.g. USDT)
     * @param amount  Total tip amount (caller must have approved this contract)
     */
    function splitTip(
        bytes32 splitId,
        address token,
        uint256 amount
    ) external nonReentrant {
        SplitConfig storage cfg = splits[splitId];
        require(cfg.active, "Split not active");
        require(amount > 0, "Amount must be > 0");

        // Transfer total amount from sender to this contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Distribute to each recipient according to shares
        uint256 distributed = 0;
        for (uint256 i = 0; i < cfg.recipients.length; i++) {
            uint256 share;
            if (i == cfg.recipients.length - 1) {
                // Last recipient gets remainder to avoid rounding dust
                share = amount - distributed;
            } else {
                share = (amount * cfg.shares[i]) / BPS_DENOMINATOR;
            }
            distributed += share;
            IERC20(token).safeTransfer(cfg.recipients[i], share);
        }

        emit TipSplit(splitId, token, amount, msg.sender);
    }

    /**
     * @notice Deactivate a split config. Only the creator can deactivate.
     * @param id Split identifier
     */
    function deactivateSplit(bytes32 id) external {
        SplitConfig storage cfg = splits[id];
        require(msg.sender == cfg.creator, "Not creator");
        require(cfg.active, "Already inactive");
        cfg.active = false;
        emit SplitDeactivated(id);
    }

    /**
     * @notice View recipients for a split.
     * @param id Split identifier
     * @return recipients Array of recipient addresses
     * @return shares Array of basis-point shares
     */
    function getSplit(bytes32 id) external view returns (address[] memory recipients, uint256[] memory shares) {
        SplitConfig storage cfg = splits[id];
        return (cfg.recipients, cfg.shares);
    }
}
