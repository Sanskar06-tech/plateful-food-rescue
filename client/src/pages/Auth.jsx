import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';

export default function Auth({ mode }) {
  const isReg = mode === 'register';
  const { login } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'donor', area: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const data = await api(isReg ? '/auth/register' : '/auth/login', { method: 'POST', body: f });
      login(data);
      nav('/');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <section className="mx-auto max-w-md">
      <h1 className="mb-4 text-3xl font-extrabold">{isReg ? 'Create your account' : 'Welcome back'}</h1>
      <form onSubmit={submit} className="grid gap-3 border-2 border-ink bg-white p-5">
        {isReg && (
          <>
            <label className="label">Name <input className="input" value={f.name} onChange={set('name')} required /></label>
            <label className="label">I am a
              <select className="input" value={f.role} onChange={set('role')}>
                <option value="donor">Donor (I have food to give)</option>
                <option value="ngo">NGO / volunteer (I collect food)</option>
              </select>
            </label>
            <label className="label">Your area <input className="input" value={f.area} onChange={set('area')} placeholder="e.g. Ramnagara" /></label>
          </>
        )}
        <label className="label">Email <input type="email" className="input" value={f.email} onChange={set('email')} required /></label>
        <label className="label">Password <input type="password" className="input" value={f.password} onChange={set('password')} required minLength={6} /></label>
        <button className="btn" disabled={busy}>{busy ? 'Please wait...' : isReg ? 'Sign up' : 'Log in'}</button>
        <p role="alert" className="min-h-5 text-sm font-semibold text-beet">{error}</p>
        <p className="text-sm">
          {isReg ? <>Already registered? <Link className="underline" to="/login">Log in</Link></> : <>New here? <Link className="underline" to="/register">Create an account</Link></>}
        </p>
      </form>
    </section>
  );
}
