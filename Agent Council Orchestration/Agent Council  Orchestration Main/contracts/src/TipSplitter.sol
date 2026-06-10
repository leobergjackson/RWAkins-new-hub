// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TipSplitter
 * @author AeroFyta
 * @notice Splits incoming USDT tips between a creator and their collaborators
 *         using configurable basis-point ratios.
 * @dev    All percentages are expressed in basis points (1 bp = 0.01%).
 *         The sum of all shares in a split config MUST equal 10_000 (100%).
 *
 *         Typical flow:
 *         1. Owner calls `configureSplit` for a creator address.
 *         2. Anyone calls `tip(creator, amount)` to send USDT.
 *         3. Contract distributes funds atomically to every recipient.
 */
contract TipSplitter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // -----------------------------------------------------------------------
    //  Constants
    // -----------------------------------------------------------------------

    /// @notice Basis-point denominator (100%).
    uint256 public constant BPS_DENOMINATOR = 10_000;

    // -----------------------------------------------------------------------
    //  Types
    // -----------------------------------------------------------------------

    /// @notice A single recipient in a split configuration.
    struct Recipient {
        address account;
        uint256 shareBps; // basis points, e.g. 7000 = 70%
    }

    // -----------------------------------------------------------------------
    //  State
    // -----------------------------------------------------------------------

    /// @notice The ERC-20 token used for tips (USDT).
    IERC20 public immutable tipToken;

    /// @dev creator => array of recipients (includes the creator themselves).
    mapping(address => Recipient[]) private _splits;

    /// @notice Total tips received per creator (denominated in `tipToken`).
    mapping(address => uint256) public totalTipped;

    /// @notice Number of tips received per creator.
    mapping(address => uint256) public tipCount;

    // -----------------------------------------------------------------------
    //  Events
    // -----------------------------------------------------------------------

    /// @notice Emitted when a tip is sent to a creator.
    event TipSent(
        address indexed from,
        address indexed creator,
        uint256 amount,
        uint256 timestamp
    );

    /// @notice Emitted for every individual split transfer within a tip.
    event TipSplit(
        address indexed creator,
        address indexed recipient,
        uint256 amount,
        uint256 shareBps
    );

    /// @notice Emitted when a split configuration is created or updated.
    event SplitConfigured(
        address indexed creator,
        uint256 recipientCount
    );

    /// @notice Emitted when a split configuration is removed.
    event SplitRemoved(address indexed creator);

    // -----------------------------------------------------------------------
    //  Errors
    // -----------------------------------------------------------------------

    error ZeroAddress();
    error ZeroAmount();
    error NoSplitConfigured(address creator);
    error SharesSumMismatch(uint256 actual, uint256 expected);
    error EmptyRecipients();
    error DuplicateRecipient(address account);

    // -----------------------------------------------------------------------
    //  Constructor
    // -----------------------------------------------------------------------

    /**
     * @param token_  Address of the ERC-20 tip token (e.g. USDT).
     * @param owner_  Initial owner who can manage split configurations.
     */
    constructor(address token_, address owner_) Ownable(owner_) {
        if (token_ == address(0)) revert ZeroAddress();
        tipToken = IERC20(token_);
    }

    // -----------------------------------------------------------------------
    //  External — Tipping
    // -----------------------------------------------------------------------

    /**
     * @notice Send a tip to `creator`. The amount is split according to the
     *         creator's configured ratios.
     * @param creator The creator whose split config determines distribution.
     * @param amount  The total tip amount in `tipToken` smallest units.
     *
     * @dev Caller must have approved this contract for at least `amount`.
     */
    function tip(address creator, uint256 amount) external nonReentrant {
        if (creator == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        Recipient[] storage recipients = _splits[creator];
        if (recipients.length == 0) revert NoSplitConfigured(creator);

        // Pull the full amount from the sender.
        tipToken.safeTransferFrom(msg.sender, address(this), amount);

        // Distribute to each recipient.
        uint256 remaining = amount;
        for (uint256 i = 0; i < recipients.length; i++) {
            uint256 share;
            if (i == recipients.length - 1) {
                // Last recipient gets the remainder to avoid dust from rounding.
                share = remaining;
            } else {
                share = (amount * recipients[i].shareBps) / BPS_DENOMINATOR;
                remaining -= share;
            }

            tipToken.safeTransfer(recipients[i].account, share);

            emit TipSplit(creator, recipients[i].account, share, recipients[i].shareBps);
        }

        totalTipped[creator] += amount;
        tipCount[creator] += 1;

        emit TipSent(msg.sender, creator, amount, block.timestamp);
    }

    // -----------------------------------------------------------------------
    //  External — Administration
    // -----------------------------------------------------------------------

    /**
     * @notice Set or replace the split configuration for `creator`.
     * @param creator    The creator address this config applies to.
     * @param recipients Array of (account, shareBps) tuples. Must sum to 10_000.
     *
     * @dev Only callable by the contract owner.
     */
    function configureSplit(
        address creator,
        Recipient[] calldata recipients
    ) external onlyOwner {
        if (creator == address(0)) revert ZeroAddress();
        if (recipients.length == 0) revert EmptyRecipients();

        // Validate shares sum to 100%.
        uint256 totalBps;
        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i].account == address(0)) revert ZeroAddress();
            totalBps += recipients[i].shareBps;

            // Check for duplicate recipients within the array.
            for (uint256 j = 0; j < i; j++) {
                if (recipients[j].account == recipients[i].account) {
                    revert DuplicateRecipient(recipients[i].account);
                }
            }
        }
        if (totalBps != BPS_DENOMINATOR) {
            revert SharesSumMismatch(totalBps, BPS_DENOMINATOR);
        }

        // Overwrite storage.
        delete _splits[creator];
        for (uint256 i = 0; i < recipients.length; i++) {
            _splits[creator].push(recipients[i]);
        }

        emit SplitConfigured(creator, recipients.length);
    }

    /**
     * @notice Remove the split configuration for `creator`.
     * @param creator The creator whose config should be deleted.
     */
    function removeSplit(address creator) external onlyOwner {
        if (creator == address(0)) revert ZeroAddress();
        delete _splits[creator];
        emit SplitRemoved(creator);
    }

    // -----------------------------------------------------------------------
    //  Views
    // -----------------------------------------------------------------------

    /**
     * @notice Returns the split configuration for `creator`.
     * @return recipients Array of (account, shareBps) structs.
     */
    function getSplit(address creator)
        external
        view
        returns (Recipient[] memory recipients)
    {
        return _splits[creator];
    }

    /**
     * @notice Checks whether a split config exists for `creator`.
     */
    function hasSplit(address creator) external view returns (bool) {
        return _splits[creator].length > 0;
    }
}
