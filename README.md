# Rodeo AI Wallet Assistant - Backend

Backend services for the Rodeo AI Wallet Assistant application.

## Features

- **Price API**: Cryptocurrency price data from CoinGecko
- **CORS Handling**: Proper CORS configuration for frontend communication
- **Caching**: Built-in request caching to reduce API calls
- **Error Handling**: Comprehensive error handling and logging
- **Health Checks**: Health check endpoints for monitoring

## Setup

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Development**
   ```bash
   npm run dev
   ```

4. **Production Build**
   ```bash
   npm run build
   npm start
   ```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Price API
- `GET /api/prices/sol` - Get SOL price in USD
- `POST /api/prices/tokens` - Get multiple token prices
- `GET /api/prices/token/:address` - Get single token price

## Environment Variables

```env
# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5174

# API Keys
COINGECKO_API_KEY=your_coingecko_api_key_here
HELIUS_API_KEY=your_helius_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

## Architecture

```
backend/
├── src/
│   ├── types/           # TypeScript type definitions
│   ├── services/        # API service implementations
│   ├── routes/          # Express route handlers
│   └── index.ts         # Main server file
├── package.json
├── tsconfig.json
└── README.md
```

## Development

The backend runs on port 3001 by default and provides API endpoints for the frontend to consume. This architecture:

- **Separates concerns**: Frontend handles UI, backend handles API calls
- **Solves CORS issues**: Backend makes API calls, avoiding browser CORS restrictions
- **Improves performance**: Backend caching reduces external API calls
- **Enhances security**: API keys are kept on the server side

## Deployment

For production deployment:

1. Build the application: `npm run build`
2. Set production environment variables
3. Start the server: `npm start`
4. Configure reverse proxy (nginx/Apache) if needed
5. Set up process manager (PM2) for production
