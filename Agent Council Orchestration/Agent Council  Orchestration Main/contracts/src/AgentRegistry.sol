// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentRegistry
 * @author AeroFyta
 * @notice On-chain identity registry for autonomous payment agents.
 *         Agents register themselves with metadata (name, version,
 *         capabilities) and build reputation through endorsements
 *         from other registered agents.
 *
 * @dev    Reputation is tracked as a simple endorsement count.
 *         Each agent can endorse another agent at most once.
 *         Only the contract owner or the agent itself can update metadata.
 */
contract AgentRegistry is Ownable {

    // -----------------------------------------------------------------------
    //  Types
    // -----------------------------------------------------------------------

    struct AgentInfo {
        string name;
        string version;
        string capabilities;   // Comma-separated capability tags
        uint256 registeredAt;
        uint256 endorsements;
        bool active;
    }

    // -----------------------------------------------------------------------
    //  State
    // -----------------------------------------------------------------------

    /// @dev agent address => metadata.
    mapping(address => AgentInfo) private _agents;

    /// @dev endorser => endorsedAgent => bool (prevents double-endorsing).
    mapping(address => mapping(address => bool)) private _hasEndorsed;

    /// @notice All registered agent addresses (append-only for enumeration).
    address[] private _agentList;

    /// @notice Total number of registered agents.
    uint256 public agentCount;

    // -----------------------------------------------------------------------
    //  Events
    // -----------------------------------------------------------------------

    event AgentRegistered(
        address indexed agent,
        string name,
        string version,
        string capabilities
    );

    event AgentUpdated(
        address indexed agent,
        string name,
        string version,
        string capabilities
    );

    event AgentDeactivated(address indexed agent);

    event AgentReactivated(address indexed agent);

    event AgentEndorsed(
        address indexed endorser,
        address indexed endorsed,
        uint256 newEndorsementCount
    );

    // -----------------------------------------------------------------------
    //  Errors
    // -----------------------------------------------------------------------

    error ZeroAddress();
    error AlreadyRegistered(address agent);
    error NotRegistered(address agent);
    error AlreadyEndorsed(address endorser, address endorsed);
    error CannotEndorseSelf();
    error AgentNotActive(address agent);
    error NotAuthorized();
    error EmptyName();

    // -----------------------------------------------------------------------
    //  Modifiers
    // -----------------------------------------------------------------------

    modifier onlyRegisteredAgent() {
        if (_agents[msg.sender].registeredAt == 0) {
            revert NotRegistered(msg.sender);
        }
        _;
    }

    // -----------------------------------------------------------------------
    //  Constructor
    // -----------------------------------------------------------------------

    constructor(address owner_) Ownable(owner_) {}

    // -----------------------------------------------------------------------
    //  External — Registration
    // -----------------------------------------------------------------------

    /**
     * @notice Register a new agent with metadata.
     * @param agent        The agent's address.
     * @param name         Human-readable agent name.
     * @param version      Semantic version string (e.g. "1.0.0").
     * @param capabilities Comma-separated capability tags.
     *
     * @dev Only the contract owner can register agents. This prevents
     *      unauthorized entities from polluting the registry.
     */
    function registerAgent(
        address agent,
        string calldata name,
        string calldata version,
        string calldata capabilities
    ) external onlyOwner {
        if (agent == address(0)) revert ZeroAddress();
        if (bytes(name).length == 0) revert EmptyName();
        if (_agents[agent].registeredAt != 0) revert AlreadyRegistered(agent);

        _agents[agent] = AgentInfo({
            name: name,
            version: version,
            capabilities: capabilities,
            registeredAt: block.timestamp,
            endorsements: 0,
            active: true
        });

        _agentList.push(agent);
        agentCount += 1;

        emit AgentRegistered(agent, name, version, capabilities);
    }

    /**
     * @notice Update metadata for an existing agent.
     * @dev Callable by the agent itself or by the contract owner.
     */
    function updateAgent(
        address agent,
        string calldata name,
        string calldata version,
        string calldata capabilities
    ) external {
        if (_agents[agent].registeredAt == 0) revert NotRegistered(agent);
        if (msg.sender != agent && msg.sender != owner()) revert NotAuthorized();
        if (bytes(name).length == 0) revert EmptyName();

        AgentInfo storage info = _agents[agent];
        info.name = name;
        info.version = version;
        info.capabilities = capabilities;

        emit AgentUpdated(agent, name, version, capabilities);
    }

    /**
     * @notice Deactivate an agent. Deactivated agents cannot receive
     *         endorsements but their history is preserved.
     */
    function deactivateAgent(address agent) external {
        if (_agents[agent].registeredAt == 0) revert NotRegistered(agent);
        if (msg.sender != agent && msg.sender != owner()) revert NotAuthorized();

        _agents[agent].active = false;

        emit AgentDeactivated(agent);
    }

    /**
     * @notice Reactivate a previously deactivated agent.
     */
    function reactivateAgent(address agent) external onlyOwner {
        if (_agents[agent].registeredAt == 0) revert NotRegistered(agent);

        _agents[agent].active = true;

        emit AgentReactivated(agent);
    }

    // -----------------------------------------------------------------------
    //  External — Endorsements
    // -----------------------------------------------------------------------

    /**
     * @notice Endorse another registered agent. Increases their reputation.
     * @param endorsed The agent to endorse.
     *
     * @dev Caller must be a registered agent. Each pair can only endorse once.
     */
    function endorse(address endorsed) external onlyRegisteredAgent {
        if (endorsed == msg.sender) revert CannotEndorseSelf();
        if (_agents[endorsed].registeredAt == 0) revert NotRegistered(endorsed);
        if (!_agents[endorsed].active) revert AgentNotActive(endorsed);
        if (_hasEndorsed[msg.sender][endorsed]) {
            revert AlreadyEndorsed(msg.sender, endorsed);
        }

        _hasEndorsed[msg.sender][endorsed] = true;
        _agents[endorsed].endorsements += 1;

        emit AgentEndorsed(msg.sender, endorsed, _agents[endorsed].endorsements);
    }

    // -----------------------------------------------------------------------
    //  Views
    // -----------------------------------------------------------------------

    /**
     * @notice Returns the full metadata for an agent.
     */
    function getAgent(address agent)
        external
        view
        returns (AgentInfo memory)
    {
        return _agents[agent];
    }

    /**
     * @notice Check if an address is a registered agent.
     */
    function isRegistered(address agent) external view returns (bool) {
        return _agents[agent].registeredAt != 0;
    }

    /**
     * @notice Check if an agent is active.
     */
    function isActive(address agent) external view returns (bool) {
        return _agents[agent].active;
    }

    /**
     * @notice Get the endorsement count for an agent.
     */
    function getEndorsements(address agent) external view returns (uint256) {
        return _agents[agent].endorsements;
    }

    /**
     * @notice Check if `endorser` has endorsed `endorsed`.
     */
    function hasEndorsed(
        address endorser,
        address endorsed
    ) external view returns (bool) {
        return _hasEndorsed[endorser][endorsed];
    }

    /**
     * @notice Returns a paginated list of registered agent addresses.
     * @param offset Start index.
     * @param limit  Maximum number of addresses to return.
     */
    function getAgents(
        uint256 offset,
        uint256 limit
    ) external view returns (address[] memory agents) {
        uint256 total = _agentList.length;
        if (offset >= total) return new address[](0);

        uint256 end = offset + limit;
        if (end > total) end = total;

        agents = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            agents[i - offset] = _agentList[i];
        }
    }
}
