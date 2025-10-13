/**
 * Simple test script to demonstrate the new getTokenData function and TokenRegistry
 * Run with: node test-token-data.js
 */

import { CoinGeckoAPIService } from './src/services/coingecko.js';
import { TokenRegistry } from './src/services/tokenRegistry.js';

async function testTokenData() {
    const coinGeckoService = new CoinGeckoAPIService();

    console.log('🧪 Testing Token Data Function and TokenRegistry\n');

    // Test TokenRegistry functionality
    console.log('📋 TokenRegistry Info:');
    console.log(`   Supported Networks: ${TokenRegistry.getSupportedNetworks().join(', ')}`);
    console.log(`   Base Stablecoins: ${TokenRegistry.getStablecoinAddresses('base').length}`);
    console.log(`   Solana Known Tokens: ${Object.keys(TokenRegistry.getKnownTokenMapping('solana')).length}`);
    console.log('');

    // Test cases for different networks
    const testCases = [
        {
            name: 'Solana - SOL',
            address: 'So11111111111111111111111111111111111111112',
            network: 'solana'
        },
        {
            name: 'Solana - USDC (Stablecoin)',
            address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            network: 'solana'
        },
        {
            name: 'Base - WETH',
            address: '0x4200000000000000000000000000000000000006',
            network: 'base'
        },
        {
            name: 'Base - USDC (Stablecoin)',
            address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            network: 'base'
        },
        {
            name: 'Base - DEGEN',
            address: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed',
            network: 'base'
        }
    ];

    for (const testCase of testCases) {
        console.log(`\n📊 Testing: ${testCase.name}`);
        console.log(`   Address: ${testCase.address}`);
        console.log(`   Network: ${testCase.network}`);
        console.log(`   Is Stablecoin: ${TokenRegistry.isStablecoin(testCase.address, testCase.network)}`);
        console.log(`   CoinGecko ID: ${TokenRegistry.getCoinGeckoId(testCase.address, testCase.network) || 'Unknown'}`);

        try {
            const tokenData = await coinGeckoService.getTokenData(testCase.address, testCase.network);

            if (tokenData) {
                console.log('✅ Success!');
                console.log(`   Name: ${tokenData.name || 'N/A'}`);
                console.log(`   Symbol: ${tokenData.symbol || 'N/A'}`);
                console.log(`   Price: $${tokenData.price_usd || 'N/A'}`);
                console.log(`   Market Cap: $${tokenData.market_cap_usd ? tokenData.market_cap_usd.toLocaleString() : 'N/A'}`);
                console.log(`   24h Change: ${tokenData.price_change_percentage_24h ? tokenData.price_change_percentage_24h.toFixed(2) + '%' : 'N/A'}`);
                console.log(`   Decimals: ${tokenData.decimals || 'N/A'}`);
            } else {
                console.log('❌ No data found');
            }
        } catch (error) {
            console.log('❌ Error:', error.message);
        }
    }

    console.log('\n🎉 Test completed!');
}

// Run the test
testTokenData().catch(console.error);