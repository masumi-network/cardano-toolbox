import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config();

interface MasumiConfig {
  paymentServiceUrl: string;
  apiKey: string;
  agentIdentifier: string;
  network: string;
  sellerVkey: string;
}

async function createPurchase(config: MasumiConfig, paymentResponse: any, identifierFromPurchaser: string) {
  const { paymentServiceUrl, apiKey, agentIdentifier, network, sellerVkey } = config;
  const paymentData = paymentResponse.data;

  // use exact values from payment response - critical for blockchain signature validation
  const requestBody = {
    identifierFromPurchaser: identifierFromPurchaser,
    network: network,
    sellerVkey: sellerVkey,
    paymentType: 'Web3CardanoV1',
    blockchainIdentifier: paymentData.blockchainIdentifier,
    payByTime: String(paymentData.payByTime),
    submitResultTime: String(paymentData.submitResultTime),
    unlockTime: String(paymentData.unlockTime),
    externalDisputeUnlockTime: String(paymentData.externalDisputeUnlockTime),
    agentIdentifier: agentIdentifier,
    inputHash: paymentData.inputHash
  };

  console.log('💰 Creating Masumi purchase...');
  console.log(`🌐 URL: ${paymentServiceUrl}/purchase/`);
  console.log(`🔗 Network: ${network}`);
  console.log(`🆔 Identifier: ${identifierFromPurchaser}`);

  try {
    const response = await fetch(`${paymentServiceUrl}/purchase/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': apiKey,
        'accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`purchase creation failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Purchase created successfully!');
    
    return result;
  } catch (error) {
    console.error('❌ Error creating purchase:', error);
    throw error;
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: any = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--') && i + 1 < args.length) {
      const key = arg.substring(2);
      const value = args[i + 1];
      parsed[key] = value;
      i++; // skip next argument
    }
  }
  
  return parsed;
}

function loadFromFile(filePath: string) {
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf8'));
    return data;
  } catch (error) {
    console.error(`❌ Error loading file ${filePath}:`, error);
    process.exit(1);
  }
}

async function main() {
  const args = parseArgs();
  
  console.log('💰 Masumi Purchase Creator');
  console.log('='.repeat(50));
  
  // determine source of data
  let config: MasumiConfig;
  let paymentResponse: any;
  let identifierFromPurchaser: string;
  
  if (args['file']) {
    // load from output file
    console.log(`📂 Loading data from file: ${args['file']}`);
    const fileData = loadFromFile(args['file']);
    
    config = {
      paymentServiceUrl: fileData.config?.paymentServiceUrl || process.env.MASUMI_PAYMENT_SERVICE_URL,
      apiKey: fileData.config?.apiKey || process.env.MASUMI_API_KEY,
      agentIdentifier: fileData.config?.agentIdentifier || process.env.MASUMI_AGENT_IDENTIFIER,
      network: fileData.config?.network || process.env.MASUMI_NETWORK || 'Preprod',
      sellerVkey: fileData.config?.sellerVkey || process.env.MASUMI_SELLER_VKEY
    };
    
    paymentResponse = fileData.response;
    identifierFromPurchaser = fileData.paymentData?.identifierFromPurchaser;
    
    if (!paymentResponse || !identifierFromPurchaser) {
      console.error('❌ Error: Invalid file format - missing payment response or identifier');
      process.exit(1);
    }
    
  } else {
    // get config from env or args
    config = {
      paymentServiceUrl: args['payment-service-url'] || process.env.MASUMI_PAYMENT_SERVICE_URL,
      apiKey: args['api-key'] || process.env.MASUMI_API_KEY,
      agentIdentifier: args['agent-identifier'] || process.env.MASUMI_AGENT_IDENTIFIER,
      network: args['network'] || process.env.MASUMI_NETWORK || 'Preprod',
      sellerVkey: args['seller-vkey'] || process.env.MASUMI_SELLER_VKEY
    };
    
    // manual payment data input (this is complex, so file method is preferred)
    const blockchainIdentifier = args['blockchain-identifier'];
    const payByTime = args['pay-by-time'];
    const submitResultTime = args['submit-result-time'];
    const unlockTime = args['unlock-time'];
    const externalDisputeUnlockTime = args['external-dispute-unlock-time'];
    const inputHash = args['input-hash'];
    identifierFromPurchaser = args['identifier'];
    
    if (!blockchainIdentifier || !payByTime || !submitResultTime || !unlockTime || !externalDisputeUnlockTime || !inputHash || !identifierFromPurchaser) {
      console.error('❌ Error: Missing required payment parameters');
      console.error('💡 Usage:');
      console.error('  Option 1 - From file (recommended):');
      console.error('    bun run src/masumi-purchase-create.ts --file <payment-output.json>');
      console.error('');
      console.error('  Option 2 - Direct parameters (complex):');
      console.error('    bun run src/masumi-purchase-create.ts \\');
      console.error('      --payment-service-url <url> \\');
      console.error('      --api-key <key> \\');
      console.error('      --agent-identifier <id> \\');
      console.error('      --seller-vkey <vkey> \\');
      console.error('      --blockchain-identifier <id> \\');
      console.error('      --pay-by-time <timestamp> \\');
      console.error('      --submit-result-time <timestamp> \\');
      console.error('      --unlock-time <timestamp> \\');
      console.error('      --external-dispute-unlock-time <timestamp> \\');
      console.error('      --input-hash <hash> \\');
      console.error('      --identifier <purchaser-id> \\');
      console.error('      [--network <network>]');
      console.error('');
      console.error('  Or set environment variables: MASUMI_PAYMENT_SERVICE_URL, MASUMI_API_KEY, etc.');
      process.exit(1);
    }
    
    // construct payment response object
    paymentResponse = {
      data: {
        blockchainIdentifier,
        payByTime: parseInt(payByTime),
        submitResultTime: parseInt(submitResultTime),
        unlockTime: parseInt(unlockTime),
        externalDisputeUnlockTime: parseInt(externalDisputeUnlockTime),
        inputHash
      }
    };
  }
  
  // validate required config
  const required = ['paymentServiceUrl', 'apiKey', 'agentIdentifier', 'sellerVkey'];
  for (const key of required) {
    if (!config[key as keyof MasumiConfig]) {
      console.error(`❌ Error: Missing required parameter: ${key}`);
      process.exit(1);
    }
  }
  
  console.log(`🆔 Purchaser ID: ${identifierFromPurchaser}`);
  console.log(`🔗 Blockchain ID: ${paymentResponse.data?.blockchainIdentifier?.substring(0, 50)}...`);
  console.log(`🌐 Network: ${config.network}`);
  console.log('');
  
  try {
    const result = await createPurchase(config, paymentResponse, identifierFromPurchaser);
    
    console.log('📋 Purchase Details:');
    console.log(`   Blockchain ID: ${result.data?.blockchainIdentifier?.substring(0, 50)}...`);
    console.log(`   Next action: ${result.data?.NextAction?.requestedAction}`);
    
    if (result.data?.PaidFunds && result.data.PaidFunds.length > 0) {
      console.log('   Paid funds:');
      result.data.PaidFunds.forEach((fund: any) => {
        console.log(`     - ${fund.amount} ${fund.unit || 'lovelace'}`);
      });
    }
    
    if (result.data?.NextAction?.errorType) {
      console.log(`   Error type: ${result.data.NextAction.errorType}`);
      console.log(`   Error note: ${result.data.NextAction.errorNote}`);
    }
    
    console.log('');
    if (result.data?.NextAction?.requestedAction === 'FundsLockingRequested') {
      console.log('🔄 Purchase created - funds locking process initiated');
      console.log('💡 Use masumi-payment-check to monitor the payment status');
    } else {
      console.log(`ℹ️  Purchase status: ${result.data?.NextAction?.requestedAction}`);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Purchase creation completed!');
    
  } catch (error) {
    console.error('\n' + '='.repeat(50));
    console.error('❌ Purchase creation failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}