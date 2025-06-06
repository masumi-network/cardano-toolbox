import dotenv from 'dotenv';

dotenv.config();

export type Network = 'mainnet' | 'preprod' | 'preview';

export async function getNetwork(): Promise<Network> {
  try {
    const { getPreferenceValues } = await import('@raycast/api');
    const prefs = getPreferenceValues<{ network?: Network }>();
    if (prefs.network) {
      return prefs.network;
    }
  } catch {
  }

  const env = process.env.NETWORK?.toLowerCase();
  if (env === 'mainnet' || env === 'preprod' || env === 'preview') {
    return env;
  }

  return 'preprod';
}