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
            const { addresses } = req.body;

            if (!addresses || !Array.isArray(addresses)) {
                return res.status(400).json({
                    error: 'Invalid request. Expected array of token addresses.'
                });
            }

            const prices = await coinGeckoService.getTokenPrices(addresses);
            res.json({
                prices,
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

    // Get single token price
    router.get('/token/:address', async (req, res) => {
        try {
            const { address } = req.params;
            const price = await coinGeckoService.getTokenPrice(address);
            res.json({
                address,
                price,
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

    return router;
}