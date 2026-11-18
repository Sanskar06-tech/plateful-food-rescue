import { createContext, useContext, useState, useCallback } from 'react';
import { api } from './api';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    try { return JSON.parse(localStorage.getItem('plateful-auth')); } catch { return null; }
  });
  const login = (data) => { localStorage.setItem('plateful-auth', JSON.stringify(data)); setAuth(data); };
  const logout = () => { localStorage.removeItem('plateful-auth'); setAuth(null); };
  // authenticated API call
  const call = useCallback((path, opts = {}) => api(path, { ...opts, token: auth?.token }), [auth]);
  return <Ctx.Provider value={{ user: auth?.user, login, logout, call }}>{children}</Ctx.Provider>;
}
