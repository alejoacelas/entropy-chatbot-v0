# AI Evaluation Backend

Backend system for running AI evaluations with caching and rate limiting.

## Features

- CSV upload and processing
- File-based response caching
- Automatic rate limiting with exponential backoff
- Support for multiple prompts in a single request
- Claude 3.5 Sonnet integration via AI SDK

## Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

3. Start the development server:
```bash
npm run dev
```

The server will start on http://localhost:3001

## API Endpoints

### POST /api/evaluate

Run evaluations on a set of prompts.

**Request (CSV Upload):**
```bash
curl -X POST http://localhost:3001/api/evaluate \
  -F "file=@prompts.csv" \
  -F "model=claude-3-5-sonnet-20241022"
```

**Request (JSON):**
```bash
curl -X POST http://localhost:3001/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "prompts": ["What is AI?", "Explain machine learning"],
    "model": "claude-3-5-sonnet-20241022",
    "systemPrompt": "You are a helpful assistant.\n\nUser message: {user_message}"
  }'
```

**Response:**
```json
{
  "success": true,
  "total": 2,
  "cached": 0,
  "errors": 0,
  "results": [
    {
      "prompt": "What is AI?",
      "response": "AI stands for...",
      "cached": false,
      "latencyMs": 1234
    }
  ]
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

## Project Structure

```
backend/
├── src/
│   ├── index.ts                 # Express server entry point
│   ├── types.ts                 # TypeScript interfaces
│   ├── routes/
│   │   └── evaluation.ts        # Evaluation API routes
│   ├── services/
│   │   └── evaluationService.ts # Core evaluation logic
│   └── utils/
│       ├── cache.ts             # File-based caching
│       ├── aiClient.ts          # AI API client with retry
│       └── csvParser.ts         # CSV parsing utility
├── cache/                       # Cached responses (auto-created)
├── prompts/
│   └── system.txt              # Default system prompt template
└── package.json
```

## Configuration

### System Prompt Template

The default system prompt template is stored in `prompts/system.txt`. It should contain a `{user_message}` placeholder that will be replaced with each prompt.

Example:
```
You are a helpful AI assistant.

User message: {user_message}

Please provide a clear and helpful response.
```

### Caching

- Responses are cached in the `cache/` directory as JSON files
- Cache key is a hash of: model + system_prompt + user_message
- Cache files are automatically created and reused across requests

### Rate Limiting

- Automatic exponential backoff on rate limit errors
- Retry delays: 1s, 2s, 4s, 8s, 16s
- Up to 5 retry attempts per request

## Development

```bash
# Run in development mode with auto-reload
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Anthropic API key (required) | - |
| `PORT` | Server port | 3001 |
