/**
 * Wallet API routes for Helius service
 */

import { Router } from 'express';
import { HeliusAPIService } from '../services/helius.js';

export function createWalletRoutes(): Router {
    const router = Router();
    const heliusService = new HeliusAPIService();

    // Validate wallet address
    router.get('/validate/:address', async (req, res) => {
        try {
            const { address } = req.params;
            const isValid = heliusService.validateWalletAddress(address);

            res.json({
                address,
                isValid,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error validating wallet address:', error);
            res.status(500).json({
                error: 'Failed to validate wallet address',
                isValid: false
            });
        }
    });

    // Get wallet info (balance, activity status)
    router.get('/info/:address', async (req, res) => {
        try {
            const { address } = req.params;
            const walletInfo = await heliusService.getWalletInfo(address);

            res.json({
                ...walletInfo,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error fetching wallet info:', error);
            res.status(500).json({
                error: 'Failed to fetch wallet information',
                address: req.params.address,
                balance: 0,
                isActive: false
            });
        }
    });

    // Get wallet transactions
    router.get('/transactions/:address', async (req, res) => {
        try {
            const { address } = req.params;
            const limit = parseInt(req.query.limit as string) || 100;

            const transactions = await heliusService.getWalletTransactions(address, limit);

            res.json({
                address,
                transactions,
                count: transactions.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error fetching wallet transactions:', error);
            res.status(500).json({
                error: 'Failed to fetch wallet transactions',
                address: req.params.address,
                transactions: [],
                count: 0
            });
        }
    });

    // Get wallet tokens
    router.get('/tokens/:address', async (req, res) => {
        try {
            const { address } = req.params;
            const tokens = await heliusService.getWalletTokens(address);

            res.json({
                address,
                tokens,
                count: tokens.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error fetching wallet tokens:', error);
            res.status(500).json({
                error: 'Failed to fetch wallet tokens',
                address: req.params.address,
                tokens: [],
                count: 0
            });
        }
    });

    return router;
}