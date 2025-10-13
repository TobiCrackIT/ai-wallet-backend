/**
 * Price API routes
 */

import { Router } from 'express';
import { CoinGeckoAPIService } from '../services/coingecko.js';

export function createPriceRoutes(): Router {
    const router = Router();
    const coinGeckoService = new CoinGeckoAPIService();

    // Get SOL price
    router.get('/sol', async (req, res) => {
        try {
            const price = await coinGeckoService.getSolanaPrice();
            res.json({
                price,
                currency: 'USD',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error fetching SOL price:', error);
            res.status(500).json({
                error: 'Failed to fetch SOL price',
                price: 0
            });
        }
    });

    // Get token prices by addresses
    router.post('/tokens', async (req, res) => {
        try {
            const { addresses, network = 'solana' } = req.body;

            if (!addresses || !Array.isArray(addresses)) {
                return res.status(400).json({
                    error: 'Invalid request. Expected array of token addresses.'
                });
            }

            const prices = await coinGeckoService.getTokenPrices(addresses, network);
            res.json({
                prices,
                network,
                currency: 'USD',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error fetching token prices:', error);
            res.status(500).json({
                error: 'Failed to fetch token prices',
                prices: {}
            });
        }
    });

    // Get single token price (defaults to Solana)
    router.get('/token/:address', async (req, res) => {
        try {
            const { address } = req.params;
            const network = req.query.network as string || 'solana';
            const price = await coinGeckoService.getTokenPrice(address, network);
            res.json({
                address,
                price,
                network,
                currency: 'USD',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error fetching token price:', error);
            res.status(500).json({
                error: 'Failed to fetch token price',
                price: 0
            });
        }
    });

    // Get token prices by network and addresses
    router.post('/tokens/:network', async (req, res) => {
        try {
            const { network } = req.params;
            const { addresses } = req.body;

            if (!addresses || !Array.isArray(addresses)) {
                return res.status(400).json({
                    error: 'Invalid request. Expected array of token addresses.'
                });
            }

            const prices = await coinGeckoService.getTokenPrices(addresses, network);
            res.json({
                prices,
                network,
                currency: 'USD',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error fetching token prices:', error);
            res.status(500).json({
                error: 'Failed to fetch token prices',
                prices: {}
            });
        }
    });

    // Get single token price by network
    router.get('/token/:network/:address', async (req, res) => {
        try {
            const { network, address } = req.params;
            const price = await coinGeckoService.getTokenPrice(address, network);
            res.json({
                address,
                price,
                network,
                currency: 'USD',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error fetching token price:', error);
            res.status(500).json({
                error: 'Failed to fetch token price',
                price: 0
            });
        }
    });

    // Get comprehensive token data
    router.get('/data/:address', async (req, res) => {
        try {
            const { address } = req.params;
            const network = req.query.network as string || 'solana';
            const tokenData = await coinGeckoService.getTokenData(address, network);

            if (!tokenData) {
                return res.status(404).json({
                    error: 'Token data not found',
                    address,
                    network
                });
            }

            res.json({
                ...tokenData,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error fetching token data:', error);
            res.status(500).json({
                error: 'Failed to fetch token data',
                address: req.params.address,
                network: req.query.network || 'solana'
            });
        }
    });

    // Get comprehensive token data by network
    router.get('/data/:network/:address', async (req, res) => {
        try {
            const { network, address } = req.params;
            const tokenData = await coinGeckoService.getTokenData(address, network);

            if (!tokenData) {
                return res.status(404).json({
                    error: 'Token data not found',
                    address,
                    network
                });
            }

            res.json({
                ...tokenData,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error fetching token data:', error);
            res.status(500).json({
                error: 'Failed to fetch token data',
                address,
                network
            });
        }
    });

    return router;
}