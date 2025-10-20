/**
 * Test script for the new intent extraction functionality
 * Run with: node test-intent-extraction.js
 */

import { OpenAIAPIService } from './src/services/openai.js';

async function testIntentExtraction() {
    const openAIService = new OpenAIAPIService();

    console.log('🧪 Testing Intent Extraction Function\n');

    // Test cases for different types of blockchain commands
    const testCases = [
        {
            name: 'Send Token Command',
            input: 'Send 100 USDC to 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b'
        },
        {
            name: 'Check Balance Query',
            input: 'What is my ETH balance?'
        },
        {
            name: 'Swap Tokens Command',
            input: 'Swap 50 DEGEN for ETH on Base'
        },
        {
            name: 'Get Price Query',
            input: 'What is the current price of BRETT?'
        },
        {
            name: 'Ambiguous Send Command',
            input: 'Send some tokens to my friend'
        },
        {
            name: 'Bridge Tokens Command',
            input: 'Bridge 25 USDC from Ethereum to Base'
        },
        {
            name: 'Approve Token Command',
            input: 'Approve 1000 DEGEN for Uniswap'
        },
        {
            name: 'Stake Command',
            input: 'Stake all my ETH'
        },
        {
            name: 'Complex Command',
            input: 'Send half of my USDC balance to 0x123...abc and swap the rest for DEGEN'
        },
        {
            name: 'Unclear Command',
            input: 'Do something with my tokens'
        }
    ];

    for (const testCase of testCases) {
        console.log(`\n📊 Testing: ${testCase.name}`);
        console.log(`   Input: "${testCase.input}"`);
        console.log('   Processing...\n');

        try {
            const intentData = await openAIService.extractIntent(testCase.input);

            console.log('✅ Extracted Intent:');
            console.log(`   Intent: ${intentData.intent}`);
            console.log(`   Confidence: ${(intentData.confidence * 100).toFixed(1)}%`);

            console.log('   Parameters:');
            Object.entries(intentData.parameters).forEach(([key, value]) => {
                if (value !== null) {
                    console.log(`     ${key}: ${value}`);
                }
            });

            if (intentData.missing_info && intentData.missing_info.length > 0) {
                console.log('   Missing Information:');
                intentData.missing_info.forEach(info => {
                    console.log(`     - ${info}`);
                });
            }

            console.log('\n' + '='.repeat(80));

        } catch (error) {
            console.log('❌ Error:', error.message);
            console.log('\n' + '='.repeat(80));
        }

        // Add delay between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    console.log('\n🎉 Intent extraction testing completed!');
    console.log('\nNote: If you see fallback responses, make sure your OpenAI API key is configured.');
}

// Run the test
testIntentExtraction().catch(console.error);