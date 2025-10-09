/**
 * CoinGecko API Service Implementation for Backend
 * Provides methods for fetching cryptocurrency price data
 */

import type { CoinGeckoService } from '../types/api.js';

export class CoinGeckoAPIService implements CoinGeckoService {
    private readonly baseUrl: string;
    private readonly apiKey?: string;
    private readonly requestCache: Map<string, { data: any; timestamp: number }>;
    private readonly cacheTimeout: number = 60000; // 1 minute cache
    private readonly apiHeader: string = 'X-CG-Demo-API-Key';

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.COINGECKO_API_KEY || '';
        this.baseUrl = 'https://api.coingecko.com/api/v3';
        this.requestCache = new Map();
    }

    /**
     * Fetches current prices for multiple tokens using Solana mint addresses
     */
    async getTokenPrices(tokenAddresses: string[]): Promise<Record<string, number>> {
        if (!tokenAddresses || tokenAddresses.length === 0) {
            return {};
        }

        try {
            // Create cache key for this request
            const cacheKey = `prices_${tokenAddresses.sort().join(',')}`;
            const cached = this.getCachedData(cacheKey);

            if (cached) {
                return cached;
            }

            // Filter out any empty or invalid token addresses
            const validAddresses = tokenAddresses.filter(addr => addr && addr.length > 0);

            if (validAddresses.length === 0) {
                return {};
            }

            // Handle stablecoins first - they always have a price of $1
            let priceMap: Record<string, number> = {};
            const stablecoins = this.getStablecoinAddresses();

            for (const address of validAddresses) {
                if (stablecoins.includes(address)) {
                    priceMap[address] = 1.0;
                    console.log(`💰 Stablecoin ${address}: $1.00 (hardcoded)`);
                }
            }

            // Filter out stablecoins from addresses that need API calls
            const nonStablecoinAddresses = validAddresses.filter(addr => !stablecoins.includes(addr));

            // Only fetch prices for non-stablecoin tokens if there are any
            if (nonStablecoinAddresses.length === 0) {
                // All tokens are stablecoins, return the price map
                this.setCachedData(cacheKey, priceMap);
                return priceMap;
            }

            // Try onchain API first, then fallback to simple price API for known tokens
            try {
                // Try the onchain API
                const addressesParam = nonStablecoinAddresses.join(',');
                const onchainUrl = `${this.baseUrl}/onchain/networks/solana/tokens/multi/${addressesParam}`;

                const headers: HeadersInit = {
                    'Accept': 'application/json',
                };

                if (this.apiKey) {
                    headers[this.apiHeader] = this.apiKey;
                }

                console.log('🔍 Trying onchain API for Solana tokens:', nonStablecoinAddresses.slice(0, 3), nonStablecoinAddresses.length > 3 ? `... and ${nonStablecoinAddresses.length - 3} more` : '');

                const response = await fetch(onchainUrl, { headers });

                if (response.ok) {
                    const data = await response.json();
                    console.log('💰 CoinGecko onchain response:', Object.keys(data.data || {}).length, 'tokens found');

                    if (data.data) {
                        for (const address of nonStablecoinAddresses) {
                            const tokenData = data.data[address];
                            if (tokenData && tokenData.attributes && tokenData.attributes.price_usd) {
                                priceMap[address] = parseFloat(tokenData.attributes.price_usd);
                            }
                        }
                    }
                } else {
                    console.warn(`Onchain API failed with status ${response.status}, trying fallback`);
                }
            } catch (onchainError) {
                console.warn('Onchain API failed, trying fallback:', onchainError);
            }

            // Fallback: Use simple price API for known tokens
            const knownTokens = this.getKnownTokenMapping();
            const unmappedAddresses = nonStablecoinAddresses.filter(addr => !priceMap[addr]);

            if (unmappedAddresses.length > 0) {
                console.log('🔄 Using fallback API for unmapped tokens');

                for (const address of unmappedAddresses) {
                    const tokenId = knownTokens[address];
                    if (tokenId) {
                        try {
                            const fallbackUrl = `${this.baseUrl}/simple/price?ids=${tokenId}&vs_currencies=usd`;
                            const fallbackHeaders: HeadersInit = { 'Accept': 'application/json' };

                            if (this.apiKey) {
                                fallbackHeaders[this.apiHeader] = this.apiKey;
                            }

                            const fallbackResponse = await fetch(fallbackUrl, { headers: fallbackHeaders });

                            if (fallbackResponse.ok) {
                                const fallbackData = await fallbackResponse.json();
                                if (fallbackData[tokenId] && fallbackData[tokenId].usd) {
                                    priceMap[address] = fallbackData[tokenId].usd;
                                    console.log(`✅ Got price for ${tokenId}: $${fallbackData[tokenId].usd}`);
                                }
                            }
                        } catch (fallbackError) {
                            console.warn(`Failed to get price for ${address}:`, fallbackError);
                        }
                    }
                }
            }

            // Cache the result if we got any prices
            if (Object.keys(priceMap).length > 0) {
                this.setCachedData(cacheKey, priceMap);
            }

            return priceMap;
        } catch (error) {
            console.error('Error fetching token prices:', error);
            return {}; // Return empty object instead of throwing
        }
    }

    /**
     * Fetches current Solana (SOL) price using multiple fallback methods
     */
    async getSolanaPrice(): Promise<number> {
        try {
            const cacheKey = 'solana_price';
            const cached = this.getCachedData(cacheKey);

            if (cached) {
                return cached;
            }

            // Method 1: Try using the multi-token endpoint with SOL mint address
            const solMintAddress = 'So11111111111111111111111111111111111111112';
            const prices = await this.getTokenPrices([solMintAddress]);

            let price = prices[solMintAddress] || 0;

            // Method 2: If that fails, try direct simple price API
            if (price === 0) {
                try {
                    console.log('🔄 Trying direct SOL price API');
                    const url = `${this.baseUrl}/simple/price?ids=solana&vs_currencies=usd`;
                    const headers: HeadersInit = { 'Accept': 'application/json' };

                    if (this.apiKey) {
                        headers[this.apiHeader] = this.apiKey;
                    }

                    const response = await fetch(url, { headers });

                    if (response.ok) {
                        const data = await response.json();
                        price = data.solana?.usd || 0;
                        console.log('✅ Got SOL price from direct API:', price);
                    }
                } catch (directError) {
                    console.warn('Direct SOL price API also failed:', directError);
                }
            }

            if (price > 0) {
                // Cache the result
                this.setCachedData(cacheKey, price);
            }

            return price;
        } catch (error) {
            console.error('Error fetching Solana price:', error);
            return 0;
        }
    }

    /**
     * Fetches price for a single token using its Solana mint address
     */
    async getTokenPrice(tokenAddress: string): Promise<number> {
        try {
            const prices = await this.getTokenPrices([tokenAddress]);
            return prices[tokenAddress] || 0;
        } catch (error) {
            console.error(`Error fetching price for token ${tokenAddress}:`, error);
            return 0;
        }
    }

    /**
     * Gets cached data if it exists and is not expired
     */
    private getCachedData(key: string): any | null {
        const cached = this.requestCache.get(key);

        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.data;
        }

        // Remove expired cache entry
        if (cached) {
            this.requestCache.delete(key);
        }

        return null;
    }

    /**
     * Sets data in cache with current timestamp
     */
    private setCachedData(key: string, data: any): void {
        this.requestCache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Clears all cached data
     */
    clearCache(): void {
        this.requestCache.clear();
    }

    /**
     * Returns list of stablecoin addresses that always have $1 price
     */
    private getStablecoinAddresses(): string[] {
        return [
            'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
            'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'  // USDT
        ];
    }

    /**
     * Maps Solana mint addresses to CoinGecko token IDs
     */
    private getKnownTokenMapping(): Record<string, string> {
        return {
            'So11111111111111111111111111111111111111112': 'solana', // SOL
            'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'usd-coin', // USDC
            'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'tether', // USDT
            '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': 'raydium', // RAY
            'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt': 'serum', // SRM
            'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac': 'mango-markets', // MNGO
            'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE': 'orca', // ORCA
            'StepAscQoEioFxxWGnh2sLBDFp9d8rvKz2Yp39iDpyT': 'step-finance', // STEP
            'CopEFkRzkYgfYKFVLWdgELNNFyNVdWE1jVgVjdJMYFSX': 'cope', // COPE
            '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj': 'samoyedcoin', // SAMO
            'EchesyfXePKdLtoiZSL8pBe8Myagyy8ZRqsACNCFGnvp': 'bonfida', // FIDA
            'kinXdEcpDQeHPEuQnqmUgtYykqKGVFq6CeVX5iAHJq6': 'kin' // KIN
        };
    }

    /**
     * Batch request optimization - splits large requests into smaller chunks
     * Note: The onchain API supports multiple addresses in a single request
     */
    async getTokenPricesBatch(tokenAddresses: string[], batchSize: number = 30): Promise<Record<string, number>> {
        if (tokenAddresses.length <= batchSize) {
            return this.getTokenPrices(tokenAddresses);
        }

        const batches: string[][] = [];
        for (let i = 0; i < tokenAddresses.length; i += batchSize) {
            batches.push(tokenAddresses.slice(i, i + batchSize));
        }

        const results: Record<string, number> = {};

        for (const batch of batches) {
            try {
                const batchResults = await this.getTokenPrices(batch);
                Object.assign(results, batchResults);

                // Add small delay between batches to respect rate limits
                if (batches.length > 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            } catch (error) {
                console.error('Error in batch request:', error);
                // Continue with other batches even if one fails
            }
        }

        return results;
    }
}