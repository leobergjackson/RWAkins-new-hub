import fs from 'fs'

let code = fs.readFileSync('hub/app/invoice/page.tsx', 'utf8')

// Replace imports
code = code.replace(
  "import { useAccount } from 'wagmi';",
  "import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';\nimport { parseUnits, toHex, stringToHex, pad } from 'viem';\nimport ReciboArtifact from '@/lib/invoice/Recibo.json';"
)

code = code.replace(
  "import { encodeInvoice } from '@/lib/invoice/invoiceCodec';\nimport { saveInvoice } from '@/lib/invoice/invoiceStore';\n",
  ""
)

// Add Recibo address
code = code.replace(
  "const MONO = '\"Fira Code\",\"JetBrains Mono\",monospace';",
  "const MONO = '\"Fira Code\",\"JetBrains Mono\",monospace';\n\nconst RECIBO_ADDRESS = '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512';"
)

// Change handleGenerate
const newHandleGenerate = `
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const handleGenerate = useCallback(() => {
    if (!description || !amountUSD || !isValidAddress(freelancerWallet)) return;

    // Convert string ID to bytes32 compatible
    const rawId = uuidv4().replace(/-/g, '').slice(0, 32);
    const invoiceId = pad(stringToHex(rawId), { size: 32 });
    const amountBigInt = parseUnits(amountUSD, 6); // USDC has 6 decimals
    const dueTimestamp = dueDate ? BigInt(new Date(dueDate).getTime() / 1000) : 0n;

    writeContract({
      address: RECIBO_ADDRESS,
      abi: ReciboArtifact.abi,
      functionName: 'createInvoice',
      args: [invoiceId, clientName || 'Client', amountBigInt, description.slice(0, 80), dueTimestamp],
    }, {
      onSuccess: () => {
        const url = \`\${window.location.origin}/invoice/pay?id=\${rawId}\`;
        setGeneratedURL(url);
      }
    });
  }, [description, amountUSD, freelancerWallet, clientName, dueDate, writeContract]);
`

code = code.replace(/const handleGenerate = useCallback\(\(\) => \{[\s\S]*?\}, \[description, amountUSD, freelancerWallet, amountUSDC6, clientName, clientEmail, dueDate\]\);/, newHandleGenerate)

// Change Button text
code = code.replace(
  "{canGenerate ? 'Generate Payment Link →' : 'Fill required fields'}",
  "{isPending ? 'Confirming in Wallet...' : isConfirming ? 'Waiting for block...' : canGenerate ? 'Create On-Chain Invoice →' : 'Fill required fields'}"
)

// Disable button while pending
code = code.replace(
  "disabled={!canGenerate}",
  "disabled={!canGenerate || isPending || isConfirming}"
)

fs.writeFileSync('hub/app/invoice/page.tsx', code)
console.log('Transformed page.tsx')
