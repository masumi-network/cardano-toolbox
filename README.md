# Cardano Toolbox

Command-line tools for Cardano blockchain interactions and Masumi payment system integration.

## Installation

```bash
bun install
```

## Configuration

Create a `.env` file with:

```env
# Blockfrost API keys
BLOCKFROST_API_KEY_MAINNET=your_mainnet_api_key
BLOCKFROST_API_KEY_PREPROD=your_preprod_api_key
BLOCKFROST_API_KEY_PREVIEW=your_preview_api_key

# Optional network selection (defaults to preprod)
NETWORK=preprod

# Masumi payment service configuration
MASUMI_PAYMENT_SERVICE_URL=https://masumi-payment-service.up.railway.app/api/v1
MASUMI_API_KEY=your_admin_key
MASUMI_AGENT_IDENTIFIER=your_agent_identifier
MASUMI_SELLER_VKEY=your_seller_verification_key
MASUMI_NETWORK=Preprod
```

## Cardano Tools

### Check Wallet Balance

Check ADA balance for any Cardano address:

```bash
bun run check-balance --address addr_test1qz... --network preprod
```

### Create Cardano Wallet

Generate new Cardano wallets compatible with standard wallets:

```bash
bun run create-wallet --name my_wallet --network preprod
```

Creates timestamped files:
- `.mnemonic` - 24-word recovery phrase
- `.addr` - Cardano address
- `.vkey` - Verification key hash

### Send ADA

Transfer ADA between wallets:

```bash
bun run send-ada --recipient addr_test1qz... --amount 5.0 --mnemonic ./wallet.mnemonic --network preprod
```

## Masumi Payment Tools

Tools for interacting with the Masumi decentralized payment system for AI agents.

### Create Payment Request

```bash
bun run masumi-payment-create --input-data '{"task": "analysis"}' --output-file payment.json
```

### Check Payment Status

```bash
bun run masumi-payment-check --file payment.json
```

**Payment States:**
- `FundsLocked` - ✅ Payment confirmed
- `ResultSubmitted` - ✅ Work completed
- `null/pending` - ⏳ Processing
- `RefundRequested` - ❌ Failed

### Lock Funds (Purchase)

```bash
bun run masumi-purchase-create --file payment.json
```

## Masumi Payment Flow

Complete workflow for agent payments:

```bash
# 1. Create payment request
bun run masumi-payment-create \
  --input-data '{"service": "document analysis", "pages": 10}' \
  --output-file doc-payment.json

# 2. Lock funds
bun run masumi-purchase-create --file doc-payment.json

# 3. Monitor until FundsLocked
bun run masumi-payment-check --file doc-payment.json

# Payment confirmed when status shows "FundsLocked"
```

The Masumi system enables:
- **Decentralized AI agent payments** on Cardano blockchain
- **Trustless escrow** with smart contracts
- **Agent discovery and hiring** through payment service
- **Result delivery** with payment confirmation

Agents register with the Masumi registry, users create payment requests, lock funds through purchases, and receive work results once payments are confirmed on-chain.
