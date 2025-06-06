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
  if (args.length !== 1) {
    console.error('Usage: bun run check-wallet-balance.ts <wallet_address>');
    process.exit(1);
  }
  const address = args[0];

  const { network, apiKey } = await getNetworkAndApiKey();
  console.log(`💳 Cardano Wallet Balance Checker (${network})`);
  console.log('='.repeat(50));
  await getWalletBalance(address, network, apiKey);
  console.log('\n' + '='.repeat(50));
  console.log('✅ Finished.');
}

if (import.meta.main) {
  main();
}