import { Router } from 'express';
import Donation from '../models/Donation.js';
import User from '../models/User.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { analyzeFood, hoursLeft } from '../utils/ai.js';

const router = Router();
const clean = (v) => String(v ?? '').trim();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const withHours = (d) => ({ ...d, hoursLeft: hoursLeft(d) });

// Step 2: browse + search (public; phone only visible to logged-in users)
router.get('/', optionalAuth, async (req, res) => {
  const { search = '', category = '' } = req.query;
  const q = { status: 'available', pickupDeadline: { $gt: new Date() } };
  if (category) q.category = clean(category);
  if (search) { const rx = new RegExp(esc(clean(search)), 'i'); q.$or = [{ food: rx }, { area: rx }, { donorName: rx }]; }
  const list = await Donation.find(q).sort({ pickupDeadline: 1 }).limit(100).lean();
  res.json(list.map((d) => ({ ...withHours(d), phone: req.user ? d.phone : undefined })));
});

router.get('/stats', async (_req, res) => {
  const [total, delivered, active] = await Promise.all([
    Donation.countDocuments(),
    Donation.countDocuments({ status: 'delivered' }),
    Donation.countDocuments({ status: 'available', pickupDeadline: { $gt: new Date() } }),
  ]);
  res.json({ total, delivered, active });
});

// Dashboard data: donor's own donations, or an NGO's requests
router.get('/mine', requireAuth(), async (req, res) => {
  const q = req.user.role === 'donor' ? { donor: req.user.id } : { requestedBy: req.user.id };
  res.json(await Donation.find(q).sort({ updatedAt: -1 }).lean());
});

// Step 1: donor posts surplus food (CREATE)
router.post('/', requireAuth('donor'), async (req, res) => {
  const b = req.body;
  const food = clean(b.food), quantity = clean(b.quantity), area = clean(b.area), phone = clean(b.phone);
  const pickupDeadline = new Date(b.pickupDeadline);
  if (!food || !quantity || !area) return res.status(400).json({ error: 'Food, quantity and area are required.' });
  if (isNaN(pickupDeadline) || pickupDeadline <= new Date()) return res.status(400).json({ error: 'Pickup deadline must be in the future.' });
  if (phone && !/^[0-9+\-\s]{7,20}$/.test(phone)) return res.status(400).json({ error: 'Enter a valid phone number.' });
  const donor = await User.findById(req.user.id);
  const ai = await analyzeFood(food);
  const d = await Donation.create({ donor: donor._id, donorName: donor.name, food, quantity, area, phone, pickupDeadline, category: ai.category, safeHours: ai.safeHours, tip: ai.tip });
  res.status(201).json(d);
});

// UPDATE (only while still available)
router.put('/:id', requireAuth('donor'), async (req, res) => {
  const upd = {};
  for (const k of ['quantity', 'area', 'phone']) if (req.body[k] !== undefined) upd[k] = clean(req.body[k]);
  if (req.body.pickupDeadline) {
    const dt = new Date(req.body.pickupDeadline);
    if (isNaN(dt) || dt <= new Date()) return res.status(400).json({ error: 'Pickup deadline must be in the future.' });
    upd.pickupDeadline = dt;
  }
  const d = await Donation.findOneAndUpdate({ _id: req.params.id, donor: req.user.id, status: 'available' }, upd, { new: true, runValidators: true });
  if (!d) return res.status(404).json({ error: 'Donation not found or no longer editable.' });
  res.json(d);
});

// DELETE (only while still available)
router.delete('/:id', requireAuth('donor'), async (req, res) => {
  const r = await Donation.deleteOne({ _id: req.params.id, donor: req.user.id, status: 'available' });
  if (!r.deletedCount) return res.status(404).json({ error: 'Donation not found or already requested.' });
  res.json({ ok: true });
});

// Step 4a: NGO requests a donation (atomic so two NGOs cannot take the same one)
router.post('/:id/request', requireAuth('ngo'), async (req, res) => {
  const ngo = await User.findById(req.user.id);
  const d = await Donation.findOneAndUpdate(
    { _id: req.params.id, status: 'available', pickupDeadline: { $gt: new Date() } },
    { status: 'requested', requestedBy: ngo._id, requestedByName: ngo.name }, { new: true });
  if (!d) return res.status(409).json({ error: 'This donation is no longer available.' });
  res.json(d);
});

// Step 4b: donor confirms or declines the request
router.post('/:id/respond', requireAuth('donor'), async (req, res) => {
  const accept = req.body.accept === true;
  const update = accept ? { status: 'confirmed' } : { status: 'available', $unset: { requestedBy: 1, requestedByName: 1 } };
  const d = await Donation.findOneAndUpdate({ _id: req.params.id, donor: req.user.id, status: 'requested' }, update, { new: true });
  if (!d) return res.status(404).json({ error: 'No pending request for this donation.' });
  res.json(d);
});

// Step 5: NGO tracks pickup and delivery (confirmed -> picked_up -> delivered)
router.post('/:id/status', requireAuth('ngo'), async (req, res) => {
  const next = clean(req.body.status);
  const from = { picked_up: 'confirmed', delivered: 'picked_up' }[next];
  if (!from) return res.status(400).json({ error: 'Status must be picked_up or delivered.' });
  const d = await Donation.findOneAndUpdate({ _id: req.params.id, requestedBy: req.user.id, status: from }, { status: next }, { new: true });
  if (!d) return res.status(409).json({ error: 'Cannot move this donation to that status.' });
  res.json(d);
});

export default router;
