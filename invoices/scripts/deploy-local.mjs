import { createWalletClient, createPublicClient, http, getContract } from 'viem'
import { hardhat } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import fs from 'fs'

const account = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80') // Hardhat #0 account
const client = createWalletClient({ account, chain: hardhat, transport: http('http://127.0.0.1:8545') })
const publicClient = createPublicClient({ chain: hardhat, transport: http('http://127.0.0.1:8545') })

const tokenArtifact = JSON.parse(fs.readFileSync('./artifacts/contracts/mocks/ReentrantToken.sol/ReentrantToken.json', 'utf8'))
const reciboArtifact = JSON.parse(fs.readFileSync('./artifacts/contracts/Recibo.sol/Recibo.json', 'utf8'))

async function deploy() {
  console.log('Deploying Mock USDC...')
  const tokenHash = await client.deployContract({
    abi: tokenArtifact.abi,
    bytecode: tokenArtifact.bytecode,
  })
  const tokenReceipt = await publicClient.waitForTransactionReceipt({ hash: tokenHash })
  const tokenAddress = tokenReceipt.contractAddress
  console.log(`Mock USDC deployed to: ${tokenAddress}`)

  console.log('Deploying Recibo contract...')
  const reciboHash = await client.deployContract({
    abi: reciboArtifact.abi,
    bytecode: reciboArtifact.bytecode,
    args: [tokenAddress]
  })
  const reciboReceipt = await publicClient.waitForTransactionReceipt({ hash: reciboHash })
  const reciboAddress = reciboReceipt.contractAddress
  console.log(`Recibo deployed to: ${reciboAddress}`)

  fs.writeFileSync('./deployed.json', JSON.stringify({ MockUSDC: tokenAddress, Recibo: reciboAddress }, null, 2))
}

deploy().catch(console.error)
