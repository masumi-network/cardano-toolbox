import dotenv from 'dotenv';
import { randomBytes, createHash } from 'crypto';
import { writeFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

interface MasumiConfig {
  paymentServiceUrl: string;
  apiKey: string;
  agentIdentifier: string;
  network: string;
  sellerVkey: string;
}

interface PaymentData {
  identifierFromPurchaser: string;
  inputData: any;
  inputHash: string;
}

async function createPayment(config: MasumiConfig, paymentData: PaymentData) {
  const { paymentServiceUrl, apiKey, agentIdentifier, network } = config;
  const { identifierFromPurchaser, inputData, inputHash } = paymentData;

  // generate timestamps like the implementation
  const now = new Date();
  const payByTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
  const submitResultTime = new Date(now.getTime() + 20 * 60 * 1000); // 20 minutes from now

  const requestBody = {
    agentIdentifier: agentIdentifier,
    network: network,
    inputHash: inputHash,
    payByTime: payByTime.toISOString(),
    metadata: `payment request for: ${JSON.stringify(inputData).substring(0, 100)}`,
    paymentType: 'Web3CardanoV1',
    submitResultTime: submitResultTime.toISOString(),
    identifierFromPurchaser: identifierFromPurchaser
  };

  console.log('💳 Creating Masumi payment request...');
  console.log(`🌐 URL: ${paymentServiceUrl}/payment/`);
  console.log(`🔗 Network: ${network}`);
  console.log(`🆔 Identifier: ${identifierFromPurchaser}`);

  try {
    const response = await fetch(`${paymentServiceUrl}/payment/`, {
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
      throw new Error(`payment creation failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Payment created successfully!');
    
    return result;
  } catch (error) {
    console.error('❌ Error creating payment:', error);
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

async function main() {
  const args = parseArgs();
  
  console.log('💰 Masumi Payment Creator');
  console.log('='.repeat(50));
  
  // get config from env or args
  const config: MasumiConfig = {
    paymentServiceUrl: args['payment-service-url'] || process.env.MASUMI_PAYMENT_SERVICE_URL,
    apiKey: args['api-key'] || process.env.MASUMI_API_KEY,
    agentIdentifier: args['agent-identifier'] || process.env.MASUMI_AGENT_IDENTIFIER,
    network: args['network'] || process.env.MASUMI_NETWORK || 'Preprod',
    sellerVkey: args['seller-vkey'] || process.env.MASUMI_SELLER_VKEY
  };
  
  // validate required config
  const required = ['paymentServiceUrl', 'apiKey', 'agentIdentifier', 'sellerVkey'];
  for (const key of required) {
    if (!config[key as keyof MasumiConfig]) {
      console.error(`❌ Error: Missing required parameter: ${key}`);
      console.error('💡 Usage:');
      console.error('  bun run src/masumi-payment-create.ts \\');
      console.error('    --payment-service-url <url> \\');
      console.error('    --api-key <key> \\');
      console.error('    --agent-identifier <id> \\');
      console.error('    --seller-vkey <vkey> \\');
      console.error('    [--network <network>] \\');
      console.error('    [--input-data <json>] \\');
      console.error('    [--identifier <id>] \\');
      console.error('    [--output-file <path>]');
      console.error('\n  Or set environment variables: MASUMI_PAYMENT_SERVICE_URL, MASUMI_API_KEY, etc.');
      process.exit(1);
    }
  }
  
  // prepare payment data
  const inputDataStr = args['input-data'] || '{"text": "masumi payment test"}';
  let inputData: any;
  try {
    inputData = JSON.parse(inputDataStr);
  } catch (error) {
    console.error('❌ Error: Invalid JSON in --input-data');
    process.exit(1);
  }
  
  const inputHash = createHash('sha256').update(JSON.stringify(inputData)).digest('hex');
  const identifierFromPurchaser = args['identifier'] || randomBytes(7).toString('hex');
  
  const paymentData: PaymentData = {
    identifierFromPurchaser,
    inputData,
    inputHash
  };
  
  console.log(`📝 Input data: ${JSON.stringify(inputData)}`);
  console.log(`🔗 Input hash: ${inputHash}`);
  console.log(`🆔 Identifier: ${identifierFromPurchaser}`);
  console.log('');
  
  try {
    const result = await createPayment(config, paymentData);
    
    console.log('📋 Payment Details:');
    console.log(`   Blockchain ID: ${result.data?.blockchainIdentifier?.substring(0, 50)}...`);
    console.log(`   Pay by time: ${new Date(result.data?.payByTime)}`);
    console.log(`   Submit result time: ${new Date(result.data?.submitResultTime)}`);
    
    // save to file if requested
    const outputFile = args['output-file'];
    if (outputFile) {
      const outputData = {
        config,
        paymentData,
        response: result,
        createdAt: new Date().toISOString()
      };
      
      const outputPath = outputFile.startsWith('/') ? outputFile : join(process.cwd(), outputFile);
      writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
      console.log(`💾 Output saved to: ${outputPath}`);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Payment creation completed!');
    
  } catch (error) {
    console.error('\n' + '='.repeat(50));
    console.error('❌ Payment creation failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}