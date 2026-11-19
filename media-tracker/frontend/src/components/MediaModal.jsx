import React, { useState, useEffect } from 'react';
import { X, Search, Trash2, Loader2, Check } from 'lucide-react';
import { searchExternal } from '../api';

const CATEGORIES = [
  { id: 'anime', label: 'Animé' },
  { id: 'movie', label: 'Film' },
  { id: 'series', label: 'Série' },
  { id: 'book', label: 'Livre' },
  { id: 'webtoon', label: 'Webtoon / Manhwa' },
  { id: 'manga', label: 'Manga' },
];

const STATUS_BY_CATEGORY = {
  anime: [
    { id: 'en_cours', label: 'En cours' },
    { id: 'termine', label: 'Terminé' },
    { id: 'envie', label: 'Envie' },
    { id: 'pause', label: 'Pause' },
  ],
  movie: [
    { id: 'envie', label: 'Envie' },
    { id: 'termine', label: 'Terminé' },
  ],
  series: [
    { id: 'en_cours', label: 'En cours' },
    { id: 'termine', label: 'Terminé' },
    { id: 'envie', label: 'Envie' },
    { id: 'pause', label: 'Pause' },
  ],
  webtoon: [
    { id: 'en_cours', label: 'En cours' },
    { id: 'termine', label: 'Terminé' },
    { id: 'pause', label: 'Pause' },
    { id: 'envie', label: 'Envie' },
  ],
};

const EMPTY_FORM = {
  category: 'anime',
  title: '',
  original_title: '',
  cover_url: '',
  synopsis: '',
  release_year: '',
  external_id: '',
  external_source: 'manual',
  status: 'en_cours',
  is_owned: false,
  is_wishlist: false,
  is_read: false,
  current_progress: 0,
  total_progress: '',
  current_season: 1,
  owned_volumes: [],
  total_volumes: '',
  rating: '',
  notes: '',
};

export default function MediaModal({ isOpen, onClose, initialItem, defaultCategory, onSave, onDelete }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [apiQuery, setApiQuery] = useState('');
  const [apiResults, setApiResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [rangeEnd, setRangeEnd] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setApiQuery('');
    setApiResults([]);
    setRangeEnd('');

    if (initialItem) {
      setForm({
        ...EMPTY_FORM,
        ...initialItem,
        release_year: initialItem.release_year ?? '',
        total_progress: initialItem.total_progress ?? '',
        total_volumes: initialItem.total_volumes ?? '',
        rating: initialItem.rating ?? '',
        owned_volumes: initialItem.owned_volumes || [],
      });
    } else {
      const cat = defaultCategory && defaultCategory !== 'all' ? defaultCategory : 'anime';
      setForm({
        ...EMPTY_FORM,
        category: cat,
        status: cat === 'movie' ? 'envie' : STATUS_BY_CATEGORY[cat] ? 'en_cours' : null,
      });
    }
  }, [isOpen, initialItem, defaultCategory]);

  if (!isOpen) return null;

  const isCollection = form.category === 'manga' || form.category === 'book';
  const statusOptions = STATUS_BY_CATEGORY[form.category] || [];

  const handleSearchApi = async (e) => {
    e.preventDefault();
    if (!apiQuery.trim()) return;
    setSearching(true);
    try {
      const data = await searchExternal(form.category, apiQuery.trim());
      setApiResults(data);
    } catch {
      setApiResults([]);
    } finally {
      setSearching(false);
    }
  };

  const applyApiResult = (res) => {
    setForm((prev) => ({
      ...prev,
      title: res.title || prev.title,
      original_title: res.original_title || '',
      cover_url: res.cover_url || '',
      synopsis: res.synopsis || '',
      release_year: res.release_year ?? '',
      external_id: res.external_id || '',
      external_source: res.external_source || 'manual',
      total_progress: res.total_progress ?? '',
      total_volumes: res.total_volumes ?? '',
    }));
    setApiResults([]);
  };

  const toggleVolume = (volNum) => {
    setForm((prev) => {
      const exists = prev.owned_volumes.includes(volNum);
      const next = exists
        ? prev.owned_volumes.filter((v) => v !== volNum)
        : [...prev.owned_volumes, volNum].sort((a, b) => a - b);
      return { ...prev, owned_volumes: next, is_owned: next.length > 0 };
    });
  };

  const applyVolumeRange = () => {
    const n = parseInt(rangeEnd, 10);
    if (!n || n < 1 || n > 250) return;
    const range = Array.from({ length: n }, (_, i) => i + 1);
    setForm((prev) => {
      const merged = Array.from(new Set([...prev.owned_volumes, ...range])).sort((a, b) => a - b);
      return { ...prev, owned_volumes: merged, is_owned: merged.length > 0 };
    });
    setRangeEnd('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await onSave({
        ...form,
        status: isCollection ? null : form.status,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const maxDisplayedVolumes = Math.max(
    Number(form.total_volumes) || 0,
    ...(form.owned_volumes.length ? form.owned_volumes : [0]),
    12
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-surface border border-borderdark rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-borderdark">
          <h2 className="text-lg font-bold text-white">
            {initialItem ? 'Modifier la fiche' : 'Ajouter une œuvre'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-night"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Sélecteur de catégorie + Recherche API hybride */}
          <div className="bg-night/70 border border-borderdark rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      category: c.id,
                      status:
                        c.id === 'movie'
                          ? 'envie'
                          : STATUS_BY_CATEGORY[c.id]
                          ? prev.status || 'en_cours'
                          : null,
                    }))
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    form.category === c.id
                      ? 'bg-violetmain text-white'
                      : 'bg-surface text-slate-300 hover:text-white border border-borderdark'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSearchApi} className="flex gap-2">
              <input
                type="text"
                value={apiQuery}
                onChange={(e) => setApiQuery(e.target.value)}
                placeholder="Rechercher via API (AniList / TMDB / Google Books) pour pré-remplir..."
                className="flex-1 bg-surface border border-borderdark rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violetmain"
              />
              <button
                type="submit"
                disabled={searching}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-adoblue hover:bg-adobright text-white text-sm font-medium transition disabled:opacity-50"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Chercher
              </button>
            </form>

            {apiResults.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pt-1">
                {apiResults.map((r) => (
                  <button
                    key={`${r.external_source}-${r.external_id}`}
                    type="button"
                    onClick={() => applyApiResult(r)}
                    className="flex items-center gap-3 p-2 rounded-lg bg-surface border border-borderdark hover:border-violetmain text-left transition"
                  >
                    {r.cover_url ? (
                      <img src={r.cover_url} alt="" className="w-10 h-14 object-cover rounded" />
                    ) : (
                      <div className="w-10 h-14 bg-night rounded" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{r.title}</p>
                      <p className="text-[11px] text-slate-400">
                        {r.release_year || '—'} · {r.external_source}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Formulaire principal (100 % modifiable) */}
          <form id="media-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Titre *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-night border border-borderdark rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violetmain"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Titre original / Auteur</label>
                <input
                  value={form.original_title || ''}
                  onChange={(e) => setForm({ ...form, original_title: e.target.value })}
                  className="w-full bg-night border border-borderdark rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violetmain"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">URL de l'affiche</label>
                <input
                  value={form.cover_url || ''}
                  onChange={(e) => setForm({ ...form, cover_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-night border border-borderdark rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violetmain"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Année</label>
                <input
                  type="number"
                  value={form.release_year}
                  onChange={(e) => setForm({ ...form, release_year: e.target.value })}
                  className="w-full bg-night border border-borderdark rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violetmain"
                />
              </div>
            </div>

            {/* Statuts pour Animé / Film / Série / Webtoon */}
            {!isCollection && (
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Statut</label>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setForm({ ...form, status: st.id })}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        form.status === st.id
                          ? 'bg-adobright border-adobright text-white'
                          : 'bg-night border-borderdark text-slate-300 hover:border-violetmain'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* États cumulables pour Livres & Mangas */}
            {isCollection && (
              <div className="space-y-2">
                <label className="block text-xs text-slate-400">
                  États (cumulables : ex. Possédé + Non lu, ou Non possédé + Lu)
                </label>
                <div className="flex flex-wrap gap-2">
                  {form.category === 'book' && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, is_owned: !form.is_owned })}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        form.is_owned
                          ? 'bg-adoblue border-adobright text-white'
                          : 'bg-night border-borderdark text-slate-400'
                      }`}
                    >
                      {form.is_owned && <Check className="w-3.5 h-3.5" />} Possédé
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, is_read: !form.is_read })}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      form.is_read
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-night border-borderdark text-slate-400'
                    }`}
                  >
                    {form.is_read && <Check className="w-3.5 h-3.5" />}
                    {form.is_read ? 'Lu' : 'Non lu'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, is_wishlist: !form.is_wishlist })}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      form.is_wishlist
                        ? 'bg-violetmain border-violetmain text-white'
                        : 'bg-night border-borderdark text-slate-400'
                    }`}
                  >
                    {form.is_wishlist && <Check className="w-3.5 h-3.5" />} Envie
                  </button>
                </div>
              </div>
            )}

            {/* Progression (Épisodes ou Chapitres) */}
            {form.category !== 'movie' && form.category !== 'book' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {form.category === 'series' && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Saison actuelle</label>
                    <input
                      type="number"
                      min="1"
                      value={form.current_season}
                      onChange={(e) => setForm({ ...form, current_season: e.target.value })}
                      className="w-full bg-night border border-borderdark rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violetmain"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    {form.category === 'manga' || form.category === 'webtoon'
                      ? 'Chapitres lus'
                      : 'Épisodes vus'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.current_progress}
                    onChange={(e) => setForm({ ...form, current_progress: e.target.value })}
                    className="w-full bg-night border border-borderdark rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violetmain"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    {form.category === 'manga' || form.category === 'webtoon'
                      ? 'Total chapitres'
                      : 'Total épisodes'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.total_progress}
                    onChange={(e) => setForm({ ...form, total_progress: e.target.value })}
                    className="w-full bg-night border border-borderdark rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violetmain"
                  />
                </div>
              </div>
            )}

            {/* Gestion spécifique des TOMES POSSÉDÉS pour les Mangas */}
            {form.category === 'manga' && (
              <div className="bg-night/70 border border-borderdark rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-white">
                      Tomes possédés ({form.owned_volumes.length})
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Indépendant des chapitres lus — clique sur chaque tome que tu possèdes.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="Total tomes"
                      value={form.total_volumes}
                      onChange={(e) => setForm({ ...form, total_volumes: e.target.value })}
                      className="w-28 bg-surface border border-borderdark rounded-lg px-2.5 py-1 text-xs text-white"
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="1 à N..."
                      value={rangeEnd}
                      onChange={(e) => setRangeEnd(e.target.value)}
                      className="w-20 bg-surface border border-borderdark rounded-lg px-2.5 py-1 text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={applyVolumeRange}
                      className="px-2.5 py-1 rounded-lg bg-adoblue hover:bg-adobright text-xs font-medium text-white"
                    >
                      Cocher 1→N
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {Array.from({ length: Math.min(maxDisplayedVolumes, 150) }, (_, i) => i + 1).map(
                    (num) => {
                      const owned = form.owned_volumes.includes(num);
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => toggleVolume(num)}
                          className={`py-1.5 rounded-md text-xs font-semibold border transition ${
                            owned
                              ? 'bg-adobright border-adobright text-white'
                              : 'bg-surface border-borderdark text-slate-400 hover:border-violetmain'
                          }`}
                        >
                          T.{num}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            )}

            {/* Note + Synopsis + Notes personnelles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Note (/10)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="10"
                  value={form.rating}
                  onChange={(e) => setForm({ ...form, rating: e.target.value })}
                  className="w-full bg-night border border-borderdark rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violetmain"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Notes perso</label>
                <input
                  value={form.notes || ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Avis, édition collector, etc."
                  className="w-full bg-night border border-borderdark rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violetmain"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Synopsis</label>
              <textarea
                rows="3"
                value={form.synopsis || ''}
                onChange={(e) => setForm({ ...form, synopsis: e.target.value })}
                className="w-full bg-night border border-borderdark rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violetmain"
              />
            </div>
          </form>
        </div>

        {/* Pied de modale */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-borderdark bg-night/50">
          {initialItem ? (
            <button
              type="button"
              onClick={() => onDelete(initialItem.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10 transition"
            >
              <Trash2 className="w-4 h-4" /> Supprimer
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:text-white"
            >
              Annuler
            </button>
            <button
              type="submit"
              form="media-form"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-violetmain hover:bg-violethover text-white text-sm font-semibold transition disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}