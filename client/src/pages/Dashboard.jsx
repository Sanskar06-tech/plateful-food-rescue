import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { fmt, STATUS } from '../api';

const COLOR = { available: 'bg-line', requested: 'bg-crate', confirmed: 'bg-leaf text-white', picked_up: 'bg-beet text-white', delivered: 'bg-ink text-white' };

export default function Dashboard() {
  const { user, call } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isDonor = user.role === 'donor';

  const load = async () => {
    setError('');
    try { setItems(await call('/donations/mine')); } catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const act = async (path, opts) => {
    try { await call(path, opts); load(); } catch (e) { setError(e.message); }
  };
  const done = items.filter((d) => d.status === 'delivered').length;

  return (
    <>
      <h1 className="text-3xl font-extrabold">{isDonor ? 'My donations' : 'My pickup requests'}</h1>
      <p className="mb-4 text-sm">Completed donations: <b>{done}</b> of {items.length}</p>
      <p role="alert" className="mb-2 font-semibold text-beet">{error}</p>
      <section aria-live="polite" className="grid gap-3">
        {loading ? <p>Loading...</p> : items.length === 0 ? <p>Nothing here yet.</p> : items.map((d) => (
          <article key={d._id} className="card">
            <div className="flex flex-wrap gap-2">
              <h2 className="text-lg font-bold">{d.food}</h2>
              <span className={`ml-auto px-2 text-xs font-bold leading-6 ${COLOR[d.status]}`}>{STATUS[d.status]}</span>
            </div>
            <p className="text-sm text-ink/70">{d.quantity} · {d.area} · pickup before {fmt(d.pickupDeadline)}</p>
            {isDonor && d.requestedByName && <p className="text-sm">Requested by <b>{d.requestedByName}</b></p>}
            {!isDonor && <p className="text-sm">Donor: {d.donorName}{d.phone ? ` · ${d.phone}` : ''}</p>}

            <div className="mt-3 flex flex-wrap gap-2">
              {isDonor && d.status === 'requested' && (
                <>
                  <button className="btn" onClick={() => act(`/donations/${d._id}/respond`, { method: 'POST', body: { accept: true } })}>Confirm</button>
                  <button className="btn btn-alt" onClick={() => act(`/donations/${d._id}/respond`, { method: 'POST', body: { accept: false } })}>Decline</button>
                </>
              )}
              {isDonor && d.status === 'available' && (
                <button className="btn btn-alt" onClick={() => act(`/donations/${d._id}`, { method: 'DELETE' })}>Delete</button>
              )}
              {!isDonor && d.status === 'confirmed' && (
                <button className="btn" onClick={() => act(`/donations/${d._id}/status`, { method: 'POST', body: { status: 'picked_up' } })}>Mark picked up</button>
              )}
              {!isDonor && d.status === 'picked_up' && (
                <button className="btn" onClick={() => act(`/donations/${d._id}/status`, { method: 'POST', body: { status: 'delivered' } })}>Mark delivered</button>
              )}
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
