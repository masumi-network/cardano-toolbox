import dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config();

interface MasumiConfig {
  paymentServiceUrl: string;
  apiKey: string;
  network: string;
}

async function checkPaymentStatus(config: MasumiConfig, paymentIdentifier: string) {
  const { paymentServiceUrl, apiKey, network } = config;
  
  // use query parameter to find payment by blockchainIdentifier
  const url = `${paymentServiceUrl}/payment/?blockchainIdentifier=${paymentIdentifier}&network=${network}`;
  
  console.log(`🔍 Checking payment status...`);
  console.log(`🌐 URL: ${url.substring(0, 100)}...`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'token': apiKey
      }
    });
    
    if (!response.ok) {
      throw new Error(`status check failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // find payment in response
    let payment = null;
    
    // check if response has data.payments array
    if (result.data && result.data.payments && Array.isArray(result.data.payments)) {
      payment = result.data.payments.find((p: any) => p.blockchainIdentifier === paymentIdentifier);
    }
    // check if response has data.Payments array (uppercase)
    else if (result.data && result.data.Payments && Array.isArray(result.data.Payments)) {
      payment = result.data.Payments.find((p: any) => p.blockchainIdentifier === paymentIdentifier);
    }
    // check if response is direct payment object
    else if (result.blockchainIdentifier === paymentIdentifier) {
      payment = result;
    }
    
    return payment;
    
  } catch (error) {
    console.error('❌ Error checking payment status:', error);
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
  
  console.log('🔍 Masumi Payment Status Checker');
  console.log('='.repeat(50));
  
  // determine source of data
  let config: MasumiConfig;
  let paymentIdentifier: string;
  
  if (args['file']) {
    // load from output file
    console.log(`📂 Loading data from file: ${args['file']}`);
    const fileData = loadFromFile(args['file']);
    
    config = fileData.config || {
      paymentServiceUrl: fileData.config?.paymentServiceUrl || process.env.MASUMI_PAYMENT_SERVICE_URL,
      apiKey: fileData.config?.apiKey || process.env.MASUMI_API_KEY,
      network: fileData.config?.network || process.env.MASUMI_NETWORK || 'Preprod'
    };
    
    paymentIdentifier = fileData.response?.data?.blockchainIdentifier;
    
    if (!paymentIdentifier) {
      console.error('❌ Error: No blockchainIdentifier found in file');
      process.exit(1);
    }
    
  } else {
    // get config from env or args
    config = {
      paymentServiceUrl: args['payment-service-url'] || process.env.MASUMI_PAYMENT_SERVICE_URL,
      apiKey: args['api-key'] || process.env.MASUMI_API_KEY,
      network: args['network'] || process.env.MASUMI_NETWORK || 'Preprod'
    };
    
    paymentIdentifier = args['blockchain-identifier'];
    
    if (!paymentIdentifier) {
      console.error('❌ Error: Missing required parameter: blockchain-identifier');
      console.error('💡 Usage:');
      console.error('  Option 1 - From file:');
      console.error('    bun run src/masumi-payment-check.ts --file <payment-output.json>');
      console.error('');
      console.error('  Option 2 - Direct parameters:');
      console.error('    bun run src/masumi-payment-check.ts \\');
      console.error('      --payment-service-url <url> \\');
      console.error('      --api-key <key> \\');
      console.error('      --blockchain-identifier <id> \\');
      console.error('      [--network <network>]');
      console.error('');
      console.error('  Or set environment variables: MASUMI_PAYMENT_SERVICE_URL, MASUMI_API_KEY, etc.');
      process.exit(1);
    }
  }
  
  // validate required config
  const required = ['paymentServiceUrl', 'apiKey'];
  for (const key of required) {
    if (!config[key as keyof MasumiConfig]) {
      console.error(`❌ Error: Missing required parameter: ${key}`);
      process.exit(1);
    }
  }
  
  console.log(`🆔 Payment ID: ${paymentIdentifier.substring(0, 50)}...`);
  console.log(`🌐 Network: ${config.network}`);
  console.log('');
  
  try {
    const payment = await checkPaymentStatus(config, paymentIdentifier);
    
    if (payment) {
      console.log('✅ Payment found!');
      console.log('📋 Payment Details:');
      console.log(`   On-chain state: ${payment.onChainState || 'null/pending'}`);
      console.log(`   Blockchain ID: ${payment.blockchainIdentifier?.substring(0, 50)}...`);
      
      if (payment.NextAction) {
        console.log(`   Next action: ${payment.NextAction.requestedAction}`);
        if (payment.NextAction.errorType) {
          console.log(`   Error type: ${payment.NextAction.errorType}`);
          console.log(`   Error note: ${payment.NextAction.errorNote}`);
        }
      }
      
      if (payment.PaidFunds && payment.PaidFunds.length > 0) {
        console.log('   Paid funds:');
        payment.PaidFunds.forEach((fund: any) => {
          console.log(`     - ${fund.amount} ${fund.unit || 'lovelace'}`);
        });
      }
      
      if (payment.CurrentTransaction) {
        console.log(`   Transaction hash: ${payment.CurrentTransaction.txHash}`);
      }
      
      // interpret the status
      const onChainState = payment.onChainState;
      console.log('');
      if (onChainState === 'FundsLocked') {
        console.log('🎉 SUCCESS: Funds are locked! Payment confirmed');
      } else if (onChainState === 'ResultSubmitted' || onChainState === 'Withdrawn') {
        console.log('🎉 SUCCESS: Payment already processed');
      } else if (onChainState && ['FundsOrDatumInvalid', 'RefundRequested', 'Disputed', 'RefundWithdrawn', 'DisputedWithdrawn'].includes(onChainState)) {
        console.log(`❌ FAILED: Payment failed with state: ${onChainState}`);
      } else {
        console.log(`⏳ PENDING: Still processing (state: ${onChainState || 'null'})`);
        console.log('   This is normal for new payments or test transactions without real funds');
      }
      
    } else {
      console.log('❌ Payment not found');
      console.log('💡 The payment might not exist or the blockchain identifier is incorrect');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Payment status check completed!');
    
  } catch (error) {
    console.error('\n' + '='.repeat(50));
    console.error('❌ Payment status check failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}