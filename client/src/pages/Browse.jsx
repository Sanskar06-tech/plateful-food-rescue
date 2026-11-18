import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { api, fmt, CATS } from '../api';

const BADGE = { High: 'bg-beet text-white', Medium: 'bg-crate text-ink', Low: 'bg-line text-ink' };

export default function Browse() {
  const { user, call } = useAuth();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ranked, setRanked] = useState(false);

  // debounce the search box (400 ms)
  useEffect(() => { const t = setTimeout(() => setQ(search), 400); return () => clearTimeout(t); }, [search]);

  const load = async () => {
    setLoading(true); setError(''); setRanked(false);
    try {
      const p = new URLSearchParams({ search: q, category });
      setItems(await call('/donations?' + p));
      setStats(await api('/donations/stats'));
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [q, category, user]); // eslint-disable-line

  const prioritize = async () => {
    setLoading(true); setError('');
    try { setItems(await call('/ai/prioritize', { method: 'POST', body: { area: user.area || '' } })); setRanked(true); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  const request = async (id) => {
    try { await call(`/donations/${id}/request`, { method: 'POST' }); load(); } catch (e) { setError(e.message); }
  };

  return (
    <>
      <section className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Food that would be wasted, claimed in minutes.</h1>
        {stats && (
          <dl className="mt-4 flex flex-wrap gap-3">
            {[['Available now', stats.active], ['Delivered', stats.delivered], ['Total listed', stats.total]].map(([k, v]) => (
              <div key={k} className="border-2 border-ink bg-white px-4 py-2"><dd className="text-2xl font-extrabold">{v}</dd><dt className="text-sm">{k}</dt></div>
            ))}
          </dl>
        )}
      </section>

      <section aria-label="Search and filter" className="mb-4 flex flex-wrap gap-3">
        <label className="label flex-1 min-w-48">Search food, area or donor
          <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. biryani, Ramnagara" />
        </label>
        <label className="label">Category
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All</option>
            {CATS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        {user?.role === 'ngo' && (
          <button className="btn btn-dark self-end" onClick={prioritize} disabled={loading}>AI: prioritize for me</button>
        )}
      </section>

      {!user && <p className="mb-4 text-sm">Log in as an NGO to request food. <Link className="underline font-semibold" to="/login">Log in</Link></p>}
      {ranked && <p className="mb-4 text-sm font-semibold text-leaf">Ranked by urgency, distance and pickup feasibility.</p>}
      <p role="alert" className="mb-2 font-semibold text-beet">{error}</p>

      <section aria-live="polite" className="grid gap-3">
        {loading ? <p>Loading donations...</p> : items.length === 0 ? <p>No donations match right now.</p> : items.map((d) => (
          <article key={d._id} className="card">
            <div className="flex flex-wrap items-start gap-2">
              <h2 className="text-lg font-bold">{d.food}</h2>
              {d.priority && <span className={`px-2 text-xs font-bold leading-6 ${BADGE[d.priority]}`}>#{d.rank} {d.priority} priority</span>}
              <span className="ml-auto bg-ink px-2 text-xs leading-6 text-white">{d.category}</span>
            </div>
            <p className="text-sm text-ink/70">{d.quantity} · {d.area} · by {d.donorName}</p>
            <p className="text-sm">Pickup before <b>{fmt(d.pickupDeadline)}</b> · about <b>{d.hoursLeft}h</b> of safe time left</p>
            <p className="text-sm text-ink/70">{d.tip}</p>
            {d.reason && <p className="text-sm font-semibold text-leaf">Why: {d.reason}</p>}
            {d.phone && <p className="text-sm">Phone: {d.phone}</p>}
            {user?.role === 'ngo' && <button className="btn mt-3" onClick={() => request(d._id)}>Request pickup</button>}
          </article>
        ))}
      </section>
    </>
  );
}
