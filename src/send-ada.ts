/**
 * Send ADA Tool using MeshSDK
 * Sends ADA from one wallet to another on Cardano networks
 */

import { MeshWallet, BlockfrostProvider, Transaction } from '@meshsdk/core';
import { getNetworkAndApiKey, Network } from './network-and-api-handler';
import { readFileSync } from 'fs';

interface SendAdaOptions {
  recipientAddress: string;
  amountAda: number;
  skeyFile?: string;
  skey?: string;
  mnemonic?: string;
  network?: Network;
}

function convertNetworkToId(network: string): number {
  return network.toLowerCase() === 'mainnet' ? 1 : 0;
}

function createWalletFromSkey(skeyContent: string, network: string, provider: BlockfrostProvider): MeshWallet {
  // Parse the skey file content (JSON format from Cardano CLI)
  const skeyData = JSON.parse(skeyContent);
  
  // Extract the private key from CBOR hex
  // The CBOR hex includes a prefix, we need the actual 32-byte private key
  const cborHex = skeyData.cborHex;
  
  // For PaymentSigningKeyShelley_ed25519, the CBOR format is:
  // 5820 (CBOR byte string of 32 bytes) + 32 bytes of private key
  if (!cborHex.startsWith('5820') || cborHex.length !== 68) {
    throw new Error(`Invalid skey format. Expected 68 character CBOR hex starting with '5820', got ${cborHex.length} characters`);
  }
  
  // Extract the 32-byte private key (skip the '5820' prefix)
  const privateKeyHex = cborHex.slice(4);
  
  const networkId = convertNetworkToId(network);
  
  return new MeshWallet({
    networkId: networkId,
    fetcher: provider,
    submitter: provider,
    key: {
      type: 'cli',
      payment: privateKeyHex
    },
  });
}

function createWalletFromMnemonic(mnemonic: string, network: string, provider: BlockfrostProvider): MeshWallet {
  const networkId = convertNetworkToId(network);
  const words = mnemonic.trim().split(' ');
  
  return new MeshWallet({
    networkId: networkId,
    fetcher: provider,
    submitter: provider,
    key: {
      type: 'mnemonic',
      words: words,
    },
  });
}

export async function sendAda(options: SendAdaOptions): Promise<string | null> {
  try {
    const { network, apiKey } = await getNetworkAndApiKey();
    const finalNetwork = options.network || network;
    
    console.log(`💸 Sending ${options.amountAda} ADA on ${finalNetwork} network`);
    console.log(`➡️ To recipient: ${options.recipientAddress}`);

    // Create blockchain provider
    const blockchainProvider = new BlockfrostProvider(apiKey);
    
    let wallet: MeshWallet;
    
    // Determine wallet creation method based on provided options
    if (options.mnemonic) {
      let mnemonicPhrase = options.mnemonic;
      
      // Check if the mnemonic is a file path (contains .mnemonic extension or starts with ./ or /)
      if (options.mnemonic.includes('.mnemonic') || options.mnemonic.startsWith('./') || options.mnemonic.startsWith('/')) {
        console.log(`🔑 Loading mnemonic from file: ${options.mnemonic}`);
        try {
          mnemonicPhrase = readFileSync(options.mnemonic, 'utf8').trim();
        } catch (error) {
          throw new Error(`Failed to read mnemonic file: ${options.mnemonic}. ${error instanceof Error ? error.message : error}`);
        }
      } else {
        console.log("🔑 Creating wallet from mnemonic phrase...");
      }
      
      wallet = createWalletFromMnemonic(mnemonicPhrase, finalNetwork, blockchainProvider);
    } else if (options.skeyFile) {
      console.log(`🔑 Loading wallet from skey file: ${options.skeyFile}`);
      const skeyContent = readFileSync(options.skeyFile, 'utf8');
      wallet = createWalletFromSkey(skeyContent, finalNetwork, blockchainProvider);
    } else if (options.skey) {
      console.log("🔑 Creating wallet from skey string...");
      wallet = createWalletFromSkey(options.skey, finalNetwork, blockchainProvider);
    } else {
      throw new Error("No signing method provided. Use --skey-file, --skey, or --mnemonic");
    }

    // Get sender address
    const senderAddresses = await wallet.getUnusedAddresses();
    const senderAddress = senderAddresses[0];
    console.log(`🏦 Sender address: ${senderAddress}`);

    // Check wallet balance
    const utxos = await wallet.getUtxos();
    if (!utxos || utxos.length === 0) {
      throw new Error("No UTXOs found for sender address. Wallet may be empty or inactive.");
    }

    const balance = await wallet.getBalance();
    const adaBalance = parseInt(balance[0]?.quantity || '0') / 1_000_000;
    console.log(`💰 Current balance: ${adaBalance} ADA`);

    if (adaBalance < options.amountAda) {
      throw new Error(`Insufficient funds. Available: ${adaBalance} ADA, Required: ${options.amountAda} ADA`);
    }

    // Convert ADA to lovelace
    const amountLovelace = Math.floor(options.amountAda * 1_000_000).toString();

    console.log("🔧 Building transaction...");
    
    // Create transaction
    const tx = new Transaction({ initiator: wallet });
    
    // Add output
    tx.sendLovelace(
      options.recipientAddress,
      amountLovelace
    );

    console.log("✍️ Signing and submitting transaction...");
    
    // Build, sign and submit the transaction
    const unsignedTx = await tx.build();
    const signedTx = await wallet.signTx(unsignedTx);
    const txHash = await wallet.submitTx(signedTx);

    console.log("✅ Transaction submitted successfully!");
    console.log(`🔗 Transaction Hash: ${txHash}`);
    
    // Generate appropriate explorer URL based on network
    let explorerUrl: string;
    if (finalNetwork === 'mainnet') {
      explorerUrl = `https://cardanoscan.io/transaction/${txHash}`;
    } else if (finalNetwork === 'preprod') {
      explorerUrl = `https://preprod.cardanoscan.io/transaction/${txHash}`;
    } else {
      explorerUrl = `https://preview.cardanoscan.io/transaction/${txHash}`;
    }
    
    console.log(`🌐 View on Cardanoscan: ${explorerUrl}`);

    return txHash;

  } catch (error) {
    console.error(`❌ Error sending ADA: ${error instanceof Error ? error.message : error}`);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('UTxO not found') || error.message.includes('already spent')) {
        console.error("ℹ️  This usually means a UTxO was already spent. Please try again.");
      } else if (error.message.includes('Insufficient')) {
        console.error("ℹ️  Check your wallet balance and ensure you have enough ADA for the amount plus transaction fees.");
      } else if (error.message.includes('Invalid address')) {
        console.error("ℹ️  Please verify the recipient address is correct and matches the network.");
      }
    }
    
    return null;
  }
}

// CLI interface when run directly
async function main() {
  const args = process.argv.slice(2);
  
  let recipientAddress = "";
  let amountAda = 0;
  let skeyFile = "";
  let skey = "";
  let mnemonic = "";
  let networkOverride = "";
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--recipient' && i + 1 < args.length) {
      recipientAddress = args[i + 1];
      i++;
    } else if (args[i] === '--amount' && i + 1 < args.length) {
      amountAda = parseFloat(args[i + 1]);
      i++;
    } else if (args[i] === '--skey-file' && i + 1 < args.length) {
      skeyFile = args[i + 1];
      i++;
    } else if (args[i] === '--skey' && i + 1 < args.length) {
      skey = args[i + 1];
      i++;
    } else if (args[i] === '--mnemonic' && i + 1 < args.length) {
      mnemonic = args[i + 1];
      i++;
    } else if (args[i] === '--network' && i + 1 < args.length) {
      networkOverride = args[i + 1];
      i++;
    }
  }

  // Validate required parameters
  if (!recipientAddress) {
    console.error('❌ Recipient address is required');
    console.error('Usage: bun run src/send-ada.ts --recipient <address> --amount <ada> [--skey-file <path> | --skey <string> | --mnemonic <phrase>] [--network <network>]');
    console.error('   or: bun run send-ada --recipient <address> --amount <ada> [--skey-file <path> | --skey <string> | --mnemonic <phrase>] [--network <network>]');
    process.exit(1);
  }

  if (!amountAda || amountAda <= 0) {
    console.error('❌ Valid amount in ADA is required');
    process.exit(1);
  }

  if (!skeyFile && !skey && !mnemonic) {
    console.error('❌ Signing method is required: --skey-file, --skey, or --mnemonic');
    process.exit(1);
  }

  // Check for conflicting signing methods
  const signingMethods = [skeyFile, skey, mnemonic].filter(Boolean).length;
  if (signingMethods > 1) {
    console.error('⚠️  Warning: Multiple signing methods provided. Priority: --mnemonic > --skey-file > --skey');
  }

  const validNetworks = ['mainnet', 'preprod', 'preview'];
  if (networkOverride && !validNetworks.includes(networkOverride)) {
    console.error(`❌ Invalid network: ${networkOverride}. Must be one of: ${validNetworks.join(', ')}`);
    process.exit(1);
  }

  console.log(`💸 Cardano ADA Sender (${networkOverride || 'from config'})`);
  console.log("=".repeat(70));

  await sendAda({
    recipientAddress,
    amountAda,
    skeyFile: skeyFile || undefined,
    skey: skey || undefined,
    mnemonic: mnemonic || undefined,
    network: networkOverride as Network || undefined,
  });

  console.log("\n" + "=".repeat(70));
  console.log("✅ Finished.");
}

// Only run main if this file is executed directly
if (import.meta.main) {
  main().catch(console.error);
}