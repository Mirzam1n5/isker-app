const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// ─── Storage: Upstash Redis (free tier) or in-memory fallback ──────
// Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Render env vars.
// Get them free at https://upstash.com → create Redis DB → REST API tab.
const UPSTASH_URL   = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const REDIS_KEY     = 'isker_sheets';

async function redisGet() {
  if (!UPSTASH_URL) return null;
  const res = await fetch(`${UPSTASH_URL}/get/${REDIS_KEY}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
  });
  const json = await res.json();
  return json.result ? JSON.parse(json.result) : null;
}

async function redisSet(value) {
  if (!UPSTASH_URL) return;
  await fetch(`${UPSTASH_URL}/set/${REDIS_KEY}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(["SET", REDIS_KEY, JSON.stringify(value)])
  });
}

// In-memory fallback
let extraSheets = [];

(async () => {
  try {
    const stored = await redisGet();
    if (Array.isArray(stored)) {
      extraSheets = stored;
      console.log(`✓ Loaded ${extraSheets.length} sheets from Redis`);
    }
  } catch (e) {
    console.warn('Redis unavailable, using in-memory store:', e.message);
  }
})();

// ─── Middleware ─────────────────────────────────────────────────
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ─── API ────────────────────────────────────────────────────────
app.get('/api/sheets', (req, res) => res.json(extraSheets));

app.post('/api/sheets', async (req, res) => {
  const { id, label } = req.body;
  if (!id || !label) return res.status(400).json({ error: 'Missing id or label' });
  if (extraSheets.some(s => s.id === id))
    return res.status(409).json({ error: 'Sheet already exists' });
  extraSheets.push({ id, label });
  await redisSet(extraSheets);
  res.status(201).json({ id, label });
});

app.delete('/api/sheets/:id', async (req, res) => {
  const { id } = req.params;
  const before = extraSheets.length;
  extraSheets = extraSheets.filter(s => s.id !== id);
  if (extraSheets.length === before)
    return res.status(404).json({ error: 'Sheet not found' });
  await redisSet(extraSheets);
  res.json({ success: true });
});

// ─── Static + SPA ───────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'dist'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js'))   res.setHeader('Content-Type', 'application/javascript');
    if (filePath.endsWith('.css'))  res.setHeader('Content-Type', 'text/css');
    if (filePath.endsWith('.json')) res.setHeader('Content-Type', 'application/json');
  }
}));

app.get('*', (req, res) =>
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
);

app.listen(PORT, () => console.log(`ISKER running on port ${PORT}`));
