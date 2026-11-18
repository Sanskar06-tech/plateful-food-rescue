import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Browse from './pages/Browse';
import Auth from './pages/Auth';
import Donate from './pages/Donate';
import Dashboard from './pages/Dashboard';
import Chat from './components/Chat';

function Navbar() {
  const { user, logout } = useAuth();
  return (
    <header className="bg-beet text-white">
      <nav aria-label="Main" className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-3">
        <Link to="/" className="text-2xl font-extrabold tracking-tight">Plateful</Link>
        <div className="ml-auto flex flex-wrap items-center gap-4 text-sm font-semibold">
          <Link to="/">Browse food</Link>
          {user?.role === 'donor' && <Link to="/donate">Donate</Link>}
          {user && <Link to="/dashboard">My dashboard</Link>}
          {user ? (
            <>
              <span className="opacity-80">{user.name} ({user.role === 'ngo' ? 'NGO' : 'Donor'})</span>
              <button className="btn btn-alt !py-1 text-ink" onClick={logout}>Log out</button>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/register" className="btn !py-1 text-ink">Sign up</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

function Private({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen font-sans">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Browse />} />
          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/register" element={<Auth mode="register" />} />
          <Route path="/donate" element={<Private role="donor"><Donate /></Private>} />
          <Route path="/dashboard" element={<Private><Dashboard /></Private>} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
      <footer className="border-t border-line py-6 text-center text-sm text-ink/70">
        Plateful - AI Powered Full Stack Development project
      </footer>
      {user && <Chat />}
    </div>
  );
}
