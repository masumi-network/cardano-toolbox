/**
 * Cardano Wallet Creator using MeshSDK (same as masumi-payment-service)
 * Creates properly HD-derived wallets compatible with standard wallets like Eternl
 */

import { MeshWallet, resolvePaymentKeyHash } from '@meshsdk/core';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { createHash, randomBytes } from 'crypto';

const WALLETS_DIR = "cardano_wallets";

interface WalletResult {
  address: string;
  vKey: string;
  mnemonicPath: string;
  addrPath: string;
  vkeyPath: string;
  mnemonic: string;
}

function convertNetworkToId(network: string): number {
  return network.toLowerCase() === 'mainnet' ? 1 : 0;
}

function generateOfflineWallet(network: string, mnemonic: string[]) {
  const networkId = convertNetworkToId(network);
  return new MeshWallet({
    networkId: networkId,
    key: {
      type: 'mnemonic',
      words: mnemonic,
    },
  });
}

export async function createWallet(
  baseFilenamePrefix: string = "wallet", 
  networkStr: string = "preprod"
): Promise<WalletResult | null> {
  try {
    // Create the wallets directory if it doesn't exist
    if (!existsSync(WALLETS_DIR)) {
      mkdirSync(WALLETS_DIR, { recursive: true });
    }
    console.log(`🗂️ Wallet files will be saved in: ${resolve(WALLETS_DIR)}`);

    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}-${String(now.getMilliseconds()).padStart(3, '0')}`;
    const baseFilename = `${timestamp}-${baseFilenamePrefix}`;

    console.log(`🔑 Generating new Cardano wallet with mnemonic, keys and address for ${networkStr.charAt(0).toUpperCase() + networkStr.slice(1)} network with base name: ${baseFilenamePrefix}...`);

    // Generate mnemonic using MeshSDK (same as masumi-payment-service)
    const secretKey = MeshWallet.brew(false);
    const secretWords = typeof secretKey === 'string' ? secretKey.split(' ') : secretKey;
    const mnemonicPhrase = secretWords.join(' ');

    // Save mnemonic
    const mnemonicPath = join(WALLETS_DIR, `${baseFilename}.mnemonic`);
    writeFileSync(mnemonicPath, mnemonicPhrase);
    console.log(`✅ Mnemonic saved to: ${mnemonicPath}`);

    // Generate wallet from mnemonic using proper HD derivation
    const wallet = generateOfflineWallet(networkStr, secretWords);

    // Get the properly derived address and signing key
    const address = (await wallet.getUnusedAddresses())[0];
    const vKey = resolvePaymentKeyHash(address);
    
    // Note: We don't generate .skey files because MeshSDK and PyCardano 
    // derive different addresses from the same private key
    // Use the .mnemonic file for signing with our TypeScript tools

    // Save address
    const addrPath = join(WALLETS_DIR, `${baseFilename}.addr`);
    writeFileSync(addrPath, address);
    console.log(`✅ Wallet Address (${networkStr.charAt(0).toUpperCase() + networkStr.slice(1)}) saved to: ${addrPath}`);
    console.log(`   Address: ${address}`);

    // Save vkey (verification key hash)
    const vkeyPath = join(WALLETS_DIR, `${baseFilename}.vkey`);
    writeFileSync(vkeyPath, vKey);
    console.log(`✅ Payment Verification Key Hash saved to: ${vkeyPath}`);

    console.log("\n🛡️ Important Security Reminders:");
    console.log(`  - Securely back up your mnemonic file ('${mnemonicPath}'). This can authorize transactions.`);
    console.log("  - Do NOT share your mnemonic with anyone.");
    console.log("  - The verification key and address can be shared publicly.");
    console.log(`  - Remember the location of these files: ${resolve(WALLETS_DIR)}`);
    console.log("  - Use the .mnemonic file for signing transactions with our tools.");

    return {
      address,
      vKey,
      mnemonicPath,
      addrPath,
      vkeyPath,
      mnemonic: mnemonicPhrase
    };

  } catch (error) {
    console.error(`❌ An error occurred during wallet generation: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

// CLI interface when run directly
async function main() {
  const args = process.argv.slice(2);
  
  let name = "wallet";
  let network = "preprod";
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name' && i + 1 < args.length) {
      name = args[i + 1];
      i++; // Skip next argument
    } else if (args[i] === '--network' && i + 1 < args.length) {
      network = args[i + 1];
      i++; // Skip next argument
    }
  }

  if (!['testnet', 'mainnet', 'preprod', 'preview'].includes(network)) {
    console.error("❌ Network must be 'testnet', 'mainnet', 'preprod', or 'preview'");
    process.exit(1);
  }

  // Convert preprod/preview to testnet for MeshSDK
  const meshNetwork = ['preprod', 'preview'].includes(network) ? 'testnet' : network;

  console.log(`🛠️ Cardano Wallet Creator (${network.charAt(0).toUpperCase() + network.slice(1)})`);
  console.log("=".repeat(70));

  await createWallet(name, meshNetwork);

  console.log("\n" + "=".repeat(70));
  console.log("✅ Wallet generation process finished.");
}

// Only run main if this file is executed directly
if (import.meta.main) {
  main().catch(console.error);
}