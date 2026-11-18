import { Router } from 'express';
import Donation from '../models/Donation.js';
import { requireAuth } from '../middleware/auth.js';
import { analyzeFood, prioritize, chat, hoursLeft, aiEnabled } from '../utils/ai.js';

const router = Router();

// quick check that the Groq key is loaded: GET /api/ai/status
router.get('/status', (_req, res) => res.json({ provider: 'groq', live: aiEnabled() }));

router.post('/analyze', requireAuth(), async (req, res) => {
  const text = String(req.body.text ?? '').trim();
  if (!text) return res.status(400).json({ error: 'Describe the food first.' });
  res.json(await analyzeFood(text.slice(0, 300)));
});

// Step 3: AI-based prioritization for NGOs
router.post('/prioritize', requireAuth('ngo'), async (req, res) => {
  const area = String(req.body.area ?? '').trim();
  const raw = await Donation.find({ status: 'available', pickupDeadline: { $gt: new Date() } }).limit(30).lean();
  const list = raw.map((d) => ({ ...d, hoursLeft: hoursLeft(d) })).filter((d) => d.hoursLeft > 0);
  const ranking = await prioritize(list, area);
  const byId = new Map(list.map((d) => [String(d._id), d]));
  res.json(ranking.map((r, i) => ({ ...byId.get(r.id), rank: i + 1, priority: r.priority, reason: r.reason, source: r.source })));
});

router.post('/chat', requireAuth(), async (req, res) => {
  const msgs = (Array.isArray(req.body.messages) ? req.body.messages : [])
    .filter((m) => ['user', 'assistant'].includes(m?.role) && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, 500) }));
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return res.status(400).json({ error: 'Send a message first.' });
  res.json({ reply: await chat(msgs) });
});

export default router;