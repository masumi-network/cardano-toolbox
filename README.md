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

**Usage:**
```bash
# Option 1: Direct command
bun run src/check-wallet-balance.ts --address <wallet_address> --network preprod

# Option 2: NPM script
bun run check-balance --address <wallet_address> --network preprod

# Legacy support (still works)
bun run src/check-wallet-balance.ts <wallet_address>
```

**Parameters:**
- `--address` (required): Cardano wallet address to check
- `--network` (optional): Network to use - `mainnet`, `preprod`, or `preview` (uses .env/Raycast preference if not specified)

**Example:**
```bash
bun run check-balance --address addr_test1qzugnxd2u5qpfnnjyht29egu2ufnrdc8fthz9pgf80sf6jy82wx3t07qgfcpf9yexqp5zhrheqcxmpt3njqkazzd228snqjate --network preprod
```

### Create Cardano Wallet

Creates a new Cardano wallet with proper HD derivation using MeshSDK. Generates wallets compatible with standard wallets like Eternl, Nami, etc.

**Features:**
- Generates 24-word BIP39 mnemonic phrase
- Creates properly derived signing/verification keys
- Generates Cardano address using standard derivation path
- Saves files in timestamped format for easy organization
- Uses same HD derivation as masumi-payment-service

**Usage:**
```bash
# Option 1: Direct command
bun run src/create-cardano-wallet.ts --network preprod --name my_wallet

# Option 2: NPM script
bun run create-wallet --network preprod --name my_wallet 
```

**Parameters:**
- `--name` (optional): Base name for wallet files (default: "payment")
- `--network` (optional): Network to use - `testnet`, `mainnet`, `preprod`, or `preview` (default: "testnet")

**Output files:**
- `TIMESTAMP_NAME.mnemonic` - 24-word mnemonic phrase (keep secure!)
- `TIMESTAMP_NAME.addr` - Cardano address for receiving payments
- `TIMESTAMP_NAME.vkey` - Payment verification key hash

**Example:**
```bash
bun run create-wallet --name test_wallet --network preprod
```

Creates files like:
- `cardano_wallets/2025-06-06T1507_test_wallet.mnemonic`
- `cardano_wallets/2025-06-06T1507_test_wallet.addr`
- `cardano_wallets/2025-06-06T1507_test_wallet.vkey`

This project was created using `bun init` in bun v1.2.3. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
