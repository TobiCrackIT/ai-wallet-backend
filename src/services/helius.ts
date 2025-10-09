/**
 * Helius API Service Implementation for Backend
 * Provides methods for fetching Solana blockchain data using Helius RPC endpoints
 */

import type { HeliusService, Transaction, TokenBalance, WalletInfo } from '../types/index.js';

export class HeliusAPIService implements HeliusService {
    private readonly rpcUrl: string;
    private readonly apiKey: string;

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.HELIUS_API_KEY || '';
        this.rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${this.apiKey}`;

        if (!this.apiKey) {
            console.warn('Helius API key not provided. Some functionality may be limited.');
        }
    }

    /**
     * Validates if a string is a valid Solana wallet address
     */
    validateWalletAddress(address: string): boolean {
        // Solana addresses are base58 encoded and typically 32-44 characters long
        const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
        return base58Regex.test(address);
    }

    /**
     * Fetches transaction history for a wallet address using getSignaturesForAddress RPC method
     */
    async getWalletTransactions(address: string, limit: number = 100): Promise<Transaction[]> {
        if (!this.validateWalletAddress(address)) {
            throw new Error('Invalid wallet address format');
        }

        try {
            // First, get transaction signatures
            const signaturesResponse = await this.rpcCall('getSignaturesForAddress', [
                address,
                {
                    limit: Math.min(limit, 1000) // Helius limit
                }
            ]);

            if (!signaturesResponse.result || !Array.isArray(signaturesResponse.result)) {
                return [];
            }

            const signatures = signaturesResponse.result.slice(0, limit);

            // Get detailed transaction data for each signature
            const transactions: Transaction[] = [];

            // Process in batches to avoid overwhelming the API
            const batchSize = 10;
            for (let i = 0; i < signatures.length; i += batchSize) {
                const batch = signatures.slice(i, i + batchSize);
                const batchTransactions = await this.getTransactionsBatch(batch, address);
                transactions.push(...batchTransactions);
            }

            return transactions;
        } catch (error) {
            console.error('Error fetching wallet transactions:', error);
            throw new Error('Failed to fetch wallet transactions');
        }
    }

    /**
     * Fetches token balances for a wallet address using getTokenAccountsByOwner RPC method
     */
    async getWalletTokens(address: string): Promise<TokenBalance[]> {
        if (!this.validateWalletAddress(address)) {
            throw new Error('Invalid wallet address format');
        }

        try {
            // Get all token accounts owned by this address
            const response = await this.rpcCall('getTokenAccountsByOwner', [
                address,
                {
                    programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' // SPL Token Program
                },
                {
                    encoding: 'jsonParsed'
                }
            ]);

            if (!response.result || !response.result.value) {
                return [];
            }

            const tokenAccounts = response.result.value;
            const tokenBalances: TokenBalance[] = [];

            for (const account of tokenAccounts) {
                const accountData = account.account.data.parsed.info;
                const tokenAmount = accountData.tokenAmount;

                // Skip accounts with zero balance
                if (tokenAmount.uiAmount === 0) {
                    continue;
                }

                // Get token metadata
                const tokenInfo = await this.getTokenMetadata(accountData.mint);

                tokenBalances.push({
                    mint: accountData.mint,
                    symbol: tokenInfo.symbol || 'UNKNOWN',
                    name: tokenInfo.name || 'Unknown Token',
                    amount: tokenAmount.uiAmount || 0,
                    decimals: tokenAmount.decimals || 0,
                    usdValue: 0, // Will be populated by CoinGecko service
                });
            }

            return tokenBalances;
        } catch (error) {
            console.error('Error fetching wallet tokens:', error);
            throw new Error('Failed to fetch wallet token balances');
        }
    }

    /**
     * Fetches general wallet information using getAccountInfo RPC method
     */
    async getWalletInfo(address: string): Promise<WalletInfo> {
        if (!this.validateWalletAddress(address)) {
            throw new Error('Invalid wallet address format');
        }

        try {
            // Get account info to check if account exists and get SOL balance
            const accountResponse = await this.rpcCall('getAccountInfo', [
                address,
                {
                    encoding: 'jsonParsed'
                }
            ]);

            const accountInfo = accountResponse.result?.value;
            const balance = accountInfo ? accountInfo.lamports / 1e9 : 0;

            // Get recent transaction signatures to determine activity
            const signaturesResponse = await this.rpcCall('getSignaturesForAddress', [
                address,
                {
                    limit: 1
                }
            ]);

            const signatures = signaturesResponse.result || [];
            const isActive = signatures.length > 0;
            const lastTransactionDate = signatures.length > 0 ?
                signatures[0].blockTime * 1000 : undefined;

            return {
                address,
                balance,
                isActive,
                firstTransactionDate: 0, // Would need to fetch all signatures to determine
                lastTransactionDate: 0
            };
        } catch (error) {
            console.error('Error fetching wallet info:', error);
            throw new Error('Failed to fetch wallet information');
        }
    }

    /**
     * Makes an RPC call to Helius
     */
    private async rpcCall(method: string, params: any[]): Promise<any> {
        const response = await fetch(this.rpcUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: Math.random().toString(36).substring(7),
                method,
                params
            })
        });

        if (!response.ok) {
            throw new Error(`Helius RPC error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(`RPC error: ${data.error.message}`);
        }

        return data;
    }

    /**
     * Fetches detailed transaction data for a batch of signatures
     */
    private async getTransactionsBatch(signatures: any[], walletAddress: string): Promise<Transaction[]> {
        const transactions: Transaction[] = [];

        for (const sigInfo of signatures) {
            try {
                const txResponse = await this.rpcCall('getTransaction', [
                    sigInfo.signature,
                    {
                        encoding: 'jsonParsed',
                        maxSupportedTransactionVersion: 0
                    }
                ]);

                if (txResponse.result) {
                    const transaction = this.transformTransaction(txResponse.result, sigInfo, walletAddress);
                    transactions.push(transaction);
                }
            } catch (error) {
                console.warn(`Failed to fetch transaction ${sigInfo.signature}:`, error);
                // Continue with other transactions
            }
        }

        return transactions;
    }

    /**
     * Gets token metadata from mint address using known token registry
     */
    private async getTokenMetadata(mintAddress: string): Promise<{ symbol?: string; name?: string }> {
        // Known token registry for common Solana tokens
        const knownTokens: Record<string, { symbol: string; name: string }> = {
            'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', name: 'USD Coin' },
            'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { symbol: 'USDT', name: 'Tether USD' },
            '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': { symbol: 'RAY', name: 'Raydium' },
            'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt': { symbol: 'SRM', name: 'Serum' },
            'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac': { symbol: 'MNGO', name: 'Mango' },
            'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE': { symbol: 'ORCA', name: 'Orca' },
            'StepAscQoEioFxxWGnh2sLBDFp9d8rvKz2Yp39iDpyT': { symbol: 'STEP', name: 'Step Finance' },
            'CopEFkRzkYgfYKFVLWdgELNNFyNVdWE1jVgVjdJMYFSX': { symbol: 'COPE', name: 'Cope' },
            '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj': { symbol: 'SAMO', name: 'Samoyedcoin' },
            'EchesyfXePKdLtoiZSL8pBe8Myagyy8ZRqsACNCFGnvp': { symbol: 'FIDA', name: 'Bonfida' },
            'kinXdEcpDQeHPEuQnqmUgtYykqKGVFq6CeVX5iAHJq6': { symbol: 'KIN', name: 'Kin' }
        };

        // Check if it's a known token
        if (knownTokens[mintAddress]) {
            return knownTokens[mintAddress] || {};
        }

        try {
            // Try to get token metadata from the mint account
            const response = await this.rpcCall('getAccountInfo', [
                mintAddress,
                {
                    encoding: 'jsonParsed'
                }
            ]);

            // For now, return basic info - in a full implementation, 
            // you'd parse the metadata account or use the Solana Token List
            return {
                symbol: 'TOKEN',
                name: 'Unknown Token'
            };
        } catch (error) {
            return {
                symbol: 'UNKNOWN',
                name: 'Unknown Token'
            };
        }
    }

    /**
     * Transforms a single transaction from RPC response to our Transaction interface
     */
    private transformTransaction(txData: any, sigInfo: any, walletAddress: string): Transaction {
        const meta = txData.meta;
        const transaction = txData.transaction;

        return {
            signature: sigInfo.signature,
            timestamp: sigInfo.blockTime ? sigInfo.blockTime * 1000 : Date.now(),
            type: this.determineTransactionType(transaction, meta, walletAddress),
            amount: this.extractTransactionAmount(meta),
            fee: meta?.fee ? meta.fee / 1e9 : 0, // Convert lamports to SOL
            status: meta?.err ? 'failed' : 'success',
            involvedAddresses: this.extractInvolvedAddresses(transaction)
        };
    }

    /**
     * Determines transaction type based on transaction data and wallet context
     */
    private determineTransactionType(transaction: any, meta: any, walletAddress: string): Transaction['type'] {
        if (!transaction?.message?.instructions) {
            return 'unknown';
        }

        const instructions = transaction.message.instructions;
        let baseType: string = 'unknown';

        // First determine the base transaction type
        for (const instruction of instructions) {
            const programId = instruction.programId;

            // System Program - usually transfers
            if (programId === '11111111111111111111111111111111') {
                baseType = 'transfer';
                break;
            }

            // SPL Token Program
            if (programId === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
                baseType = 'transfer';
                break;
            }

            // Common DEX program IDs
            if (programId === '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM' || // Serum
                programId === 'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB' || // Jupiter
                programId === '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8') { // Raydium
                return 'swap';
            }

            // Staking programs
            if (programId === 'Stake11111111111111111111111111111111111111') {
                return 'stake';
            }
        }

        // For transfers, determine direction based on balance changes
        if (baseType === 'transfer') {
            return this.determineTransferDirection(meta, walletAddress, transaction);
        }

        return baseType as Transaction['type'];
    }

    /**
     * Determines if a transfer is incoming or outgoing based on balance changes
     */
    private determineTransferDirection(meta: any, walletAddress: string, transaction: any): 'transfer-in' | 'transfer-out' | 'transfer' {
        if (!meta || !meta.preBalances || !meta.postBalances || !transaction?.message?.accountKeys) {
            return 'transfer';
        }

        try {
            // Find the wallet address in the account keys
            const accountKeys = Array.isArray(transaction.message.accountKeys)
                ? transaction.message.accountKeys
                : transaction.message.accountKeys.static || [];

            const walletIndex = accountKeys.findIndex((key: string) => key === walletAddress);

            if (walletIndex === -1) {
                return 'transfer';
            }

            // Compare pre and post balances for the wallet
            const preBalance = meta.preBalances[walletIndex] || 0;
            const postBalance = meta.postBalances[walletIndex] || 0;
            const balanceChange = postBalance - preBalance;

            // Account for transaction fees (first account is usually the fee payer)
            const fee = meta.fee || 0;

            // If balance increased (minus fees if this wallet paid them), it's incoming
            // If balance decreased, it's outgoing
            if (walletIndex === 0) {
                // This wallet paid the fee
                if (balanceChange + fee > 0) {
                    return 'transfer-in';
                } else if (balanceChange + fee < 0) {
                    return 'transfer-out';
                }
            } else {
                // This wallet didn't pay the fee
                if (balanceChange > 0) {
                    return 'transfer-in';
                } else if (balanceChange < 0) {
                    return 'transfer-out';
                }
            }

            return 'transfer';
        } catch (error) {
            console.warn('Error determining transfer direction:', error);
            return 'transfer';
        }
    }

    /**
     * Extracts transaction amount from meta data
     */
    private extractTransactionAmount(meta: any): number {
        if (!meta || !meta.preBalances || !meta.postBalances) {
            return 0;
        }

        // Calculate the difference in the first account (usually the signer)
        const preBalance = meta.preBalances[0] || 0;
        const postBalance = meta.postBalances[0] || 0;

        return Math.abs(postBalance - preBalance) / 1e9; // Convert lamports to SOL
    }

    /**
     * Extracts involved addresses from transaction data
     */
    private extractInvolvedAddresses(transaction: any): string[] {
        const addresses: string[] = [];

        if (transaction?.message?.accountKeys) {
            // Handle both legacy and versioned transactions
            if (Array.isArray(transaction.message.accountKeys)) {
                addresses.push(...transaction.message.accountKeys);
            } else if (transaction.message.accountKeys.static) {
                addresses.push(...transaction.message.accountKeys.static);
            }
        }

        // Remove duplicates and return
        return [...new Set(addresses)];
    }
}