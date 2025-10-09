/**
 * Backend server for Coinrade AI Wallet Assistant
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createPriceRoutes } from './routes/prices.js';
import { createWalletRoutes } from './routes/wallet.js';
import { createAIRoutes } from './routes/ai.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5174',
    credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'coinrade-ai-wallet-backend'
    });
});

// API routes
app.use('/api/prices', createPriceRoutes());
app.use('/api/wallet', createWalletRoutes());
app.use('/api/ai', createAIRoutes());

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Backend server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`💰 Price API: http://localhost:${PORT}/api/prices`);
    console.log(`🔗 Wallet API: http://localhost:${PORT}/api/wallet`);
    console.log(`🤖 AI API: http://localhost:${PORT}/api/ai`);
});