/**
 * Token Registry - Centralized token mapping and metadata
 * Manages known tokens, stablecoins, and network-specific mappings
 */

export interface NetworkTokens {
    stablecoins: string[];
    knownTokens: Record<string, string>;
}

export class TokenRegistry {
    private static readonly networks: Record<string, NetworkTokens> = {
        solana: {
            stablecoins: [
                'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
                'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'  // USDT
            ],
            knownTokens: {
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
            }
        },
        ethereum: {
            stablecoins: [
                '0xA0b86a33E6441b8C4505B8C4505B8C4505B8C4505', // USDC
                '0xdAC17F958D2ee523a2206206994597C13D831ec7'  // USDT
            ],
            knownTokens: {
                '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 'ethereum', // WETH
                '0xA0b86a33E6441b8C4505B8C4505B8C4505B8C4505': 'usd-coin', // USDC
                '0xdAC17F958D2ee523a2206206994597C13D831ec7': 'tether', // USDT
                // Add more Ethereum tokens as needed
            }
        },
        polygon: {
            stablecoins: [
                '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC
                '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'  // USDT
            ],
            knownTokens: {
                '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270': 'matic-network', // WMATIC
                '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174': 'usd-coin', // USDC
                '0xc2132D05D31c914a87C6611C10748AEb04B58e8F': 'tether', // USDT
                // Add more Polygon tokens as needed
            }
        },
        base: {
            stablecoins: [
                '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
                '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2'  // USDT
            ],
            knownTokens: {
                '0x4200000000000000000000000000000000000006': 'ethereum', // WETH
                '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913': 'usd-coin', // USDC
                '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2': 'tether', // USDT
                '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb': 'dai', // DAI
                '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22': 'coinbase-wrapped-staked-eth', // cbETH
                '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452': 'wrapped-steth', // wstETH
                '0x940181a94A35A4569E4529A3CDfB74e38FD98631': 'aerodrome-finance', // AERO
                '0x0578d8A44db98B23BF096A382e016e29a5Ce0ffe': 'higher', // HIGHER
                '0x532f27101965dd16442E59d40670FaF5eBB142E4': 'brett', // BRETT
                '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed': 'degen-base', // DEGEN
                '0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42': 'eurc', // EURC
                '0x78a087d713Be963Bf307b18F2Ff8122EF9A63ae9': 'base-god', // BSWAP
                '0x27D2DECb4bFC9C76F0309b8E88dec3a601Fe25a8': 'bald', // BALD
                '0x8Ee73c484A26e0A5df2Ee2a4960B789967dd0415': 'op-token', // OP (bridged)
                '0x417Ac0e078398C154EdFadD9Ef675d30Be60Af93': 'curve-dao-token', // CRV
                '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984': 'uniswap', // UNI
                '0x3992B27dA26848C2b19CeA6Fd25ad5568B68AB98': 'toshi', // TOSHI
                '0x236aa50979D5f3De3Bd1Eeb40E81137F22ab794b': 'tbtc', // tBTC
                '0xA88594D404727625A9437C3f886C7643872296AE': 'well', // WELL
                '0x9EaF8C1E34F05a589EDa6BAfdF391Cf6Ad3CB239': 'yearn-finance' // YFI
            }
        }
    };

    /**
     * Get stablecoin addresses for a specific network
     * @param network - Blockchain network
     * @returns Array of stablecoin addresses
     */
    static getStablecoinAddresses(network: string): string[] {
        const networkData = this.networks[network.toLowerCase()];
        return networkData?.stablecoins || [];
    }

    /**
     * Get known token mapping for a specific network
     * @param network - Blockchain network
     * @returns Record mapping token addresses to CoinGecko IDs
     */
    static getKnownTokenMapping(network: string): Record<string, string> {
        const networkData = this.networks[network.toLowerCase()];
        return networkData?.knownTokens || {};
    }

    /**
     * Check if a token address is a stablecoin on the given network
     * @param tokenAddress - Token contract address
     * @param network - Blockchain network
     * @returns True if the token is a known stablecoin
     */
    static isStablecoin(tokenAddress: string, network: string): boolean {
        const stablecoins = this.getStablecoinAddresses(network);
        return stablecoins.includes(tokenAddress);
    }

    /**
     * Get CoinGecko ID for a token address on a specific network
     * @param tokenAddress - Token contract address
     * @param network - Blockchain network
     * @returns CoinGecko ID or undefined if not found
     */
    static getCoinGeckoId(tokenAddress: string, network: string): string | undefined {
        const knownTokens = this.getKnownTokenMapping(network);
        return knownTokens[tokenAddress];
    }

    /**
     * Get all supported networks
     * @returns Array of supported network names
     */
    static getSupportedNetworks(): string[] {
        return Object.keys(this.networks);
    }

    /**
     * Check if a network is supported
     * @param network - Network name to check
     * @returns True if the network is supported
     */
    static isNetworkSupported(network: string): boolean {
        return network.toLowerCase() in this.networks;
    }

    /**
     * Get stablecoin metadata for a specific network
     * @param network - Blockchain network
     * @returns Array of stablecoin metadata objects
     */
    static getStablecoinMetadata(network: string): Array<{ address: string; symbol: string; name: string; decimals: number }> {
        const stablecoins = this.getStablecoinAddresses(network);

        return stablecoins.map(address => {
            // Determine symbol and name based on address patterns
            const isUSDC = address.includes('833589fCD6eDb6E08f4c7C32D4f71b54bdA02913') ||
                address.includes('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') ||
                address.includes('A0b86a33E6441b8C4505B8C4505B8C4505B8C4505') ||
                address.includes('2791Bca1f2de4661ED88A30C99A7a9449Aa84174');

            return {
                address,
                symbol: isUSDC ? 'USDC' : 'USDT',
                name: isUSDC ? 'USD Coin' : 'Tether USD',
                decimals: 6
            };
        });
    }

}