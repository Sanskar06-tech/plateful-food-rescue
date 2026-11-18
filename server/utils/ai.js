export const CATS = ['Cooked meal', 'Bakery', 'Dairy', 'Fresh produce', 'Packaged / other'];
const PRI = ['High', 'Medium', 'Low'];

// All AI features use Groq (OpenAI-compatible API). Key comes from server/.env
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = () => process.env.AI_MODEL || 'llama-3.3-70b-versatile';
export const aiEnabled = () => !!process.env.GROQ_API_KEY;

async function ask(system, messages, max = 500) {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key.trim()}` },
      body: JSON.stringify({
        model: MODEL(),
        max_tokens: max,
        temperature: 0.3,
        messages: [{ role: 'system', content: system }, ...messages],
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
    return data.choices?.[0]?.message?.content ?? null;
  } catch (e) {
    console.error('AI error:', e.message);
    return null;
  }
}

// pull the first JSON object/array out of the reply, even if the model adds extra words
const parse = (t) => {
  try {
    const m = t.replace(/```json|```/g, '').match(/[\[{][\s\S]*[\]}]/);
    return m ? JSON.parse(m[0]) : null;
  } catch { return null; }
};

// hours until the food is unsafe OR the pickup window closes, whichever is sooner
export const hoursLeft = (d) => {
  const bySafety = (d.safeHours ?? 24) - (Date.now() - new Date(d.createdAt)) / 36e5;
  const byDeadline = (new Date(d.pickupDeadline) - Date.now()) / 36e5;
  return Math.round(Math.min(bySafety, byDeadline) * 10) / 10;
};

/* ---------- 1. Food-safety analysis ---------- */
function ruleAnalysis(text) {
  const t = text.toLowerCase();
  const has = (...w) => w.some((x) => t.includes(x));
  if (has('rice', 'curry', 'dal', 'biryani', 'cooked', 'meal', 'roti', 'sabzi'))
    return { category: 'Cooked meal', safeHours: 4, tip: 'Keep covered and deliver within 4 hours. Reheat only once.' };
  if (has('bread', 'cake', 'biscuit', 'bun'))
    return { category: 'Bakery', safeHours: 24, tip: 'Keep dry and sealed. Check for mold before handing over.' };
  if (has('milk', 'curd', 'paneer', 'cheese'))
    return { category: 'Dairy', safeHours: 6, tip: 'Keep refrigerated until pickup.' };
  if (has('apple', 'banana', 'vegetable', 'fruit', 'tomato', 'potato'))
    return { category: 'Fresh produce', safeHours: 48, tip: 'Wash before eating and remove spoiled pieces.' };
  return { category: 'Packaged / other', safeHours: 72, tip: 'Check expiry date and packaging before donating.' };
}

export async function analyzeFood(text) {
  const out = await ask(
    'You are a food-safety assistant for a food donation charity. Reply with ONLY JSON: ' +
    '{"category": one of ' + JSON.stringify(CATS) + ', "safeHours": integer hours safe at room temperature, "tip": one short sentence}.',
    [{ role: 'user', content: text }], 250);
  const j = out && parse(out);
  // Authentic Intelligence: never trust AI output blindly - validate it
  if (j && CATS.includes(j.category) && Number.isFinite(j.safeHours) && j.safeHours >= 1 && j.safeHours <= 168 && typeof j.tip === 'string')
    return { category: j.category, safeHours: Math.round(j.safeHours), tip: j.tip.slice(0, 200), source: 'ai' };
  return { ...ruleAnalysis(text), source: 'rules' };
}

/* ---------- 2. AI-based prioritization ---------- */
function heuristic(d, area) {
  const a = (area || '').toLowerCase(), b = d.area.toLowerCase();
  const near = a && (b.includes(a) || a.includes(b));
  const h = d.hoursLeft;
  const score = (h < 2 ? 60 : h < 6 ? 40 : 20) + (near ? 30 : 0) + (d.phone ? 10 : 0);
  const priority = score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low';
  const reason = `${h}h left${near ? ', in your area' : ''}${d.phone ? ', donor reachable by phone' : ''}`;
  return { score, priority, reason };
}

export async function prioritize(list, area) {
  const base = list.map((d) => ({ id: String(d._id), ...heuristic(d, area) }));
  const text = await ask(
    'You rank surplus food donations for an NGO by urgency (hours left), distance (compare areas as text), and pickup feasibility (quantity, phone). ' +
    'Reply with ONLY a JSON array, most urgent first: [{"id": string, "priority": "High"|"Medium"|"Low", "reason": short sentence}]. Include every id once.',
    [{ role: 'user', content: JSON.stringify({ ngoArea: area, donations: list.map((d) => ({ id: String(d._id), food: d.food, category: d.category, quantity: d.quantity, area: d.area, hoursLeft: d.hoursLeft, hasPhone: !!d.phone })) }) }], 1000);
  const ai = text && parse(text);
  const byId = new Map(base.map((b) => [b.id, b]));
  const picked = [];
  if (Array.isArray(ai)) {
    for (const x of ai) {
      if (byId.has(x?.id) && PRI.includes(x.priority) && typeof x.reason === 'string' && !picked.find((p) => p.id === x.id))
        picked.push({ id: x.id, priority: x.priority, reason: x.reason.slice(0, 160), source: 'ai' });
    }
  }
  const rest = base.filter((b) => !picked.find((p) => p.id === b.id)).sort((a, b) => b.score - a.score)
    .map(({ id, priority, reason }) => ({ id, priority, reason, source: 'rules' }));
  return [...picked, ...rest];
}

/* ---------- 3. Chatbot ---------- */
export async function chat(messages) {
  const out = await ask(
    'You are Plateful Helper, a friendly assistant on a food donation website. Help with how to donate, how NGOs claim food, and basic food-safety advice. ' +
    'Keep answers under 80 words. If unsure about safety, advise discarding the food.',
    messages.slice(-10), 300);
  return out || 'The AI service is not reachable right now (check GROQ_API_KEY in server/.env). General tip: keep cooked food covered, deliver within 4 hours, and when in doubt, do not donate it.';
}