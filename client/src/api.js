const BASE = import.meta.env.VITE_API_URL || '/api';

export async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) throw new Error(data?.error || 'Request failed (' + res.status + ')');
  return data;
}

export const fmt = (d) => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
export const CATS = ['Cooked meal', 'Bakery', 'Dairy', 'Fresh produce', 'Packaged / other'];
export const STATUS = { available: 'Available', requested: 'Requested', confirmed: 'Confirmed', picked_up: 'Picked up', delivered: 'Delivered' };
