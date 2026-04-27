// In-memory rate limiter: max 30 requests per hour per IP
const rateLimit = new Map();
const LIMIT = 30;
const WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const timestamps = (rateLimit.get(ip) || []).filter(t => now - t < WINDOW_MS);
  if (timestamps.length >= LIMIT) return false;
  timestamps.push(now);
  rateLimit.set(ip, timestamps);
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: { message: 'Слишком много запросов. Попробуй через час.' } });
  }

  const { system, messages } = req.body;
  if (!system || !messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: { message: 'Неверный формат запроса' } });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system,
        messages,
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    res.json({ text: data.content[0].text });
  } catch (err) {
    res.status(500).json({ error: { message: err.message } });
  }
}
