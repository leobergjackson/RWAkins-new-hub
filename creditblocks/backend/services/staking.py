import os
from web3 import Web3
from typing import Optional, Dict
from dotenv import load_dotenv

load_dotenv()

class StakingService:
    """Service for interacting with CreditBlocksStaking contract with stateful fallback"""
    _instance = None
    
    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(StakingService, cls).__new__(cls, *args, **kwargs)
            cls._instance._initialized = False
        return cls._instance
        
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        
        self.rpc_url = os.getenv("QIE_RPC_URL") or os.getenv("QIE_TESTNET_RPC_URL", "https://rpc1testnet.qie.digital/")
        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
        self.staking_address = os.getenv("STAKING_ADDRESS", "").strip()
        
        # State registries for demo / fallback
        self.staked_balances: Dict[str, int] = {}
        self.ncrd_balances: Dict[str, int] = {}
        self.pending_rewards: Dict[str, int] = {}
        
        # Check if address is set and not a placeholder
        if (not self.staking_address or 
            self.staking_address.startswith("0xYour") or 
            self.staking_address == "0x0000000000000000000000000000000000000000" or
            "Your" in self.staking_address or
            "YOUR" in self.staking_address):
            # Staking is optional - service will return defaults if not configured
            self.staking_abi = self._get_staking_abi()
            self.staking_contract = None
            self.staking_address = None
        else:
            try:
                self.staking_abi = self._get_staking_abi()
                self.staking_contract = self.w3.eth.contract(
                    address=Web3.to_checksum_address(self.staking_address),
                    abi=self.staking_abi
                )
            except Exception as e:
                from utils.logger import get_logger
                logger = get_logger(__name__)
                logger.warning(f"Invalid staking address '{self.staking_address}': {e}. Staking disabled.", extra={"error": str(e)})
                self.staking_contract = None
                self.staking_address = None
    
    def _get_staking_abi(self) -> list:
        """Get CreditBlocksStaking contract ABI"""
        return [
            {
                "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
                "name": "integrationTier",
                "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
                "name": "stakedAmount",
                "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
            }
        ]
    
    def get_staked_amount(self, address: str) -> int:
        """Get staked NCRD amount for an address"""
        checksum_address = Web3.to_checksum_address(address)
        if checksum_address in self.staked_balances:
            return self.staked_balances[checksum_address]
            
        if not self.staking_contract:
            return 500  # Default initial staked for demo
        
        try:
            amount = self.staking_contract.functions.stakedAmount(checksum_address).call()
            # Cache it in-memory
            self.staked_balances[checksum_address] = amount
            return amount
        except Exception as e:
            from utils.logger import get_logger
            logger = get_logger(__name__)
            logger.error(f"Error getting staked amount: {e}", exc_info=True)
            return 500
            
    def get_ncrd_balance(self, address: str) -> int:
        """Get NCRD ERC20 balance for address"""
        checksum_address = Web3.to_checksum_address(address)
        if checksum_address in self.ncrd_balances:
            return self.ncrd_balances[checksum_address]
        # Default starting NCRD balance
        self.ncrd_balances[checksum_address] = 1000
        return 1000
        
    def get_pending_rewards(self, address: str) -> int:
        """Get pending rewards for address"""
        checksum_address = Web3.to_checksum_address(address)
        if checksum_address in self.pending_rewards:
            return self.pending_rewards[checksum_address]
        # Default starting NCRD pending rewards
        self.pending_rewards[checksum_address] = 5
        return 5
    
    def stake(self, address: str, amount: int) -> str:
        """Stake NCRD tokens and return transaction hash"""
        checksum_address = Web3.to_checksum_address(address)
        current_staked = self.get_staked_amount(checksum_address)
        current_balance = self.get_ncrd_balance(checksum_address)
        
        # Guard
        if current_balance < amount:
            raise ValueError(f"Insufficient NCRD balance. Available: {current_balance}, Requested: {amount}")
            
        self.staked_balances[checksum_address] = current_staked + amount
        self.ncrd_balances[checksum_address] = current_balance - amount
        
        # Return a simulated transaction hash
        return "0x7a28be1b7470659f8a37d26987C1af36DE169e631b30F153da8b789102c9a4bb"
        
    def unstake(self, address: str, amount: int) -> str:
        """Unstake NCRD tokens and return transaction hash"""
        checksum_address = Web3.to_checksum_address(address)
        current_staked = self.get_staked_amount(checksum_address)
        current_balance = self.get_ncrd_balance(checksum_address)
        
        # Guard
        if current_staked < amount:
            raise ValueError(f"Insufficient staked balance. Available: {current_staked}, Requested: {amount}")
            
        self.staked_balances[checksum_address] = current_staked - amount
        self.ncrd_balances[checksum_address] = current_balance + amount
        
        # Return a simulated transaction hash
        return "0xbb37b28f8043694a37d26987C1af36DE169e631b30F153da8b789102c9a4c0a52"
    
    def get_integration_tier(self, address: str) -> int:
        """Get integration tier for an address (0-3)"""
        checksum_address = Web3.to_checksum_address(address)
        staked_amount = self.get_staked_amount(checksum_address)
        
        # Tier logic based on staked amount
        if staked_amount >= 1000:
            return 3  # Gold
        elif staked_amount >= 500:
            return 2  # Silver
        elif staked_amount >= 100:
            return 1  # Bronze
        return 0
    
    def calculate_staking_boost(self, tier: int) -> int:
        """
        Calculate score boost based on staking tier
        
        Tier mapping:
        - 0 (none): 0 points
        - 1 (Bronze): +50 points
        - 2 (Silver): +150 points
        - 3 (Gold): +300 points
        """
        boost_map = {
            0: 0,
            1: 50,
            2: 150,
            3: 300
        }
        return boost_map.get(tier, 0)

