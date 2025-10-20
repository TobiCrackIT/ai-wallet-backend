/**
 * AI API routes for OpenAI service
 */

import { Router } from 'express';
import { OpenAIAPIService } from '../services/openai.js';

export function createAIRoutes(): Router {
    const router = Router();
    const openAIService = new OpenAIAPIService();

    // Generate AI response
    router.post('/chat', async (req, res) => {
        try {
            const { prompt, walletData } = req.body;

            if (!prompt || !walletData) {
                return res.status(400).json({
                    error: 'Missing required fields: prompt and walletData'
                });
            }

            // Validate query first
            const validation = openAIService.validateQuery(prompt);
            if (!validation.isValid) {
                return res.status(400).json({
                    error: validation.reason || 'Invalid query'
                });
            }

            const response = await openAIService.generateResponse(prompt, walletData);

            res.json({
                response,
                prompt,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error generating AI response:', error);

            // Provide fallback response
            const fallbackResponse = openAIService.createFallbackResponse(
                req.body.prompt || '',
                req.body.walletData || {}
            );

            res.status(500).json({
                error: 'AI service temporarily unavailable',
                response: fallbackResponse.content,
                fallback: true
            });
        }
    });

    // Process natural language query with context
    router.post('/query', async (req, res) => {
        try {
            const { query, context } = req.body;

            if (!query || !context) {
                return res.status(400).json({
                    error: 'Missing required fields: query and context'
                });
            }

            // Validate query first
            const validation = openAIService.validateQuery(query);
            if (!validation.isValid) {
                return res.status(400).json({
                    error: validation.reason || 'Invalid query'
                });
            }

            const aiResponse = await openAIService.processNaturalLanguageQuery(query, context);

            res.json({
                ...aiResponse,
                query,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error processing natural language query:', error);

            // Provide fallback response
            const fallbackResponse = openAIService.createFallbackResponse(
                req.body.query || '',
                req.body.context?.walletDataSnapshot || {}
            );

            res.status(500).json({
                error: 'AI service temporarily unavailable',
                ...fallbackResponse,
                fallback: true
            });
        }
    });

    // Validate query endpoint
    router.post('/validate', async (req, res) => {
        try {
            const { query } = req.body;

            if (!query) {
                return res.status(400).json({
                    error: 'Missing required field: query'
                });
            }

            const validation = openAIService.validateQuery(query);

            res.json({
                ...validation,
                query,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error validating query:', error);
            res.status(500).json({
                error: 'Failed to validate query',
                isValid: false
            });
        }
    });

    // Process blockchain market query
    router.post('/market', async (req, res) => {
        try {
            const { blockchain, query } = req.body;

            if (!blockchain || !query) {
                return res.status(400).json({
                    error: 'Missing required fields: blockchain and query'
                });
            }

            // Validate query first
            const validation = openAIService.validateQuery(query);
            if (!validation.isValid) {
                return res.status(400).json({
                    error: validation.reason || 'Invalid query'
                });
            }

            const response = await openAIService.processBlockchainMarketQuery(blockchain, query);

            res.json({
                response,
                blockchain,
                query,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error processing blockchain market query:', error);
            res.status(500).json({
                error: 'Failed to process market query',
                response: `I'm currently unable to process market queries for ${req.body.blockchain || 'this blockchain'}. Please try again later.`
            });
        }
    });

    // Extract intent from natural language
    router.post('/extract-intent', async (req, res) => {
        try {
            const { userInput } = req.body;

            if (!userInput) {
                return res.status(400).json({
                    error: 'Missing required field: userInput'
                });
            }

            // Validate input first
            const validation = openAIService.validateQuery(userInput);
            if (!validation.isValid) {
                return res.status(400).json({
                    error: validation.reason || 'Invalid input'
                });
            }

            const intentData = await openAIService.extractIntent(userInput);

            res.json({
                ...intentData,
                userInput,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error extracting intent:', error);
            res.status(500).json({
                error: 'Failed to extract intent',
                intent: 'other',
                parameters: {
                    token_symbol: null,
                    amount: null,
                    recipient: null,
                    network: 'base',
                    contract_address: null,
                    method: null
                },
                confidence: 0.1,
                missing_info: ['Service temporarily unavailable']
            });
        }
    });

    return router;
}