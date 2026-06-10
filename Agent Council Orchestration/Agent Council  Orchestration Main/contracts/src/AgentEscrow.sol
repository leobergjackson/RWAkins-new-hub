// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AgentEscrow
 * @author AeroFyta
 * @notice Hash Time-Locked Contract (HTLC) escrow for autonomous agent payments.
 *         Agents deposit USDT locked by a SHA-256 hashlock and a timelock.
 *         The recipient claims by revealing the preimage; the depositor can
 *         reclaim funds after the timelock expires.
 *
 * @dev    Each escrow is identified by a unique `escrowId` (bytes32) chosen by
 *         the depositor. This avoids on-chain counter dependencies and allows
 *         deterministic IDs generated off-chain.
 */
contract AgentEscrow is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // -----------------------------------------------------------------------
    //  Types
    // -----------------------------------------------------------------------

    enum EscrowState {
        Active,
        Claimed,
        Refunded
    }

    struct Escrow {
        address depositor;
        address recipient;
        uint256 amount;
        bytes32 hashLock;       // SHA-256 hash of the secret preimage
        uint256 timeLock;       // Unix timestamp after which refund is allowed
        EscrowState state;
    }

    // -----------------------------------------------------------------------
    //  State
    // -----------------------------------------------------------------------

    /// @notice The ERC-20 token held in escrow (USDT).
    IERC20 public immutable escrowToken;

    /// @notice Minimum timelock duration (seconds). Owner-configurable.
    uint256 public minTimelockDuration = 1 hours;

    /// @notice Maximum timelock duration (seconds). Owner-configurable.
    uint256 public maxTimelockDuration = 30 days;

    /// @dev escrowId => Escrow struct.
    mapping(bytes32 => Escrow) private _escrows;

    /// @notice Total number of escrows ever created.
    uint256 public escrowCount;

    /// @notice Total USDT volume that has passed through escrows.
    uint256 public totalVolume;

    // -----------------------------------------------------------------------
    //  Events
    // -----------------------------------------------------------------------

    event EscrowCreated(
        bytes32 indexed escrowId,
        address indexed depositor,
        address indexed recipient,
        uint256 amount,
        bytes32 hashLock,
        uint256 timeLock
    );

    event EscrowClaimed(
        bytes32 indexed escrowId,
        address indexed recipient,
        bytes32 preimage
    );

    event EscrowRefunded(
        bytes32 indexed escrowId,
        address indexed depositor
    );

    event TimelockBoundsUpdated(uint256 minDuration, uint256 maxDuration);

    // -----------------------------------------------------------------------
    //  Errors
    // -----------------------------------------------------------------------

    error ZeroAddress();
    error ZeroAmount();
    error EscrowAlreadyExists(bytes32 escrowId);
    error EscrowNotFound(bytes32 escrowId);
    error EscrowNotActive(bytes32 escrowId);
    error InvalidPreimage(bytes32 expected, bytes32 actual);
    error TimelockNotExpired(uint256 timeLock, uint256 currentTime);
    error TimelockTooShort(uint256 duration, uint256 minimum);
    error TimelockTooLong(uint256 duration, uint256 maximum);
    error InvalidTimelockBounds();
    error NotDepositor();

    // -----------------------------------------------------------------------
    //  Constructor
    // -----------------------------------------------------------------------

    /**
     * @param token_ Address of the ERC-20 escrow token (e.g. USDT).
     * @param owner_ Initial contract owner.
     */
    constructor(address token_, address owner_) Ownable(owner_) {
        if (token_ == address(0)) revert ZeroAddress();
        escrowToken = IERC20(token_);
    }

    // -----------------------------------------------------------------------
    //  External — Escrow Lifecycle
    // -----------------------------------------------------------------------

    /**
     * @notice Create a new hash-time-locked escrow.
     * @param escrowId  Unique identifier (caller-chosen, e.g. keccak256 of nonce).
     * @param recipient Address that can claim by revealing the preimage.
     * @param amount    Token amount to lock.
     * @param hashLock  SHA-256 hash of the secret preimage.
     * @param duration  Timelock duration in seconds from now.
     *
     * @dev Caller must approve this contract for `amount` beforehand.
     */
    function createEscrow(
        bytes32 escrowId,
        address recipient,
        uint256 amount,
        bytes32 hashLock,
        uint256 duration
    ) external nonReentrant {
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (_escrows[escrowId].depositor != address(0)) {
            revert EscrowAlreadyExists(escrowId);
        }
        if (duration < minTimelockDuration) {
            revert TimelockTooShort(duration, minTimelockDuration);
        }
        if (duration > maxTimelockDuration) {
            revert TimelockTooLong(duration, maxTimelockDuration);
        }

        uint256 timeLock = block.timestamp + duration;

        _escrows[escrowId] = Escrow({
            depositor: msg.sender,
            recipient: recipient,
            amount: amount,
            hashLock: hashLock,
            timeLock: timeLock,
            state: EscrowState.Active
        });

        escrowCount += 1;
        totalVolume += amount;

        escrowToken.safeTransferFrom(msg.sender, address(this), amount);

        emit EscrowCreated(
            escrowId,
            msg.sender,
            recipient,
            amount,
            hashLock,
            timeLock
        );
    }

    /**
     * @notice Claim escrowed funds by revealing the correct preimage.
     * @param escrowId The escrow to claim.
     * @param preimage The secret whose SHA-256 hash matches the stored hashLock.
     */
    function claim(bytes32 escrowId, bytes32 preimage) external nonReentrant {
        Escrow storage e = _escrows[escrowId];
        if (e.depositor == address(0)) revert EscrowNotFound(escrowId);
        if (e.state != EscrowState.Active) revert EscrowNotActive(escrowId);

        bytes32 computedHash = sha256(abi.encodePacked(preimage));
        if (computedHash != e.hashLock) {
            revert InvalidPreimage(e.hashLock, computedHash);
        }

        e.state = EscrowState.Claimed;

        escrowToken.safeTransfer(e.recipient, e.amount);

        emit EscrowClaimed(escrowId, e.recipient, preimage);
    }

    /**
     * @notice Refund escrowed funds to the depositor after the timelock expires.
     * @param escrowId The escrow to refund.
     *
     * @dev Anyone can trigger a refund, but funds always go back to the
     *      original depositor.
     */
    function refund(bytes32 escrowId) external nonReentrant {
        Escrow storage e = _escrows[escrowId];
        if (e.depositor == address(0)) revert EscrowNotFound(escrowId);
        if (e.state != EscrowState.Active) revert EscrowNotActive(escrowId);
        if (block.timestamp < e.timeLock) {
            revert TimelockNotExpired(e.timeLock, block.timestamp);
        }

        e.state = EscrowState.Refunded;

        escrowToken.safeTransfer(e.depositor, e.amount);

        emit EscrowRefunded(escrowId, e.depositor);
    }

    // -----------------------------------------------------------------------
    //  External — Administration
    // -----------------------------------------------------------------------

    /**
     * @notice Update the allowed timelock duration bounds.
     * @param minDuration New minimum (seconds).
     * @param maxDuration New maximum (seconds).
     */
    function setTimelockBounds(
        uint256 minDuration,
        uint256 maxDuration
    ) external onlyOwner {
        if (minDuration == 0 || maxDuration <= minDuration) {
            revert InvalidTimelockBounds();
        }
        minTimelockDuration = minDuration;
        maxTimelockDuration = maxDuration;

        emit TimelockBoundsUpdated(minDuration, maxDuration);
    }

    // -----------------------------------------------------------------------
    //  Views
    // -----------------------------------------------------------------------

    /**
     * @notice Returns the full escrow details for `escrowId`.
     */
    function getEscrow(bytes32 escrowId)
        external
        view
        returns (Escrow memory)
    {
        return _escrows[escrowId];
    }

    /**
     * @notice Checks whether the preimage would unlock the escrow.
     * @dev    Useful for off-chain verification before submitting a claim tx.
     */
    function verifyPreimage(
        bytes32 escrowId,
        bytes32 preimage
    ) external view returns (bool) {
        return sha256(abi.encodePacked(preimage)) == _escrows[escrowId].hashLock;
    }

    /**
     * @notice Returns true if the escrow's timelock has expired.
     */
    function isExpired(bytes32 escrowId) external view returns (bool) {
        Escrow storage e = _escrows[escrowId];
        return e.depositor != address(0) && block.timestamp >= e.timeLock;
    }
}
