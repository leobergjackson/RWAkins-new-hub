// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AgentIdentityRegistry (ERC-8004 "Trustless Agents")
/// @notice Issues every Kubryx AI agent a unique on-chain identity NFT and keeps a
///         permanent, decentralised record of its achievements and reputation —
///         exactly the model the Turing Test Hackathon benchmarks against.
///
///         Faithful, self-contained implementation of the ERC-8004 Identity +
///         Reputation registry pattern. The identity is a SOULBOUND ERC-721 (an
///         agent's identity is not a tradeable asset), and its metadata — domain,
///         controller, role, jobs, reputation, volume — is rendered entirely
///         on-chain via a base64 `tokenURI`. No IPFS, no off-chain database.
///
/// @dev    Reputation is not self-asserted. The identity NFT is minted by its
///         controller, but achievements (`recordJob`) can only be written by
///         *authorized attestor contracts* — {KubryxRWAVault} on an AI rebalance,
///         {LendingSettlement} on a settled loan. The score is therefore a
///         verifiable consequence of real on-chain outcomes.
///
///         Self-contained on purpose: a minimal ERC-721 (metadata + ERC-165) plus
///         inlined Base64 / integer-to-string helpers, so it carries no external
///         dependency and compiles under Solidity 0.8.20.
contract AgentIdentityRegistry {
    // ─── ERC-721 metadata ──────────────────────────────────────────────────────
    string public constant name = "Kubryx Agent Identity";
    string public constant symbol = "KAGENT";

    // ─── Ownership (registry admin) ──────────────────────────────────────────────
    address public owner;

    struct AgentInfo {
        string domain;          // e.g. "lendora.kubryx.xyz" — the agent's registration domain
        address controller;     // the wallet/agent address that operates this identity
        string role;            // e.g. "RWA Treasury Rebalancer", "Loan Negotiator"
        uint64 registeredAt;    // block timestamp at mint
        uint256 jobsCompleted;  // count of attested on-chain actions
        uint256 totalVolume;    // cumulative settled volume (token base units)
        int256 reputation;      // signed score; attestors add/subtract
    }

    uint256 private _nextId = 1;

    mapping(uint256 => address) private _ownerOfToken; // agentId => holder
    mapping(address => uint256) private _balances;     // holder => count
    mapping(uint256 => AgentInfo) public agents;       // agentId => card
    mapping(address => uint256) public agentIdOf;       // controller => agentId (0 if none)
    mapping(address => bool) public isAttestor;         // contracts allowed to attest

    error NotOwner();
    error AlreadyRegistered();
    error NotAttestor();
    error UnknownAgent();
    error EmptyDomain();
    error Soulbound();

    // ERC-721 standard event — emitted on mint so indexers/wallets see the NFT.
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event AgentRegistered(uint256 indexed agentId, address indexed controller, string domain, string role);
    event AttestorSet(address indexed attestor, bool allowed);
    event JobRecorded(uint256 indexed agentId, address indexed attestor, uint256 volume, int256 scoreDelta);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // ─── Identity ────────────────────────────────────────────────────────────────

    /// @notice Mint a unique ERC-8004 identity NFT for the caller's AI agent.
    /// @return agentId The freshly minted identity token id.
    function registerAgent(string calldata domain, string calldata role)
        external
        returns (uint256 agentId)
    {
        if (bytes(domain).length == 0) revert EmptyDomain();
        if (agentIdOf[msg.sender] != 0) revert AlreadyRegistered();

        agentId = _nextId++;
        agents[agentId] = AgentInfo({
            domain: domain,
            controller: msg.sender,
            role: role,
            registeredAt: uint64(block.timestamp),
            jobsCompleted: 0,
            totalVolume: 0,
            reputation: 0
        });
        agentIdOf[msg.sender] = agentId;

        _ownerOfToken[agentId] = msg.sender;
        _balances[msg.sender] += 1;

        emit Transfer(address(0), msg.sender, agentId);
        emit AgentRegistered(agentId, msg.sender, domain, role);
    }

    // ─── Reputation (attestor-only) ────────────────────────────────────────────

    function setAttestor(address attestor, bool allowed) external onlyOwner {
        isAttestor[attestor] = allowed;
        emit AttestorSet(attestor, allowed);
    }

    /// @notice Record an on-chain achievement for an agent. Attestor-gated.
    function recordJob(uint256 agentId, uint256 volume, int256 scoreDelta) external {
        if (!isAttestor[msg.sender]) revert NotAttestor();
        if (_ownerOfToken[agentId] == address(0)) revert UnknownAgent();

        AgentInfo storage a = agents[agentId];
        a.jobsCompleted += 1;
        a.totalVolume += volume;
        a.reputation += scoreDelta;

        emit JobRecorded(agentId, msg.sender, volume, scoreDelta);
    }

    function getAgent(uint256 agentId) external view returns (AgentInfo memory) {
        if (_ownerOfToken[agentId] == address(0)) revert UnknownAgent();
        return agents[agentId];
    }

    function totalAgents() external view returns (uint256) {
        return _nextId - 1;
    }

    // ─── Minimal ERC-721 surface (soulbound) ─────────────────────────────────────

    function balanceOf(address holder) external view returns (uint256) {
        return _balances[holder];
    }

    function ownerOf(uint256 agentId) public view returns (address) {
        address holder = _ownerOfToken[agentId];
        if (holder == address(0)) revert UnknownAgent();
        return holder;
    }

    /// @dev ERC-165: advertises ERC-721 + ERC-721 Metadata + ERC-165 support.
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == 0x01ffc9a7 || // ERC-165
            interfaceId == 0x80ac58cd || // ERC-721
            interfaceId == 0x5b5e139f;   // ERC-721 Metadata
    }

    // Identity tokens are non-transferable: every transfer/approval path reverts.
    function approve(address, uint256) external pure { revert Soulbound(); }
    function setApprovalForAll(address, bool) external pure { revert Soulbound(); }
    function getApproved(uint256) external pure returns (address) { return address(0); }
    function isApprovedForAll(address, address) external pure returns (bool) { return false; }
    function transferFrom(address, address, uint256) external pure { revert Soulbound(); }
    function safeTransferFrom(address, address, uint256) external pure { revert Soulbound(); }
    function safeTransferFrom(address, address, uint256, bytes calldata) external pure { revert Soulbound(); }

    // ─── Fully on-chain metadata ─────────────────────────────────────────────────

    /// @notice ERC-721 metadata rendered entirely on-chain as a base64 data URI.
    function tokenURI(uint256 agentId) external view returns (string memory) {
        if (_ownerOfToken[agentId] == address(0)) revert UnknownAgent();
        AgentInfo memory a = agents[agentId];

        string memory rep = a.reputation < 0
            ? string.concat("-", _toString(uint256(-a.reputation)))
            : _toString(uint256(a.reputation));

        string memory json = string.concat(
            '{"name":"Kubryx Agent #', _toString(agentId),
            '","description":"ERC-8004 identity for a Kubryx AI agent on Mantle. Reputation is earned from attested on-chain outcomes.",',
            '"attributes":[',
            '{"trait_type":"Role","value":"', a.role, '"},',
            '{"trait_type":"Domain","value":"', a.domain, '"},',
            '{"trait_type":"Controller","value":"', _toHexString(a.controller), '"},',
            '{"trait_type":"Jobs Completed","value":', _toString(a.jobsCompleted), '},',
            '{"trait_type":"Total Volume","value":', _toString(a.totalVolume), '},',
            '{"trait_type":"Reputation","value":', rep, '},',
            '{"trait_type":"Registered At","value":', _toString(uint256(a.registeredAt)), '}',
            ']}'
        );

        return string.concat("data:application/json;base64,", _base64(bytes(json)));
    }

    // ─── Inlined helpers ─────────────────────────────────────────────────────────

    function _toString(uint256 value) private pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function _toHexString(address account) private pure returns (string memory) {
        bytes20 data = bytes20(account);
        bytes16 hexSymbols = "0123456789abcdef";
        bytes memory buffer = new bytes(42);
        buffer[0] = "0";
        buffer[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            buffer[2 + i * 2] = hexSymbols[uint8(data[i]) >> 4];
            buffer[3 + i * 2] = hexSymbols[uint8(data[i]) & 0x0f];
        }
        return string(buffer);
    }

    /// @dev Standard base64 encoder (RFC 4648), adapted from the well-known
    ///      Brecht Devos / OpenZeppelin implementation.
    function _base64(bytes memory data) private pure returns (string memory) {
        if (data.length == 0) return "";
        string memory table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        uint256 encodedLen = 4 * ((data.length + 2) / 3);
        string memory result = new string(encodedLen + 32);

        assembly {
            mstore(result, encodedLen)
            let tablePtr := add(table, 1)
            let dataPtr := data
            let endPtr := add(dataPtr, mload(data))
            let resultPtr := add(result, 32)

            for {} lt(dataPtr, endPtr) {} {
                dataPtr := add(dataPtr, 3)
                let input := mload(dataPtr)

                mstore8(resultPtr, mload(add(tablePtr, and(shr(18, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(12, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(6, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(input, 0x3F))))
                resultPtr := add(resultPtr, 1)
            }

            switch mod(mload(data), 3)
            case 1 {
                mstore8(sub(resultPtr, 1), 0x3d)
                mstore8(sub(resultPtr, 2), 0x3d)
            }
            case 2 {
                mstore8(sub(resultPtr, 1), 0x3d)
            }
        }

        return result;
    }
}
