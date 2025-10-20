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
    getTokenPrices(tokenIds: string[], network?: string): Promise<Record<string, number>>;
    getSolanaPrice(): Promise<number>;
    getTokenPrice(tokenId: string, network?: string): Promise<number>;
    getTokenData(tokenAddress: string, network?: string): Promise<TokenData | null>;
}

// OpenAI API Service Interface
export interface OpenAIService {
    generateResponse(prompt: string, walletData: WalletData): Promise<string>;
    maintainConversationContext(messages: ConversationMessage[]): ConversationContext;
    processNaturalLanguageQuery(query: string, context: ConversationContext): Promise<AIResponse>;
    processBlockchainMarketQuery(blockchain: string, query: string): Promise<string>;
    extractIntent(userInput: string): Promise<any>;
}

// Supporting API Types
export interface TokenPrice {
    id: string;
    symbol: string;
    current_price: number;
    price_change_24h?: number;
    price_change_percentage_24h?: number;
}

export interface TokenData {
    address: string;
    network: string;
    name?: string;
    symbol?: string;
    decimals?: number;
    price_usd?: number;
    market_cap_usd?: number;
    volume_24h_usd?: number;
    price_change_24h?: number;
    price_change_percentage_24h?: number;
    price_change_percentage_7d?: number;
    price_change_percentage_30d?: number;
    total_supply?: number;
    circulating_supply?: number;
    max_supply?: number;
    ath?: number;
    ath_date?: string;
    atl?: number;
    atl_date?: string;
    last_updated?: string;
    coingecko_id?: string;
    image?: string;
    description?: string;
}