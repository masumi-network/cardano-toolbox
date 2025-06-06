import { getNetworkAndApiKey, Network } from './network-and-api-handler';
import { BlockFrostAPI, BlockfrostServerError, BlockfrostClientError } from '@blockfrost/blockfrost-js';

async function getWalletBalance(address: string, network: Network, apiKey: string) {
  try {
    console.log(`🔍 Checking balance for address: ${address} on ${network} network.`);
    const api = new BlockFrostAPI({ projectId: apiKey, network });

    const addressInfo = await api.addresses(address);

    console.log('\n💰 Wallet Balance:');
    let adaBalance = 0;
    const otherAssets: { unit: string; quantity: string }[] = [];

    for (const amount of addressInfo.amount) {
      if (amount.unit === 'lovelace') {
        adaBalance = Number(amount.quantity) / 1_000_000;
      } else {
        otherAssets.push({ unit: amount.unit, quantity: amount.quantity });
      }
    }

    console.log(`  ADA: ${adaBalance}`);
    if (otherAssets.length > 0) {
      console.log('\n📦 Other Assets:');
      for (const asset of otherAssets) {
        console.log(`  - ${asset.quantity} ${asset.unit}`);
      }
    }
  } catch (error: unknown) {
    if (error instanceof BlockfrostServerError) {
      console.error(`❌ Blockfrost API Error: ${error.error}`);
      if (error.status_code === 404) {
        console.error(`ℹ️  The address ${process.argv[2]} was not found on the blockchain. It might be new or have no transaction history.`);
      } else if (error.status_code === 403) {
        console.error(`ℹ️  Blockfrost API key is invalid or does not have access to the ${network} network.`);
      }
    } else if (error instanceof BlockfrostClientError) {
      console.error(`❌ Blockfrost Client Error: ${error.code}`);
    } else {
      console.error('❌ An unexpected error occurred:', error);
    }
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  let address = "";
  let networkOverride = "";
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--address' && i + 1 < args.length) {
      address = args[i + 1];
      i++; // Skip next argument
    } else if (args[i] === '--network' && i + 1 < args.length) {
      networkOverride = args[i + 1];
      i++; // Skip next argument
    } else if (!args[i].startsWith('--')) {
      // Support legacy positional argument for backward compatibility
      address = args[i];
    }
  }

  if (!address) {
    console.error('❌ Wallet address is required');
    console.error('Usage: bun run src/check-wallet-balance.ts --address <wallet_address> [--network <network>]');
    console.error('   or: bun run check-balance --address <wallet_address> [--network <network>]');
    console.error('Legacy: bun run src/check-wallet-balance.ts <wallet_address>');
    process.exit(1);
  }

  const { network, apiKey } = await getNetworkAndApiKey();
  
  // Use network override if provided and valid
  const finalNetwork = networkOverride && ['mainnet', 'preprod', 'preview'].includes(networkOverride) 
    ? networkOverride as Network 
    : network;

  console.log(`💳 Cardano Wallet Balance Checker (${finalNetwork})`);
  console.log('='.repeat(70));
  await getWalletBalance(address, finalNetwork, apiKey);
  console.log('\n' + '='.repeat(70));
  console.log('✅ Finished.');
}

if (import.meta.main) {
  main();
}