require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');

const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '1mb' }));

// ── Rate Limiting ───────────────────────────────────────────────────────────
// Apply tighter limits on execution endpoints to prevent abuse
const executionLimiter = rateLimit({
  windowMs: 60 * 1000,      // 1 minute window
  max: 20,                   // max 20 execution requests per minute per IP
  message: { error: 'Too many execution requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/execute', executionLimiter);
app.use('/api/run-tests', executionLimiter);
app.use('/api/trace-execution', executionLimiter);

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api', apiRoutes);

// ── Health check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── Global error handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// ── MongoDB + Server Start ──────────────────────────────────────────────────
async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.warn('⚠️  MongoDB connection failed — running without persistence:', err.message);
    // Continue running without DB (for local dev without credentials)
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Cognito backend running at http://127.0.0.1:${PORT}`);
  });
}

start();
