/**
 * API service interface definitions for backend
 */

import type { WalletData, Transaction, TokenBalance, WalletInfo } from './wallet.js';
import type { ConversationContext, AIResponse, ConversationMessage } from './conversation.js';

// Helius API Service Interface
export interface HeliusService {
    getWalletTransactions(address: string, limit?: number): Promise<Transaction[]>;
    getWalletTokens(address: string): Promise<TokenBalance[]>;
    getWalletInfo(address: string): Promise<WalletInfo>;
    validateWalletAddress(address: string): boolean;
}

// CoinGecko API Service Interface
export interface CoinGeckoService {
    getTokenPrices(tokenIds: string[]): Promise<Record<string, number>>;
    getSolanaPrice(): Promise<number>;
    getTokenPrice(tokenId: string): Promise<number>;
}

// OpenAI API Service Interface
export interface OpenAIService {
    generateResponse(prompt: string, walletData: WalletData): Promise<string>;
    maintainConversationContext(messages: ConversationMessage[]): ConversationContext;
    processNaturalLanguageQuery(query: string, context: ConversationContext): Promise<AIResponse>;
}

// Supporting API Types
export interface TokenPrice {
    id: string;
    symbol: string;
    current_price: number;
    price_change_24h?: number;
    price_change_percentage_24h?: number;
}