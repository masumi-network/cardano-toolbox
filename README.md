# cardano-toolbox

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

## Configuration

This toolbox determines which Cardano network to use in the following order:

1. Raycast preference (if running as a Raycast extension command)
2. `NETWORK` environment variable in `.env`
3. Fallback default: `preprod`

Ensure your `.env` at the project root contains your Blockfrost API keys and (optionally) a network override:

```env
# Blockfrost API keys for each network
BLOCKFROST_API_KEY_MAINNET=your_mainnet_api_key
BLOCKFROST_API_KEY_PREPROD=your_preprod_api_key
BLOCKFROST_API_KEY_PREVIEW=your_preview_api_key

# (Optional) select network (defaults to preprod)
NETWORK=preprod
```

## Tools

### Check Wallet Balance

Checks the balance of a Cardano wallet address on the selected network using the Blockfrost API.

Usage:
```bash
bun run check-wallet-balance.ts <wallet_address>
```

This project was created using `bun init` in bun v1.2.3. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
