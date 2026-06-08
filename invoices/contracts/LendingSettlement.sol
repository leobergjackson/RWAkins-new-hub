// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @dev Minimal interface to the ERC-8004 registry this contract attests to.
interface IAgentIdentityRegistry {
    function recordJob(uint256 agentId, uint256 volume, int256 scoreDelta) external;
    function agentIdOf(address controller) external view returns (uint256);
}

/// @title LendingSettlement (Lendora)
/// @notice The on-chain settlement layer for Kubryx's AI-negotiated lending market.
///         Borrowers chat with the Lendora AI agent off-chain to negotiate rate,
///         principal and collateral. The *finalized terms* are written here, on
///         Mantle, by the agent — turning a conversation into a verifiable,
///         permanent on-chain record. Each settlement also credits the negotiating
///         agent's ERC-8004 reputation.
/// @dev    "AI function callable on-chain": {settleLoan} is the agent trigger that
///         writes the inference outcome (the negotiated envelope) to chain state.
contract LendingSettlement {
    struct Loan {
        address borrower;
        uint256 agentId;      // the ERC-8004 agent that negotiated the loan
        uint256 principal;    // base units of the borrowed asset
        uint16 rateBps;       // negotiated APR in basis points (e.g. 850 = 8.50%)
        uint16 collateralBps; // collateralization ratio in bps (e.g. 15000 = 150%)
        uint64 settledAt;
        bool active;
    }

    IAgentIdentityRegistry public immutable registry;

    /// @notice On-chain bps caps — the agent cannot settle outside these guardrails.
    uint16 public constant MAX_RATE_BPS = 5_000;        // 50% APR hard ceiling
    uint16 public constant MIN_COLLATERAL_BPS = 10_000; // 100% collateral floor

    uint256 public loanCount;
    mapping(uint256 => Loan) public loans;
    mapping(address => uint256[]) public loansOf;

    error NotAgentController();
    error ZeroPrincipal();
    error RateTooHigh();
    error Undercollateralized();
    error NotBorrowerOrAgent();
    error AlreadyRepaid();

    event LoanSettled(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 indexed agentId,
        uint256 principal,
        uint16 rateBps,
        uint16 collateralBps
    );
    event LoanRepaid(uint256 indexed loanId, address indexed borrower);

    constructor(address registry_) {
        registry = IAgentIdentityRegistry(registry_);
    }

    /// @notice Settle an AI-negotiated loan on-chain. Only the controller of
    ///         `agentId` may call it, so the negotiated terms are provably authored
    ///         by the registered agent.
    /// @return loanId The id of the newly recorded loan.
    function settleLoan(
        uint256 agentId,
        address borrower,
        uint256 principal,
        uint16 rateBps,
        uint16 collateralBps
    ) external returns (uint256 loanId) {
        if (registry.agentIdOf(msg.sender) != agentId || agentId == 0) revert NotAgentController();
        if (principal == 0) revert ZeroPrincipal();
        if (rateBps > MAX_RATE_BPS) revert RateTooHigh();
        if (collateralBps < MIN_COLLATERAL_BPS) revert Undercollateralized();

        loanId = ++loanCount;
        loans[loanId] = Loan({
            borrower: borrower,
            agentId: agentId,
            principal: principal,
            rateBps: rateBps,
            collateralBps: collateralBps,
            settledAt: uint64(block.timestamp),
            active: true
        });
        loansOf[borrower].push(loanId);

        // Credit the negotiating agent's ERC-8004 reputation for a settled deal.
        registry.recordJob(agentId, principal, int256(10));

        emit LoanSettled(loanId, borrower, agentId, principal, rateBps, collateralBps);
    }

    /// @notice Mark a loan repaid. Callable by the borrower or the negotiating agent.
    function markRepaid(uint256 loanId) external {
        Loan storage loan = loans[loanId];
        if (!loan.active) revert AlreadyRepaid();
        bool isAgent = registry.agentIdOf(msg.sender) == loan.agentId && loan.agentId != 0;
        if (msg.sender != loan.borrower && !isAgent) revert NotBorrowerOrAgent();

        loan.active = false;
        // A cleanly repaid loan is a positive outcome for the agent's reputation.
        registry.recordJob(loan.agentId, 0, int256(5));

        emit LoanRepaid(loanId, loan.borrower);
    }

    /// @notice All loan ids for a borrower (for the Lendora portfolio UI).
    function getLoans(address borrower) external view returns (uint256[] memory) {
        return loansOf[borrower];
    }
}
