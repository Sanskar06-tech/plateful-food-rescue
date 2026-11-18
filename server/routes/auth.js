import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { sign, requireAuth } from '../middleware/auth.js';

const router = Router();
const clean = (v) => String(v ?? '').trim();
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

router.post('/register', async (req, res) => {
  const name = clean(req.body.name), email = clean(req.body.email).toLowerCase();
  const password = String(req.body.password ?? ''), role = clean(req.body.role) || 'donor', area = clean(req.body.area);
  if (!name) return res.status(400).json({ error: 'Name is required.' });
  if (!emailOk(email)) return res.status(400).json({ error: 'Enter a valid email.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  if (!['donor', 'ngo'].includes(role)) return res.status(400).json({ error: 'Role must be donor or ngo.' });
  if (await User.findOne({ email })) return res.status(409).json({ error: 'Email already registered.' });
  const user = await User.create({ name, email, role, area, password: await bcrypt.hash(password, 10) });
  res.status(201).json({ token: sign(user), user });
});

router.post('/login', async (req, res) => {
  const email = clean(req.body.email).toLowerCase();
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(String(req.body.password ?? ''), user.password)))
    return res.status(401).json({ error: 'Wrong email or password.' });
  res.json({ token: sign(user), user });
});

router.get('/me', requireAuth(), async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json(user);
});

export default router;
