/**
 * OpenAI API Service Implementation for Backend
 * Provides natural language processing capabilities for wallet data analysis
 */

import type { OpenAIService, ConversationContext, ConversationMessage, AIResponse, WalletData } from '../types/index.js';

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

        return `You are Coinrade, an AI assistant specialized in analyzing Solana blockchain wallet data. 
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