/**
 * Core wallet-related type definitions
 */

export interface TokenBalance {
    mint: string;
    symbol: string;
    name: string;
    amount: number;
    decimals: number;
    usdValue?: number;
}

export interface Transaction {
    signature: string;
    timestamp: number;
    type: TransactionType;
    amount: number;
    fee: number;
    status: 'success' | 'failed';
    involvedAddresses: string[];
}

export interface WalletAnalytics {
    totalValue: number;
    transactionCount: number;
    totalFeesPaid: number;
    mostActiveToken: string;
    averageTransactionSize: number;
}

export interface WalletData {
    address: string;
    balance: number;
    tokens: TokenBalance[];
    transactions: Transaction[];
    analytics: WalletAnalytics;
    solPriceUSD?: number;
}

export type TransactionType =
    | 'transfer'
    | 'transfer-in'
    | 'transfer-out'
    | 'swap'
    | 'stake'
    | 'unstake'
    | 'mint'
    | 'burn'
    | 'unknown';

export interface WalletInfo {
    address: string;
    balance: number;
    isActive: boolean;
    firstTransactionDate?: number;
    lastTransactionDate?: number;
}