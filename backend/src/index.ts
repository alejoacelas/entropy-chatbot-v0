import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import evaluationRoutes from './routes/evaluation.js';
import { StorageFactory } from './storage/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// In production (autoscale), PORT is provided by Replit
// In development, default to 3001
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', evaluationRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// In production/deployment, serve the built frontend static files
if (process.env.REPLIT_DEPLOYMENT) {
  const distPath = path.join(__dirname, '../../dist');
  app.use(express.static(distPath));
  
  // Serve index.html for all non-API routes (SPA support)
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`AI Evaluation Backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Evaluation endpoint: http://localhost:${PORT}/api/evaluate`);
  
  if (process.env.REPLIT_DEPLOYMENT) {
    console.log('Running in deployment mode - serving frontend static files');
  }
  
  // Initialize storage to trigger environment detection log
  StorageFactory.getStorage();
});
