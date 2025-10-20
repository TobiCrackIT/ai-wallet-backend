/**
 * OpenAI API Service Implementation for Backend
 * Provides natural language processing capabilities for wallet data analysis
 */

import type { OpenAIService, ConversationContext, ConversationMessage, AIResponse, WalletData } from '../types/index.js';
import { CoinGeckoAPIService } from './coingecko.js';
import { TokenRegistry } from './tokenRegistry.js';

export class OpenAIAPIService implements OpenAIService {
    private readonly apiKey: string;
    private readonly baseUrl: string;
    private readonly model: string;
    private readonly maxTokens: number;
    private readonly temperature: number;

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
        this.baseUrl = 'https://api.openai.com/v1';
        this.model = 'gpt-3.5-turbo';
        this.maxTokens = 1000;
        this.temperature = 0.7;

        if (!this.apiKey) {
            console.warn('OpenAI API key not provided. AI functionality will be limited.');
        }
    }

    /**
     * Generates AI response based on user query and wallet data
     */
    async generateResponse(prompt: string, walletData: WalletData): Promise<string> {
        if (!this.apiKey) {
            throw new Error('OpenAI API key is required for AI responses');
        }

        try {
            const systemPrompt = this.createSystemPrompt(walletData);
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ];

            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages,
                    max_tokens: this.maxTokens,
                    temperature: this.temperature
                })
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Invalid OpenAI API key');
                }
                if (response.status === 429) {
                    throw new Error('OpenAI rate limit exceeded. Please try again later.');
                }
                throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.choices || data.choices.length === 0) {
                throw new Error('No response generated from OpenAI');
            }

            return data.choices[0].message.content.trim();
        } catch (error) {
            console.error('Error generating AI response:', error);
            throw new Error('Failed to generate AI response');
        }
    }

    /**
     * Processes natural language query with conversation context
     */
    async processNaturalLanguageQuery(query: string, context: ConversationContext): Promise<AIResponse> {
        try {
            const enhancedPrompt = this.enhancePromptWithContext(query, context);
            const response = await this.generateResponse(enhancedPrompt, context.walletDataSnapshot);

            return {
                content: response,
                confidence: 0.8, // Default confidence score
                sources: ['OpenAI GPT-3.5', 'Helius API', 'CoinGecko API'],
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Error processing natural language query:', error);
            throw new Error('Failed to process your question');
        }
    }

    /**
     * Maintains conversation context by managing message history
     */
    maintainConversationContext(messages: ConversationMessage[]): ConversationContext {
        // Keep only the last 10 messages to manage context size
        const recentMessages = messages.slice(-10);

        // Extract previous queries (user messages only)
        const previousQueries = recentMessages
            .filter(msg => msg.role === 'user')
            .map(msg => msg.content);

        // Create a basic context structure
        // Note: walletAddress and walletDataSnapshot should be provided externally
        return {
            walletAddress: '', // Will be set by the calling component
            previousQueries,
            walletDataSnapshot: {} as WalletData, // Will be set by the calling component
            conversationHistory: recentMessages,
            sessionId: '',
            createdAt: Date.now(),
            lastUpdated: Date.now(),
            messageCount: recentMessages.length,
            contextWindow: 10
        };
    }

    /**
     * Creates a system prompt with wallet data context
     */
    private createSystemPrompt(walletData: WalletData): string {
        const { address, balance, tokens, transactions, analytics } = walletData;

        return `You are Rodeo, an AI assistant specialized in analyzing Solana blockchain wallet data. 
You help users understand their wallet information in simple, human-friendly terms.

Current wallet being analyzed: ${address}

Wallet Summary:
- SOL Balance: ${balance.toFixed(4)} SOL
- Total Portfolio Value: ${analytics.totalValue.toFixed(2)}
- Number of Tokens: ${tokens.length}
- Transaction Count: ${analytics.transactionCount}
- Total Fees Paid: ${analytics.totalFeesPaid.toFixed(4)} SOL

Token Holdings:
${tokens.slice(0, 10).map(token =>
            `- ${token.symbol}: ${token.amount} (${token.name})`
        ).join('\n')}

Recent Transaction Summary:
- Last ${Math.min(transactions.length, 5)} transactions processed
- Average transaction size: ${analytics.averageTransactionSize.toFixed(4)} SOL
- Most active token: ${analytics.mostActiveToken}

Guidelines for responses:
1. Always be helpful, friendly, and explain things in simple terms
2. Use the wallet data provided to give accurate, specific answers
3. When discussing prices or values, mention they are current/recent estimates
4. If asked about something not in the data, explain what information is available
5. Keep responses concise but informative
6. Use bullet points or numbered lists for clarity when appropriate
7. Always format numbers clearly (e.g., 1,234.56 SOL or $1,234.56)
8. Explain technical terms when you use them

Remember: You're helping users understand their Solana wallet data. Be accurate, helpful, and educational.`;
    }

    /**
     * Enhances user prompt with conversation context
     */
    private enhancePromptWithContext(query: string, context: ConversationContext): string {
        let enhancedPrompt = query;

        // Add context from previous queries if available
        if (context.previousQueries.length > 0) {
            const recentQueries = context.previousQueries.slice(-3); // Last 3 queries
            enhancedPrompt += `\n\nContext from recent conversation:`;
            recentQueries.forEach((prevQuery, index) => {
                enhancedPrompt += `\n${index + 1}. Previous question: "${prevQuery}"`;
            });
        }

        // Add specific wallet context
        if (context.walletAddress) {
            enhancedPrompt += `\n\nNote: This question is about wallet ${context.walletAddress}`;
        }

        return enhancedPrompt;
    }

    /**
     * Creates a fallback response when AI service is unavailable
     */
    createFallbackResponse(_query: string, walletData: WalletData): AIResponse {
        let content = "I'm currently unable to process your question with AI analysis, but here's what I can tell you about this wallet:\n\n";

        content += `📊 **Wallet Overview:**\n`;
        content += `• Address: ${walletData.address}\n`;
        content += `• SOL Balance: ${walletData.balance.toFixed(4)} SOL\n`;
        content += `• Total Portfolio Value: ${walletData.analytics.totalValue.toFixed(2)}\n`;
        content += `• Number of Tokens: ${walletData.tokens.length}\n`;
        content += `• Total Transactions: ${walletData.analytics.transactionCount}\n\n`;

        if (walletData.tokens.length > 0) {
            content += `🪙 **Top Token Holdings:**\n`;
            walletData.tokens.slice(0, 5).forEach(token => {
                content += `• ${token.symbol}: ${token.amount} ${token.name}\n`;
            });
        }

        content += `\nPlease try your question again in a moment, or ask me to explain any specific part of this data.`;

        return {
            content,
            confidence: 0.5,
            sources: ['Fallback Response'],
            timestamp: Date.now()
        };
    }

    /**
     * Processes blockchain market queries for trending tokens, gainers/losers, and token information
     * @param blockchain - The blockchain network (e.g., 'solana', 'base', 'ethereum')
     * @param query - Natural language query about market data
     * @returns Natural language response with market information
     */
    async processBlockchainMarketQuery(blockchain: string, query: string): Promise<string> {
        if (!this.apiKey) {
            return this.createMarketFallbackResponse(blockchain, query);
        }

        try {
            // Validate the query first
            const validation = this.validateQuery(query);
            if (!validation.isValid) {
                throw new Error(validation.reason || 'Invalid query');
            }

            // Initialize CoinGecko service
            const coinGeckoService = new CoinGeckoAPIService();

            // Gather market data based on the query type
            const marketData = await this.gatherMarketData(blockchain, query, coinGeckoService);

            // Create system prompt for market analysis
            const systemPrompt = this.createMarketSystemPrompt(blockchain, marketData);

            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: query }
            ];

            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages,
                    max_tokens: this.maxTokens,
                    temperature: this.temperature
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const data = await response.json();

            if (!data.choices || data.choices.length === 0) {
                throw new Error('No response generated');
            }

            return data.choices[0].message.content.trim();

        } catch (error) {
            console.error('Error processing blockchain market query:', error);
            return this.createMarketFallbackResponse(blockchain, query);
        }
    }

    /**
     * Gathers relevant market data based on the query type
     */
    private async gatherMarketData(blockchain: string, query: string, coinGeckoService: CoinGeckoAPIService): Promise<any> {
        const marketData: any = {
            blockchain: blockchain.toLowerCase(),
            supportedNetworks: TokenRegistry.getSupportedNetworks(),
            knownTokens: {},
            tokenPrices: {},
            timestamp: new Date().toISOString()
        };

        try {
            // Get known tokens for the blockchain
            const knownTokenMapping = TokenRegistry.getKnownTokenMapping(blockchain);
            const tokenAddresses = Object.keys(knownTokenMapping);

            if (tokenAddresses.length > 0) {
                // Check if query mentions a specific token
                const specificTokenMatch = this.extractTokenFromQuery(query, knownTokenMapping);

                if (specificTokenMatch) {
                    // If specific token mentioned, only fetch data for that token
                    const tokenData = await coinGeckoService.getTokenData(specificTokenMatch.address, blockchain);
                    const singleTokenPrice = await coinGeckoService.getTokenPrice(specificTokenMatch.address, blockchain);

                    marketData.knownTokens = { [specificTokenMatch.address]: knownTokenMapping[specificTokenMatch.address] };
                    marketData.tokenPrices = { [specificTokenMatch.address]: singleTokenPrice };

                    if (tokenData) {
                        marketData.specificToken = {
                            address: specificTokenMatch.address,
                            symbol: specificTokenMatch.symbol,
                            data: tokenData
                        };
                    }
                } else {
                    // If no specific token mentioned, get overview data (limit to first 8 for performance)
                    const limitedAddresses = tokenAddresses.slice(0, 8);
                    const prices = await coinGeckoService.getTokenPrices(limitedAddresses, blockchain);

                    marketData.knownTokens = knownTokenMapping;
                    marketData.tokenPrices = prices;
                }
            }

            // Get stablecoin info
            marketData.stablecoins = TokenRegistry.getStablecoinMetadata(blockchain);

        } catch (error) {
            console.warn('Error gathering market data:', error);
            // Continue with partial data
        }

        return marketData;
    }

    /**
     * Extracts token information from user query
     */
    private extractTokenFromQuery(query: string, knownTokens: Record<string, string>): { address: string; symbol: string } | null {
        const queryLower = query.toLowerCase();

        // Check for token symbols or names in the query
        for (const [address, coingeckoId] of Object.entries(knownTokens)) {
            // Common token symbols
            const tokenSymbols: Record<string, string> = {
                'solana': 'sol',
                'usd-coin': 'usdc',
                'tether': 'usdt',
                'ethereum': 'eth',
                'raydium': 'ray',
                'orca': 'orca',
                'degen-base': 'degen',
                'brett': 'brett',
                'higher': 'higher'
            };

            const symbol = tokenSymbols[coingeckoId] || coingeckoId;

            if (queryLower.includes(symbol) || queryLower.includes(coingeckoId)) {
                return { address, symbol: symbol.toUpperCase() };
            }
        }

        return null;
    }

    /**
     * Creates system prompt for market analysis
     */
    private createMarketSystemPrompt(blockchain: string, marketData: any): string {
        const { knownTokens, tokenPrices, stablecoins, specificToken } = marketData;

        let prompt = `You are Rodeo, an AI assistant specialized in real-time blockchain market analysis and cryptocurrency data for ${blockchain} blockchain.

Current Analysis Context:
- Blockchain: ${blockchain.charAt(0).toUpperCase() + blockchain.slice(1)}
- Supported Networks: ${marketData.supportedNetworks.join(', ')}
- Analysis Time: ${marketData.timestamp}

`;

        // Add known tokens information
        if (Object.keys(knownTokens).length > 0) {
            prompt += `Known Tokens on ${blockchain}:\n`;
            let tokenCount = 0;
            for (const [address, coingeckoId] of Object.entries(knownTokens)) {
                if (tokenCount >= 10) break; // Limit for prompt size
                const price = tokenPrices[address];
                const priceStr = price ? `$${price.toFixed(4)}` : 'Price unavailable';
                prompt += `- ${coingeckoId}: ${priceStr} (${address.substring(0, 8)}...)\n`;
                tokenCount++;
            }
            prompt += '\n';
        }

        // Add stablecoin information
        if (stablecoins && stablecoins.length > 0) {
            prompt += `Stablecoins on ${blockchain}:\n`;
            stablecoins.forEach((stable: { address: string; symbol: string; name: string; decimals: number }) => {
                prompt += `- ${stable.symbol}: $1.00 (${stable.name})\n`;
            });
            prompt += '\n';
        }

        // Add specific token data if available
        if (specificToken) {
            const token = specificToken.data;
            prompt += `Detailed Token Information for ${specificToken.symbol}:\n`;
            prompt += `- Name: ${token.name || 'N/A'}\n`;
            prompt += `- Symbol: ${token.symbol || 'N/A'}\n`;
            prompt += `- Price: $${token.price_usd || 'N/A'}\n`;
            prompt += `- Market Cap: $${token.market_cap_usd ? token.market_cap_usd.toLocaleString() : 'N/A'}\n`;
            prompt += `- 24h Change: ${token.price_change_percentage_24h ? token.price_change_percentage_24h.toFixed(2) + '%' : 'N/A'}\n`;
            prompt += `- Volume 24h: $${token.volume_24h_usd ? token.volume_24h_usd.toLocaleString() : 'N/A'}\n`;
            prompt += `- Contract: ${specificToken.address}\n\n`;
        }

        prompt += `Guidelines for Market Analysis Responses:
1. Provide accurate, data-driven insights based on the available information
2. Use clear, friendly language that both beginners and experts can understand
3. When discussing prices, mention they are current estimates and can change rapidly
4. Format numbers clearly (e.g., $1,234.56 or 1,234.56%)
5. Include full contract addresses when requested or when relevant for verification
6. Explain market concepts when necessary (market cap, volume, etc.)
7. Be honest about data limitations - if information isn't available, say so
8. Focus on factual information rather than investment advice
9. Use emojis sparingly but effectively for readability
10. Provide context about the blockchain ecosystem when relevant

Remember: You're helping users understand cryptocurrency market data. Be accurate, helpful, and educational while avoiding financial advice.`;

        return prompt;
    }

    /**
     * Creates a fallback response for market queries when AI is unavailable
     */
    private createMarketFallbackResponse(blockchain: string, query: string): string {
        const knownTokens = TokenRegistry.getKnownTokenMapping(blockchain);
        const stablecoins = TokenRegistry.getStablecoinMetadata(blockchain);

        let response = `I'm currently unable to process your market query with AI analysis, but here's what I can tell you about ${blockchain}:\n\n`;

        response += `📊 **${blockchain.charAt(0).toUpperCase() + blockchain.slice(1)} Network Overview:**\n`;
        response += `• Known Tokens: ${Object.keys(knownTokens).length}\n`;
        response += `• Stablecoins: ${stablecoins.length}\n`;
        response += `• Network Status: Supported\n\n`;

        if (Object.keys(knownTokens).length > 0) {
            response += `🪙 **Popular Tokens:**\n`;
            const tokenEntries = Object.entries(knownTokens).slice(0, 5);
            tokenEntries.forEach(([address, coingeckoId]) => {
                response += `• ${coingeckoId} (${address.substring(0, 8)}...)\n`;
            });
            response += '\n';
        }

        if (stablecoins.length > 0) {
            response += `💰 **Stablecoins:**\n`;
            stablecoins.forEach((stable: { address: string; symbol: string; name: string; decimals: number }) => {
                response += `• ${stable.symbol}: ${stable.name}\n`;
            });
            response += '\n';
        }

        response += `For real-time prices and detailed market data, please try your question again in a moment.\n`;
        response += `You can ask about specific tokens, trending tokens, or market performance on ${blockchain}.`;

        return response;
    }

    /**
     * Extracts intent and parameters from natural language using AI
     * @param userInput - Natural language command from user
     * @returns Structured transaction data with intent, parameters, and missing info
     */
    async extractIntent(userInput: string): Promise<any> {
        if (!this.apiKey) {
            // Fallback when AI is unavailable
            return {
                intent: "other",
                parameters: {
                    token_symbol: null,
                    amount: null,
                    recipient: null,
                    network: "base",
                    contract_address: null,
                    method: null
                },
                confidence: 0.1,
                missing_info: ["AI service unavailable - please specify intent and parameters manually"]
            };
        }

        try {
            const systemPrompt = `You are an expert blockchain transaction parser for Base blockchain. Your task is to analyze natural-language commands and extract structured transaction data.

---

### GOAL
Convert natural language input into a JSON object that describes:
1. The **intent** (what the user wants to do)
2. The **parameters** (token, amount, recipient, network, etc.)
3. Any **ambiguities or missing information** that must be clarified before execution.

---

### SUPPORTED INTENTS
Recognize these possible intents (case-insensitive):
- send_token
- check_balance
- swap_token
- bridge_token
- approve_token
- stake_token
- unstake_token
- get_price
- wallet_address
- get_gas
- other (if unclear)

---

### OUTPUT FORMAT
Always return **valid JSON** (no commentary, no Markdown).
Use this schema:
{
  "intent": "string",
  "parameters": {
    "token_symbol": "string | null",
    "amount": "string | null",
    "recipient": "string | null",
    "network": "string | null",
    "contract_address": "string | null",
    "method": "string | null",
    "extra": "object (optional)"
  },
  "confidence": "float between 0 and 1",
  "missing_info": ["list of unclear fields that user must specify"]
}

---

### INSTRUCTIONS
- Extract all entities explicitly mentioned in the text.
- If the user says "my friend" or "that address", mark recipient as null and include in \`missing_info\`.
- Normalize token names (e.g. "ethereum", "eth", "Ether" → "ETH").
- Normalize networks (e.g. "Polygon", "Matic" → "polygon").
- For ambiguous numeric expressions like "a few", "half", "all", mark \`amount=null\` and add to \`missing_info\`.
- Confidence should reflect how sure you are about the parsed result.
- Never make up addresses or amounts.`;

            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userInput }
            ];

            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages,
                    max_tokens: 500, // Reduced for structured output
                    temperature: 0.1 // Low temperature for consistent parsing
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const data = await response.json();

            if (!data.choices || data.choices.length === 0) {
                throw new Error('No response generated');
            }

            const content = data.choices[0].message.content.trim();

            try {
                // Parse the JSON response
                const parsedIntent = JSON.parse(content);

                // Validate the structure
                if (!parsedIntent.intent || !parsedIntent.parameters || !parsedIntent.confidence) {
                    throw new Error('Invalid response structure');
                }

                return parsedIntent;

            } catch (parseError) {
                console.error('Failed to parse AI response as JSON:', content);

                // Return fallback structure
                return {
                    intent: "other",
                    parameters: {
                        token_symbol: null,
                        amount: null,
                        recipient: null,
                        network: "base",
                        contract_address: null,
                        method: null
                    },
                    confidence: 0.2,
                    missing_info: ["Failed to parse intent - please clarify your request"]
                };
            }

        } catch (error) {
            console.error('Error extracting intent:', error);

            // Return fallback structure
            return {
                intent: "other",
                parameters: {
                    token_symbol: null,
                    amount: null,
                    recipient: null,
                    network: "base",
                    contract_address: null,
                    method: null
                },
                confidence: 0.1,
                missing_info: ["Error processing request - please try again"]
            };
        }
    }

    /**
     * Validates if a query is appropriate for wallet analysis
     */
    validateQuery(query: string): { isValid: boolean; reason?: string } {
        const trimmedQuery = query.trim();

        if (trimmedQuery.length === 0) {
            return { isValid: false, reason: 'Query cannot be empty' };
        }

        if (trimmedQuery.length > 500) {
            return { isValid: false, reason: 'Query is too long. Please keep it under 500 characters.' };
        }

        // Check for potentially harmful content
        const harmfulPatterns = [
            /private.*key/i,
            /seed.*phrase/i,
            /mnemonic/i,
            /password/i,
            /hack/i,
            /steal/i
        ];

        for (const pattern of harmfulPatterns) {
            if (pattern.test(trimmedQuery)) {
                return {
                    isValid: false,
                    reason: 'For security reasons, I cannot help with private keys, seed phrases, or similar sensitive information.'
                };
            }
        }

        return { isValid: true };
    }
}