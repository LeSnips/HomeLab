import React, { useState, useEffect, useCallback } from 'react';
import {
  Tv,
  Film,
  Clapperboard,
  Book,
  Smartphone,
  BookOpen,
  LayoutGrid,
  Plus,
  Search,
} from 'lucide-react';
import { fetchMedia, createMedia, updateMedia, patchMedia, patchProgress, deleteMedia, syncSeasons } from './api';
import MediaCard from './components/MediaCard';
import MediaModal from './components/MediaModal';
import MediaDetailModal from './components/MediaDetailModal';

const NAV_ITEMS = [
  { id: 'all', label: 'Tout voir', icon: LayoutGrid },
  { id: 'anime', label: 'Animés', icon: Tv },
  { id: 'movie', label: 'Films', icon: Film },
  { id: 'series', label: 'Séries', icon: Clapperboard },
  { id: 'manga', label: 'Mangas', icon: BookOpen },
  { id: 'webtoon', label: 'Webtoons', icon: Smartphone },
  { id: 'book', label: 'Livres', icon: Book },
  { id: 'non_possede', label: 'Non possédé', color: 'bg-slate-700 hover:bg-slate-600' },
  { id: 'a_completer', label: 'À compléter', color: 'bg-amber-600 hover:bg-amber-700' },
  { id: 'termine', label: 'Terminé', color: 'bg-adobright hover:bg-blue-600' },
];

const STATUS_FILTERS = {
  anime: [
    { id: '', label: 'Tous' },
    { id: 'en_cours', label: 'En cours' },
    { id: 'termine', label: 'Terminé' },
    { id: 'envie', label: 'Envie' },
    { id: 'pause', label: 'Pause' },
  ],
  movie: [
    { id: '', label: 'Tous' },
    { id: 'envie', label: 'Envie' },
    { id: 'termine', label: 'Terminé' },
  ],
  series: [
    { id: '', label: 'Tous' },
    { id: 'en_cours', label: 'En cours' },
    { id: 'termine', label: 'Terminé' },
    { id: 'envie', label: 'Envie' },
    { id: 'pause', label: 'Pause' },
  ],
  webtoon: [
    { id: '', label: 'Tous' },
    { id: 'en_cours', label: 'En cours' },
    { id: 'termine', label: 'Terminé' },
    { id: 'pause', label: 'Pause' },
    { id: 'envie', label: 'Envie' },
  ],
};

export default function App() {
  const [category, setCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [ownedFilter, setOwnedFilter] = useState('');     // '', 'true', 'false'
  const [readFilter, setReadFilter] = useState('');       // '', 'true', 'false'
  const [wishlistFilter, setWishlistFilter] = useState(''); // '', 'true'
  const [search, setSearch] = useState('');

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const isCollectionTab = category === 'manga' || category === 'book';

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMedia({
        category,
        status: category === 'manga' ? ownedFilter : (!isCollectionTab ? statusFilter : ''),
        is_owned: category === 'book' ? ownedFilter : '',
        is_read: isCollectionTab ? readFilter : '',
        is_wishlist: isCollectionTab ? wishlistFilter : '',
        q: search,
      });
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [category, statusFilter, ownedFilter, readFilter, wishlistFilter, search, isCollectionTab]);

  useEffect(() => {
    const timer = setTimeout(loadItems, 180);
    return () => clearTimeout(timer);
  }, [loadItems]);

  const handleCategoryChange = (catId) => {
    setCategory(catId);
    setStatusFilter('');
    setOwnedFilter('');
    setReadFilter('');
    setWishlistFilter('');
  };

  const handleSave = async (payload) => {
    if (editingItem) {
      const updated = await updateMedia(editingItem.id, payload);
      setSelectedItem((prev) => (prev && prev.id === updated.id ? updated : prev));
    } else {
      await createMedia(payload);
    }
    await loadItems();
  };

  const handleDelete = async (id) => {
    await deleteMedia(id);
    setModalOpen(false);
    setEditingItem(null);
    setSelectedItem(null);
    await loadItems();
  };

  const handleStepProgress = async (id, delta) => {
    const updated = await patchProgress(id, delta);
    setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
  };

  const handleQuickUpdate = async (id, partialPayload) => {
    const updated = await patchMedia(id, partialPayload);
    setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
    setSelectedItem((prev) => (prev && prev.id === id ? updated : prev));
  };

  const handleSyncSeasons = async (id) => {
  const updated = await syncSeasons(id);
  setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
  setSelectedItem((prev) => (prev && prev.id === id ? updated : prev));
};

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-night text-slate-100">
      {/* Sidebar */}
      <aside className="w-full md:w-60 bg-surface border-b md:border-b-0 md:border-r border-borderdark p-4 flex flex-col gap-6 shrink-0">
        <div className="flex items-center justify-between md:justify-start gap-3 px-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violetmain to-adoblue flex items-center justify-center font-bold text-white shadow-lg shadow-violetmain/20">
            MT
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-white">MyTracker</h1>
            <p className="text-[11px] text-slate-400">Homelab Edition</p>
          </div>
        </div>

        <nav className="flex md:flex-col gap-1 overflow-x-auto pb-1 md:pb-0">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = category === id;
            return (
              <button
                key={id}
                onClick={() => handleCategoryChange(id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition ${
                  active
                    ? 'bg-gradient-to-r from-violetmain/20 to-adoblue/30 text-white border border-violetmain/40'
                    : 'text-slate-400 hover:text-white hover:bg-night/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-violetmain' : ''}`} />
                {label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 p-5 md:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Barre du haut : recherche + bouton Ajouter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrer ma bibliothèque..."
              className="w-full bg-surface border border-borderdark rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violetmain"
            />
          </div>

          <button
            onClick={() => {
              setEditingItem(null);
              setModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violetmain hover:bg-violethover text-white text-sm font-semibold shadow-lg shadow-violetmain/20 transition"
          >
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>

        {/* Barre de filtres selon la catégorie */}
        {STATUS_FILTERS[category] && (
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS[category].map((f) => (
              <button
                key={f.id || 'all'}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition ${
                  statusFilter === f.id
                    ? 'bg-adobright border-adobright text-white'
                    : 'bg-surface border-borderdark text-slate-300 hover:border-violetmain'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Filtres combinables pour Livres & Mangas */}
        {isCollectionTab && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={ownedFilter}
              onChange={(e) => setOwnedFilter(e.target.value)}
              className="bg-surface border border-borderdark rounded-full px-3.5 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-violetmain"
            >
              {category === 'manga' ? (
                <>
                  <option value="">Possession : Tous</option>
                  <option value="a_completer">À compléter</option>
                  <option value="termine">Terminé</option>
                  <option value="non_possede">Non possédé</option>
                </>
              ) : (
                <>
                  <option value="">Possession : Tous</option>
                  <option value="true">Possédé</option>
                  <option value="false">Non possédé</option>
                </>
              )}
            </select>

            <select
              value={readFilter}
              onChange={(e) => setReadFilter(e.target.value)}
              className="bg-surface border border-borderdark rounded-full px-3.5 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-violetmain"
            >
              <option value="">Lecture : Tous</option>
              <option value="true">Lu</option>
              <option value="false">Non lu</option>
            </select>

            <button
              onClick={() => setWishlistFilter(wishlistFilter === 'true' ? '' : 'true')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition ${
                wishlistFilter === 'true'
                  ? 'bg-violetmain border-violetmain text-white'
                  : 'bg-surface border-borderdark text-slate-300 hover:border-violetmain'
              }`}
            >
              Envie uniquement
            </button>
          </div>
        )}

        {/* Grille de cartes */}
        {loading ? (
          <div className="text-center py-20 text-slate-400 text-sm">Chargement...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 bg-surface/50 border border-dashed border-borderdark rounded-2xl">
            <p className="text-slate-400 text-sm mb-3">Aucune œuvre dans cette vue pour l'instant.</p>
            <button
              onClick={() => {
                setEditingItem(null);
                setModalOpen(true);
              }}
              className="px-4 py-2 rounded-lg bg-adoblue hover:bg-adobright text-white text-xs font-semibold"
            >
              + Ajouter ma première œuvre
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {items.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                onEdit={(it) => setSelectedItem(it)}
                onStepProgress={handleStepProgress}
              />
            ))}
          </div>
        )}
      </main>

      <MediaDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onOpenEdit={(it) => {
          setEditingItem(it);
          setModalOpen(true);
        }}
        onQuickUpdate={handleQuickUpdate}
      />
      <MediaModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingItem(null);
        }}
        initialItem={editingItem}
        defaultCategory={category}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}