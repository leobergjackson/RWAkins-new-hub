// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/**
 * @title AeroFytaEscrow
 * @notice Hash-Time-Locked Contract (HTLC) escrow for trustless tipping.
 * @dev Reference implementation for mainnet deployment.
 *      Currently the agent uses HD wallet vault escrow for testnet.
 *
 *      Flow:
 *        1. Sender creates escrow with a hash lock and timelock
 *        2. Recipient claims by revealing the secret (preimage)
 *        3. If unclaimed past timelock, sender can refund
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract AeroFytaEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;
    struct Escrow {
        address sender;
        address recipient;
        address token;
        uint256 amount;
        bytes32 hashLock;
        uint256 timelock;
        bool claimed;
        bool refunded;
    }

    mapping(bytes32 => Escrow) public escrows;

    event EscrowCreated(
        bytes32 indexed id,
        address sender,
        address recipient,
        uint256 amount,
        bytes32 hashLock,
        uint256 timelock
    );
    event EscrowClaimed(bytes32 indexed id, bytes32 secret);
    event EscrowRefunded(bytes32 indexed id);

    /**
     * @notice Lock tokens in escrow with an HTLC.
     * @param id         Unique escrow identifier
     * @param recipient  Who can claim the funds
     * @param token      ERC-20 token address (e.g. USDT)
     * @param amount     Amount of tokens to lock
     * @param hashLock   keccak256(secret) — recipient must know the preimage
     * @param timelock   Unix timestamp after which sender can refund
     */
    function createEscrow(
        bytes32 id,
        address recipient,
        address token,
        uint256 amount,
        bytes32 hashLock,
        uint256 timelock
    ) external {
        require(escrows[id].sender == address(0), "Escrow exists");
        require(recipient != address(0), "Recipient is zero address");
        require(amount > 0, "Amount must be > 0");
        require(timelock > block.timestamp, "Timelock must be future");

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        escrows[id] = Escrow(msg.sender, recipient, token, amount, hashLock, timelock, false, false);
        emit EscrowCreated(id, msg.sender, recipient, amount, hashLock, timelock);
    }

    /**
     * @notice Claim escrowed funds by revealing the hash lock secret.
     * @param id     Escrow identifier
     * @param secret Preimage that hashes to the stored hashLock
     */
    function claimEscrow(bytes32 id, bytes32 secret) external nonReentrant {
        Escrow storage e = escrows[id];
        require(!e.claimed && !e.refunded, "Already settled");
        require(msg.sender == e.recipient, "Not recipient");
        require(keccak256(abi.encodePacked(secret)) == e.hashLock, "Invalid secret");

        e.claimed = true;
        IERC20(e.token).safeTransfer(e.recipient, e.amount);
        emit EscrowClaimed(id, secret);
    }

    /**
     * @notice Refund escrowed funds after the timelock expires.
     * @param id Escrow identifier
     */
    function refundEscrow(bytes32 id) external nonReentrant {
        Escrow storage e = escrows[id];
        require(!e.claimed && !e.refunded, "Already settled");
        require(block.timestamp > e.timelock, "Timelock not expired");
        require(msg.sender == e.sender, "Not sender");

        e.refunded = true;
        IERC20(e.token).safeTransfer(e.sender, e.amount);
        emit EscrowRefunded(id);
    }
}
