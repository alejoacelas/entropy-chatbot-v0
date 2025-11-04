# AI Evaluation System

A comprehensive system for running AI evaluations with a React frontend and Node.js backend, replacing Promptfoo for custom evaluation workflows.

## Features

- **CSV Upload**: Upload CSV files with prompts for batch evaluation
- **AI Integration**: Uses Claude 3.5 Sonnet via AI SDK with Anthropic provider
- **File-based Caching**: Automatic caching of responses to avoid redundant API calls
- **Rate Limiting**: Built-in exponential backoff retry logic for rate limits
- **Results Review**: Review and annotate evaluation results with a modern UI
- **Export Capabilities**: Export results as JSON or CSV

## Project Structure

```
entropy-chatbot-v0/
├── backend/                    # Node.js/TypeScript backend
│   ├── src/
│   │   ├── index.ts           # Express server
│   │   ├── routes/            # API endpoints
│   │   ├── services/          # Business logic
│   │   └── utils/             # Utilities (cache, AI client, CSV parser)
│   ├── cache/                 # Cached responses
│   ├── prompts/               # System prompt templates
│   └── package.json
├── src/                       # React frontend
│   ├── components/            # React components
│   ├── api/                   # API client
│   └── App.tsx               # Main app with tabs
├── public/                    # Static assets
│   ├── evals/                # Evaluation results
│   └── prompts/              # Prompt templates
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Anthropic API key

### 1. Backend Setup

```bash
cd backend
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Start backend server
npm run dev
```

The backend will start on http://localhost:3001

### 2. Frontend Setup

```bash
# From project root
npm install

# Optional: Configure API URL
cp .env.example .env
# Edit .env if backend is not on localhost:3001

# Start frontend
npm run dev
```

The frontend will start on http://localhost:5173

### 3. Run Your First Evaluation

1. Navigate to http://localhost:5173
2. Click "Run Evaluation" tab
3. Upload a CSV file with a "prompt" column
4. Click "Run Evaluation"
5. View results in real-time

## CSV Format

Your CSV file should have a `prompt` column:

```csv
prompt
What is artificial intelligence?
Explain machine learning in simple terms
How does neural network training work?
```

## API Endpoints

### POST /api/evaluate

Run evaluations on a set of prompts.

**With CSV Upload:**
```bash
curl -X POST http://localhost:3001/api/evaluate \
  -F "file=@prompts.csv" \
  -F "model=claude-3-5-sonnet-20241022"
```

**With JSON Array:**
```bash
curl -X POST http://localhost:3001/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "prompts": ["What is AI?"],
    "model": "claude-3-5-sonnet-20241022"
  }'
```

**Response:**
```json
{
  "success": true,
  "total": 1,
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

## Configuration

### System Prompt Template

Edit `backend/prompts/system.txt` to customize the system prompt. Use `{user_message}` as a placeholder for each prompt.

Example:
```
You are a helpful AI assistant.

User message: {user_message}

Please provide a clear and helpful response.
```

### Model Selection

You can specify any Anthropic model:
- `claude-3-5-sonnet-20241022` (default)
- `claude-3-opus-20240229`
- `claude-3-haiku-20240307`

### Caching

- Responses are automatically cached in `backend/cache/`
- Cache key is a hash of: model + system_prompt + user_message
- Cached responses are returned instantly without API calls

### Rate Limiting

The backend automatically handles rate limits with exponential backoff:
- Retry delays: 1s, 2s, 4s, 8s, 16s
- Up to 5 retry attempts per request

## Development

### Backend Development

```bash
cd backend

# Run with auto-reload
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

### Frontend Development

```bash
# From project root

# Run with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

### Backend (.env)
```bash
ANTHROPIC_API_KEY=your_api_key_here  # Required
PORT=3001                             # Optional, defaults to 3001
```

### Frontend (.env)
```bash
VITE_API_URL=http://localhost:3001   # Optional, defaults to http://localhost:3001
```

## Features in Detail

### 1. Run Evaluation Tab

- Upload CSV files with prompts
- Customize model selection
- Override system prompt template
- View real-time results
- Download results as JSON or CSV

### 2. Review Results Tab

- Review existing Promptfoo evaluation results
- Rate responses (0-5 scale)
- Add notes and annotations
- Export annotations
- Filter by prompt and model
- Keyboard shortcuts for faster review

## Keyboard Shortcuts (Review Mode)

- `0-5`: Rate current result
- `Enter`: Focus notes textarea
- `Cmd/Ctrl + Enter`: Save and go to next result
- `Arrow Keys`: Navigate between results

## Troubleshooting

### Backend won't start
- Ensure `ANTHROPIC_API_KEY` is set in `backend/.env`
- Check if port 3001 is available
- Run `npm install` in backend directory

### Frontend can't connect to backend
- Verify backend is running on port 3001
- Check `VITE_API_URL` in frontend `.env`
- Ensure CORS is enabled (already configured)

### CSV upload fails
- Ensure CSV has a `prompt` column (case-insensitive)
- Check file size (max 10MB)
- Verify CSV is properly formatted

### API rate limits
- Backend automatically retries with exponential backoff
- Check your Anthropic API usage limits
- Cached responses won't trigger API calls

## Tech Stack

**Backend:**
- Node.js + TypeScript
- Express.js
- AI SDK + Anthropic provider
- csv-parse

**Frontend:**
- React 19 + TypeScript
- Vite
- shadcn/ui + Radix UI
- Tailwind CSS
- React Markdown

## License

See LICENSE file for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
