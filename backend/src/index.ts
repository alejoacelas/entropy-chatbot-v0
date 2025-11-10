import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import evaluationRoutes from './routes/evaluation.js';
import { StorageFactory } from './storage/index.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', evaluationRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`AI Evaluation Backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Evaluation endpoint: http://localhost:${PORT}/api/evaluate`);
  
  // Initialize storage to trigger environment detection log
  StorageFactory.getStorage();
});
