/**
 * CoinGecko API Service Implementation for Backend
 * Provides methods for fetching cryptocurrency price data
 */

import type { CoinGeckoService, TokenData } from '../types/api.js';
import { TokenRegistry } from './tokenRegistry.js';

export class CoinGeckoAPIService implements CoinGeckoService {
    private readonly baseUrl: string;
    private readonly apiKey?: string;
    private readonly requestCache: Map<string, { data: any; timestamp: number }>;
    private readonly cacheTimeout: number = 60000; // 1 minute cache
    private readonly apiHeader: string = 'X-CG-Demo-API-Key';
    private readonly network: string = 'solana';

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.COINGECKO_API_KEY || '';
        this.baseUrl = 'https://api.coingecko.com/api/v3';
        this.requestCache = new Map();
    }

    /**
     * Fetches current prices for multiple tokens using mint addresses
     * @param tokenAddresses - Array of token mint addresses
     * @param network - Blockchain network (default: 'solana')
     */
    async getTokenPrices(tokenAddresses: string[], network: string = 'solana'): Promise<Record<string, number>> {
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
            const stablecoins = TokenRegistry.getStablecoinAddresses(network);

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
                const onchainUrl = `${this.baseUrl}/onchain/networks/${network}/tokens/multi/${addressesParam}`;

                const headers: HeadersInit = {
                    'Accept': 'application/json',
                };

                if (this.apiKey) {
                    headers[this.apiHeader] = this.apiKey;
                }

                console.log(`🔍 Trying onchain API for ${network} tokens:`, nonStablecoinAddresses.slice(0, 3), nonStablecoinAddresses.length > 3 ? `... and ${nonStablecoinAddresses.length - 3} more` : '');

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
            const knownTokens = TokenRegistry.getKnownTokenMapping(network);
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
     * Fetches price for a single token using its mint address
     * @param tokenAddress - Token mint address
     * @param network - Blockchain network (default: 'solana')
     */
    async getTokenPrice(tokenAddress: string, network: string = 'solana'): Promise<number> {
        try {
            const prices = await this.getTokenPrices([tokenAddress], network);
            return prices[tokenAddress] || 0;
        } catch (error) {
            console.error(`Error fetching price for token ${tokenAddress} on ${network}:`, error);
            return 0;
        }
    }

    /**
     * Fetches comprehensive token data including price, market cap, volume, and metadata
     * @param tokenAddress - Token contract address
     * @param network - Blockchain network (default: 'solana')
     */
    async getTokenData(tokenAddress: string, network: string = 'solana'): Promise<TokenData | null> {
        if (!tokenAddress || tokenAddress.length === 0) {
            return null;
        }

        try {
            const cacheKey = `token_data_${network}_${tokenAddress}`;
            const cached = this.getCachedData(cacheKey);

            if (cached) {
                return cached;
            }

            // Initialize token data with basic info
            const tokenData: TokenData = {
                address: tokenAddress,
                network: network.toLowerCase()
            };

            // Check if it's a stablecoin first
            if (TokenRegistry.isStablecoin(tokenAddress, network)) {
                const stablecoinMetadata = TokenRegistry.getStablecoinMetadata(network);
                const metadata = stablecoinMetadata.find(s => s.address === tokenAddress);

                tokenData.price_usd = 1.0;
                tokenData.symbol = metadata?.symbol || 'STABLECOIN';
                tokenData.name = metadata?.name || 'Stablecoin';
                tokenData.decimals = metadata?.decimals || 6;

                this.setCachedData(cacheKey, tokenData);
                return tokenData;
            }

            // Try onchain API first for comprehensive data
            try {
                const onchainUrl = `${this.baseUrl}/onchain/networks/${network}/tokens/${tokenAddress}`;
                const headers: HeadersInit = { 'Accept': 'application/json' };

                if (this.apiKey) {
                    headers[this.apiHeader] = this.apiKey;
                }

                console.log(`🔍 Fetching token data for ${tokenAddress} on ${network}`);

                const response = await fetch(onchainUrl, { headers });

                if (response.ok) {
                    const data = await response.json();

                    if (data.data && data.data.attributes) {
                        const attrs = data.data.attributes;

                        // Map onchain API response to our TokenData interface
                        tokenData.name = attrs.name;
                        tokenData.symbol = attrs.symbol;
                        if (attrs.decimals !== undefined) tokenData.decimals = attrs.decimals;
                        if (attrs.price_usd) tokenData.price_usd = parseFloat(attrs.price_usd);
                        if (attrs.market_cap_usd) tokenData.market_cap_usd = parseFloat(attrs.market_cap_usd);
                        if (attrs.volume_24h?.usd) tokenData.volume_24h_usd = parseFloat(attrs.volume_24h.usd);
                        if (attrs.price_change_24h?.usd) tokenData.price_change_24h = parseFloat(attrs.price_change_24h.usd);
                        if (attrs.price_change_percentage_24h?.usd) tokenData.price_change_percentage_24h = parseFloat(attrs.price_change_percentage_24h.usd);
                        if (attrs.total_supply) tokenData.total_supply = parseFloat(attrs.total_supply);
                        tokenData.image = attrs.image_url;
                        tokenData.description = attrs.description;
                        tokenData.last_updated = attrs.updated_at;

                        console.log(`✅ Got comprehensive data for ${tokenData.symbol || tokenAddress}`);

                        this.setCachedData(cacheKey, tokenData);
                        return tokenData;
                    }
                } else {
                    console.warn(`Onchain API failed with status ${response.status}, trying fallback`);
                }
            } catch (onchainError) {
                console.warn('Onchain API failed, trying fallback:', onchainError);
            }

            // Fallback: Use known token mapping and coins API for detailed data
            const coingeckoId = TokenRegistry.getCoinGeckoId(tokenAddress, network);

            if (coingeckoId) {
                try {
                    // Use coins API for comprehensive token data
                    const coinsUrl = `${this.baseUrl}/coins/${coingeckoId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
                    const headers: HeadersInit = { 'Accept': 'application/json' };

                    if (this.apiKey) {
                        headers[this.apiHeader] = this.apiKey;
                    }

                    const response = await fetch(coinsUrl, { headers });

                    if (response.ok) {
                        const data = await response.json();

                        // Map CoinGecko coins API response to our TokenData interface
                        tokenData.coingecko_id = data.id;
                        tokenData.name = data.name;
                        tokenData.symbol = data.symbol?.toUpperCase();
                        tokenData.image = data.image?.large || data.image?.small;
                        tokenData.description = data.description?.en;

                        if (data.market_data) {
                            const md = data.market_data;
                            if (md.current_price?.usd) tokenData.price_usd = md.current_price.usd;
                            if (md.market_cap?.usd) tokenData.market_cap_usd = md.market_cap.usd;
                            if (md.total_volume?.usd) tokenData.volume_24h_usd = md.total_volume.usd;
                            if (md.price_change_24h) tokenData.price_change_24h = md.price_change_24h;
                            if (md.price_change_percentage_24h) tokenData.price_change_percentage_24h = md.price_change_percentage_24h;
                            if (md.price_change_percentage_7d) tokenData.price_change_percentage_7d = md.price_change_percentage_7d;
                            if (md.price_change_percentage_30d) tokenData.price_change_percentage_30d = md.price_change_percentage_30d;
                            if (md.total_supply) tokenData.total_supply = md.total_supply;
                            if (md.circulating_supply) tokenData.circulating_supply = md.circulating_supply;
                            if (md.max_supply) tokenData.max_supply = md.max_supply;
                            if (md.ath?.usd) tokenData.ath = md.ath.usd;
                            if (md.ath_date?.usd) tokenData.ath_date = md.ath_date.usd;
                            if (md.atl?.usd) tokenData.atl = md.atl.usd;
                            if (md.atl_date?.usd) tokenData.atl_date = md.atl_date.usd;
                            if (md.last_updated) tokenData.last_updated = md.last_updated;
                        }

                        console.log(`✅ Got fallback data for ${tokenData.symbol || coingeckoId}`);

                        this.setCachedData(cacheKey, tokenData);
                        return tokenData;
                    }
                } catch (fallbackError) {
                    console.warn(`Failed to get token data for ${coingeckoId}:`, fallbackError);
                }
            }

            // If we still don't have data, try to get at least the price
            const price = await this.getTokenPrice(tokenAddress, network);
            if (price > 0) {
                tokenData.price_usd = price;

                this.setCachedData(cacheKey, tokenData);
                return tokenData;
            }

            // Return null if we couldn't get any data
            console.warn(`No data found for token ${tokenAddress} on ${network}`);
            return null;

        } catch (error) {
            console.error(`Error fetching token data for ${tokenAddress} on ${network}:`, error);
            return null;
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
     * Batch request optimization - splits large requests into smaller chunks
     * Note: The onchain API supports multiple addresses in a single request
     * @param tokenAddresses - Array of token addresses
     * @param batchSize - Number of addresses per batch
     * @param network - Blockchain network (default: 'solana')
     */
    async getTokenPricesBatch(tokenAddresses: string[], batchSize: number = 30, network: string = 'solana'): Promise<Record<string, number>> {
        if (tokenAddresses.length <= batchSize) {
            return this.getTokenPrices(tokenAddresses, network);
        }

        const batches: string[][] = [];
        for (let i = 0; i < tokenAddresses.length; i += batchSize) {
            batches.push(tokenAddresses.slice(i, i + batchSize));
        }

        const results: Record<string, number> = {};

        for (const batch of batches) {
            try {
                const batchResults = await this.getTokenPrices(batch, network);
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