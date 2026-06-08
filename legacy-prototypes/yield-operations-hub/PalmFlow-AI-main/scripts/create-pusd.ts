// Built by vsrupeshkumar
import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from '@solana/spl-token';

async function main() {
  console.log('--- PalmFlow AI: PUSD Token Creation ---');
  
  // 1. Connect to Devnet
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  
  // 2. Generate a new keypair for the payer/authority
  const payer = Keypair.generate();
  console.log('Payer Address:', payer.publicKey.toBase58());
  
  // 3. Airdrop SOL to payer
  console.log('Requesting Airdrop...');
  const airdropSignature = await connection.requestAirdrop(
    payer.publicKey,
    LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(airdropSignature);
  console.log('Airdrop successful.');

  // 4. Create Mint
  console.log('Creating PUSD Mint...');
  const mint = await createMint(
    connection,
    payer,
    payer.publicKey,
    payer.publicKey,
    9 // 9 decimals
  );
  console.log('PUSD Mint Created:', mint.toBase58());

  // 5. Create Associated Token Account for Payer
  console.log('Creating Associated Token Account...');
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );
  console.log('Token Account:', tokenAccount.address.toBase58());

  // 6. Mint initial supply (e.g., 1,000,000 PUSD)
  console.log('Minting initial supply (1,000,000 PUSD)...');
  await mintTo(
    connection,
    payer,
    mint,
    tokenAccount.address,
    payer,
    1000000 * 10**9
  );
  console.log('Minting successful.');

  console.log('--- Setup Complete ---');
  console.log('Mint Address:', mint.toBase58());
  console.log('Payer Secret Key (Keep Safe!):', JSON.stringify(Array.from(payer.secretKey)));
}

main().catch(err => {
  console.error('Error creating PUSD:', err);
});
