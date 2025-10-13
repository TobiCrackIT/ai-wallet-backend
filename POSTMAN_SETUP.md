# Postman API Testing Setup

This directory contains Postman collection and environment files for testing the Coinrade AI Wallet backend API.

## Files Included

- `Coinrade_AI_Wallet_API.postman_collection.json` - Complete API collection with all endpoints
- `Coinrade_AI_Wallet_Environment.postman_environment.json` - Environment variables for testing

## Setup Instructions

### 1. Import Collection
1. Open Postman
2. Click "Import" button
3. Select `Coinrade_AI_Wallet_API.postman_collection.json`
4. The collection will appear in your workspace

### 2. Import Environment
1. Click the gear icon (⚙️) in the top right
2. Select "Import" 
3. Choose `Coinrade_AI_Wallet_Environment.postman_environment.json`
4. Select the imported environment from the dropdown

### 3. Configure Environment Variables
Update these variables in your environment:
- `baseUrl`: Your local server URL (default: `http://localhost:3001`)
- `productionUrl`: Your production server URL (update with actual domain)
- `testWalletAddress`: A valid Solana wallet address for testing

## API Endpoints Overview

### 🏷️ Price API (`/api/prices`)
- **GET** `/sol` - Get SOL price
- **POST** `/tokens` - Get multiple token prices
- **GET** `/token/:address` - Get single token price
- **POST** `/tokens/:network` - Get prices by network
- **GET** `/token/:network/:address` - Get price by network and address
- **GET** `/data/:address` - Get comprehensive token data
- **GET** `/data/:network/:address` - Get token data by network

### 💼 Wallet API (`/api/wallet`)
- **GET** `/validate/:address` - Validate wallet address
- **GET** `/info/:address` - Get wallet info
- **GET** `/transactions/:address` - Get wallet transactions
- **GET** `/tokens/:address` - Get wallet tokens

### 🤖 AI API (`/api/ai`)
- **POST** `/chat` - Generate AI response
- **POST** `/query` - Process natural language query
- **POST** `/validate` - Validate query

### ❤️ Health Check
- **GET** `/health` - API health check

## Testing Examples

### Test Token Prices
1. Use "Get SOL Price" to test basic functionality
2. Try "Get Token Prices (Multiple)" with Solana tokens
3. Test Base network with "Get Token Prices by Network"

### Test Wallet Functionality
1. Update `testWalletAddress` with a real Solana address
2. Run "Validate Wallet Address" first
3. Test "Get Wallet Info" and "Get Wallet Tokens"

### Test AI Features
1. Use "Validate Query" to test query validation
2. Try "AI Chat" with sample wallet data
3. Test "Process Natural Language Query" with context

## Network Support

The API supports multiple blockchain networks:
- **Solana**: Native support with extensive token mapping
- **Base**: Full support with popular Base ecosystem tokens
- **Ethereum**: Basic support with major tokens
- **Polygon**: Basic support with major tokens

## Token Examples by Network

### Solana
- SOL: `So11111111111111111111111111111111111111112`
- USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- RAY: `4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R`

### Base
- WETH: `0x4200000000000000000000000000000000000006`
- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- DEGEN: `0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed`

## Error Handling

The API includes comprehensive error handling:
- **400**: Bad Request (invalid parameters)
- **404**: Not Found (token/wallet not found)
- **500**: Internal Server Error (service unavailable)

All endpoints return consistent error response format:
```json
{
  "error": "Error description",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

## Rate Limiting

Be mindful of API rate limits:
- CoinGecko API has rate limits (especially for free tier)
- Helius API has rate limits based on your plan
- OpenAI API has rate limits and costs per request

## Environment Switching

To switch between local and production:
1. Update the `baseUrl` variable in your environment
2. Or create separate environments for different stages
3. Ensure your production server is running and accessible

## Troubleshooting

### Common Issues
1. **Connection refused**: Make sure your backend server is running
2. **404 errors**: Check if the endpoint paths match your server routes
3. **Token not found**: Verify token addresses are correct for the network
4. **AI errors**: Check if OpenAI API key is configured properly

### Debug Tips
1. Check the Postman Console for detailed request/response logs
2. Verify environment variables are set correctly
3. Test health check endpoint first to ensure server connectivity
4. Use the browser network tab to compare with frontend requests

## Contributing

When adding new endpoints:
1. Update the Postman collection
2. Add appropriate environment variables
3. Include example requests with realistic data
4. Update this documentation