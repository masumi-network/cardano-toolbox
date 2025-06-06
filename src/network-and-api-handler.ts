import { getNetwork, Network } from './config';

/**
 * Pair of selected Cardano network and its Blockfrost API key.
 */
export interface NetworkAndApiKey {
  network: Network;
  apiKey: string;
}

export type { Network };

/**
 * Determines the Cardano network and picks the corresponding Blockfrost API key.
 *
 * Network is resolved in this order:
 * 1. Raycast preference (if running under Raycast)
 * 2. NETWORK env var in .env
 * 3. fallback: 'preprod'
 *
 * Then selects the matching API key from env vars:
 * BLOCKFROST_API_KEY_MAINNET | BLOCKFROST_API_KEY_PREPROD | BLOCKFROST_API_KEY_PREVIEW
 *
 * Exits the process with an error message if the API key is missing.
 */
export async function getNetworkAndApiKey(): Promise<NetworkAndApiKey> {
  const network = await getNetwork();
  const envVar = `BLOCKFROST_API_KEY_${network.toUpperCase()}`;
  const apiKey = process.env[envVar];
  if (!apiKey) {
    console.error(`❌ Error: ${envVar} not found in environment.`);
    console.error(`💡 Please add ${envVar} to your .env file or Raycast preferences.`);
    process.exit(1);
  }
  return { network, apiKey };
}