import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { evaluateRouter } from './routes/evaluate.js';

const app = express();

app.use(cors({ origin: config.corsOrigin.split(',').map((o) => o.trim()) }));
app.use(express.json({ limit: '100kb' }));

// Evaluations call an external LLM and can be slow/costly; limit abuse.
const evaluateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many evaluation requests. Please try again later.' },
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', evaluateLimiter, evaluateRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(config.port, () => {
  console.log(`github-repo-evaluator server listening on http://localhost:${config.port}`);
});
