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
- `--name` (optional): Base name for wallet files (default: "wallet")
- `--network` (optional): Network to use - `testnet`, `mainnet`, `preprod`, or `preview` (default: "preprod")

**Output files:**
- `TIMESTAMP_NAME.mnemonic` - 24-word mnemonic phrase (keep secure!)
- `TIMESTAMP_NAME.addr` - Cardano address for receiving payments
- `TIMESTAMP_NAME.vkey` - Payment verification key hash

**Note:** No .skey files are generated as they're incompatible with MeshSDK. Use .mnemonic files for signing.

**Example:**
```bash
bun run create-wallet --name test_wallet --network preprod
```

Creates files like:
- `cardano_wallets/2025-06-06-18-41-12-052-test_wallet.mnemonic`
- `cardano_wallets/2025-06-06-18-41-12-052-test_wallet.addr`
- `cardano_wallets/2025-06-06-18-41-12-052-test_wallet.vkey`

### Send ADA

Sends ADA from one wallet to another on Cardano networks using MeshSDK. Supports multiple signing methods and automatic transaction building.

**Features:**
- Send ADA with automatic fee calculation
- Multiple signing methods: skey file, skey string, or mnemonic
- Network support: mainnet, preprod, preview
- Balance checking before sending
- Transaction status and explorer links

**Usage:**
```bash
# Option 1: Direct command
bun run src/send-ada.ts --recipient <address> --amount <ada> --skey-file <path> --network preprod

# Option 2: NPM script
bun run send-ada --recipient <address> --amount <ada> --mnemonic "<phrase>" --network preprod
```

**Parameters:**
- `--recipient` (required): Cardano address to send ADA to
- `--amount` (required): Amount of ADA to send (e.g., 10.5)
- `--mnemonic` (required): 24-word mnemonic phrase for signing OR path to .mnemonic file
- `--network` (optional): Network to use - `mainnet`, `preprod`, or `preview` (uses .env/Raycast preference if not specified)

**Note:** Use mnemonic files for signing. Legacy .skey support exists but may derive different addresses.

**Examples:**
```bash
# Using mnemonic phrase
bun run send-ada --recipient addr_test1qz... --amount 5.0 --mnemonic "word1 word2 ... word24" --network preprod

# Using mnemonic file (recommended)
bun run send-ada --recipient addr_test1qz... --amount 5.0 --mnemonic ./cardano_wallets/wallet.mnemonic --network preprod
```

This project was created using `bun init` in bun v1.2.3. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
