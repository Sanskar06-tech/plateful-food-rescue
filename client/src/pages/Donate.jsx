import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Donate() {
  const { user, call } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ food: '', quantity: '', area: user.area || '', phone: '', pickupDeadline: '' });
  const [ai, setAi] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const minDate = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16);

  const check = async () => {
    setError('');
    try { setAi(await call('/ai/analyze', { method: 'POST', body: { text: f.food } })); } catch (e) { setError(e.message); }
  };
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await call('/donations', { method: 'POST', body: { ...f, pickupDeadline: new Date(f.pickupDeadline).toISOString() } });
      nav('/dashboard');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <section className="mx-auto max-w-lg">
      <h1 className="mb-4 text-3xl font-extrabold">Donate surplus food</h1>
      <form onSubmit={submit} className="grid gap-3 border-2 border-ink bg-white p-5">
        <label className="label">What food is it?
          <textarea className="input" rows={2} value={f.food} onChange={set('food')} required placeholder="e.g. 20 boxes of veg biryani from a wedding" />
        </label>
        <label className="label">Quantity <input className="input" value={f.quantity} onChange={set('quantity')} required placeholder="e.g. 20 boxes" /></label>
        <label className="label">Pickup area <input className="input" value={f.area} onChange={set('area')} required /></label>
        <label className="label">Pickup deadline <input type="datetime-local" min={minDate} className="input" value={f.pickupDeadline} onChange={set('pickupDeadline')} required /></label>
        <label className="label">Phone (optional) <input type="tel" className="input" value={f.phone} onChange={set('phone')} /></label>
        <button type="button" className="btn btn-alt" onClick={check} disabled={!f.food.trim()}>Check food safety with AI</button>
        {ai && <p className="border-l-4 border-leaf bg-leaf/10 p-2 text-sm"><b>{ai.category}</b>: safe for about {ai.safeHours} hours. {ai.tip} <i>({ai.source === 'ai' ? 'AI' : 'rule-based'})</i></p>}
        <button className="btn" disabled={busy}>{busy ? 'Listing...' : 'List this donation'}</button>
        <p role="alert" className="min-h-5 text-sm font-semibold text-beet">{error}</p>
      </form>
    </section>
  );
}
