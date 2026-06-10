# AeroFyta Smart Contracts

Production-ready Solidity contracts powering AeroFyta's autonomous payment agent infrastructure on Ethereum.

## Contracts

### TipSplitter.sol

Accepts USDT tips and atomically distributes them between a creator and their collaborators using configurable basis-point split ratios.

- Configurable split ratios per creator (basis points, must sum to 10,000)
- Atomic multi-recipient distribution with dust-free rounding
- Owner-managed split configurations
- Reentrancy-protected with OpenZeppelin SafeERC20
- Events: `TipSent`, `TipSplit`, `SplitConfigured`, `SplitRemoved`

### AgentEscrow.sol

Hash Time-Locked Contract (HTLC) escrow for trustless agent-to-agent payments. Funds are locked with a SHA-256 hashlock and a configurable timelock.

- SHA-256 hashlock with preimage-based claims
- Configurable timelock bounds (owner-managed min/max)
- Three-state lifecycle: Active, Claimed, Refunded
- Off-chain preimage verification helper
- Events: `EscrowCreated`, `EscrowClaimed`, `EscrowRefunded`

### AgentRegistry.sol

On-chain identity and reputation registry for autonomous payment agents.

- Agent registration with metadata (name, version, capabilities)
- Peer endorsement system for reputation building
- Agent activation/deactivation without data loss
- Paginated agent enumeration
- Events: `AgentRegistered`, `AgentUpdated`, `AgentEndorsed`, `AgentDeactivated`, `AgentReactivated`

## Setup

```bash
cd contracts
npm install
npx hardhat compile
```

## Configuration

Create a `.env` file in the `contracts/` directory:

```env
SEPOLIA_RPC_URL=https://rpc.sepolia.org
DEPLOYER_PRIVATE_KEY=0x_your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key
```

## Deployment

```bash
# Compile
npx hardhat compile

# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# Verify on Etherscan
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

## Deployed Addresses (Sepolia Testnet)

| Contract       | Address                                      | Etherscan |
|----------------|----------------------------------------------|-----------|
| TipSplitter    | `TBD — deploy pending`                       | [Verify](https://sepolia.etherscan.io/) |
| AgentEscrow    | `TBD — deploy pending`                       | [Verify](https://sepolia.etherscan.io/) |
| AgentRegistry  | `TBD — deploy pending`                       | [Verify](https://sepolia.etherscan.io/) |
| USDT (testnet) | `0x7169D38820dfd117C3FA1f22a697dBA58d90BA06` | [View](https://sepolia.etherscan.io/token/0x7169D38820dfd117C3FA1f22a697dBA58d90BA06) |

## Architecture

```
User/Agent
    |
    v
TipSplitter --- tip(creator, amount) ---> distributes to N recipients
    |
AgentEscrow --- createEscrow() ---------> HTLC lock
            --- claim(preimage) ---------> recipient claims
            --- refund() ----------------> depositor reclaims after timeout
    |
AgentRegistry --- registerAgent() ------> identity on-chain
              --- endorse() ------------> peer reputation
```

## Security Notes

- All token transfers use OpenZeppelin `SafeERC20` to handle non-standard ERC-20 return values
- Reentrancy guards on all state-changing functions that transfer tokens
- Custom errors for gas-efficient reverts
- Basis-point validation ensures split configs always sum to exactly 100%
- Timelock bounds prevent both extremely short and extremely long escrow periods

## License

Apache-2.0
