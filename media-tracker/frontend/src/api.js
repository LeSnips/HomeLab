const BASE = '/api';

export async function fetchMedia(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') {
      query.append(k, String(v));
    }
  });
  const res = await fetch(`${BASE}/media?${query.toString()}`);
  if (!res.ok) throw new Error('Erreur chargement médiathèque');
  return res.json();
}

export async function searchExternal(category, q) {
  const res = await fetch(
    `${BASE}/search?category=${encodeURIComponent(category)}&q=${encodeURIComponent(q)}`
  );
  if (!res.ok) throw new Error('Erreur recherche API');
  return res.json();
}

export async function createMedia(payload) {
  const res = await fetch(`${BASE}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erreur création');
  return res.json();
}

export async function updateMedia(id, payload) {
  const res = await fetch(`${BASE}/media/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erreur mise à jour');
  return res.json();
}

export async function patchProgress(id, delta) {
  const res = await fetch(`${BASE}/media/${id}/progress`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delta }),
  });
  if (!res.ok) throw new Error('Erreur progression');
  return res.json();
}

export async function deleteMedia(id) {
  const res = await fetch(`${BASE}/media/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Erreur suppression');
  return res.json();
}

export async function patchMedia(id, payload) {
  const res = await fetch(`${BASE}/media/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erreur mise à jour rapide');
  return res.json();
}