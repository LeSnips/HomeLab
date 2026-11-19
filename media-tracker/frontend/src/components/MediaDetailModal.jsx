import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Bookmark,
  ChevronDown,
  Check,
  Plus,
  Minus,
  Star,
  BookOpen,
  Library,
  Heart,
  Trash2,
} from 'lucide-react';

const STATUS_BY_CATEGORY = {
  anime: [
    { id: 'en_cours', label: 'En cours', color: 'bg-emerald-500 hover:bg-emerald-600' },
    { id: 'termine', label: 'Terminé', color: 'bg-adobright hover:bg-blue-600' },
    { id: 'envie', label: 'Envie', color: 'bg-violetmain hover:bg-violethover' },
    { id: 'pause', label: 'Pause', color: 'bg-amber-600 hover:bg-amber-700' },
  ],
  movie: [
    { id: 'envie', label: 'Envie', color: 'bg-violetmain hover:bg-violethover' },
    { id: 'termine', label: 'Terminé', color: 'bg-emerald-500 hover:bg-emerald-600' },
  ],
  series: [
    { id: 'en_cours', label: 'En cours', color: 'bg-emerald-500 hover:bg-emerald-600' },
    { id: 'termine', label: 'Terminé', color: 'bg-adobright hover:bg-blue-600' },
    { id: 'envie', label: 'Envie', color: 'bg-violetmain hover:bg-violethover' },
    { id: 'pause', label: 'Pause', color: 'bg-amber-600 hover:bg-amber-700' },
  ],
  webtoon: [
    { id: 'en_cours', label: 'En cours', color: 'bg-emerald-500 hover:bg-emerald-600' },
    { id: 'termine', label: 'Terminé', color: 'bg-adobright hover:bg-blue-600' },
    { id: 'pause', label: 'Pause', color: 'bg-amber-600 hover:bg-amber-700' },
    { id: 'envie', label: 'Envie', color: 'bg-violetmain hover:bg-violethover' },
  ],
};

export default function MediaDetailModal({ item, onClose, onOpenEdit, onQuickUpdate }) {
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [activeSeason, setActiveSeason] = useState(1);
  const [addingSeason, setAddingSeason] = useState(false);
  const [newSeasonEps, setNewSeasonEps] = useState(12);
  const [volRangeEnd, setVolRangeEnd] = useState('');

  useEffect(() => {
    setStatusMenuOpen(false);
    setAddingSeason(false);
    if (item?.seasons_data?.length > 0) {
      setActiveSeason(item.seasons_data[0].season);
    } else {
      setActiveSeason(1);
    }
  }, [item?.id]);

  if (!item) return null;

  const isCollection = item.category === 'manga' || item.category === 'book';
  const isEpisodic = item.category === 'anime' || item.category === 'series';
  const statusList = STATUS_BY_CATEGORY[item.category] || [];
  const currentStatus =
    statusList.find((s) => s.id === item.status) ||
    statusList[0] || { label: 'Statut', color: 'bg-violetmain' };

  // Initialise au moins la Saison 1 si aucune saison n'est enregistrée
  const seasons =
    item.seasons_data && item.seasons_data.length > 0
      ? item.seasons_data
      : [
          {
            season: 1,
            total_episodes: item.total_progress || 12,
            watched: Array.from({ length: item.current_progress || 0 }, (_, i) => i + 1),
          },
        ];

  const currentSeasonObj = seasons.find((s) => s.season === activeSeason) || seasons[0];

  const saveSeasons = (nextSeasons) => {
    const totalWatched = nextSeasons.reduce((acc, s) => acc + (s.watched?.length || 0), 0);
    const totalEps = nextSeasons.reduce((acc, s) => acc + (s.total_episodes || 0), 0);
    onQuickUpdate(item.id, {
      seasons_data: nextSeasons,
      current_progress: totalWatched,
      total_progress: totalEps,
      current_season: activeSeason,
    });
  };

  const toggleEpisode = (seasonNum, epNum) => {
    const next = seasons.map((s) => {
      if (s.season !== seasonNum) return s;
      const watchedSet = new Set(s.watched || []);
      if (watchedSet.has(epNum)) watchedSet.delete(epNum);
      else watchedSet.add(epNum);
      return { ...s, watched: Array.from(watchedSet).sort((a, b) => a - b) };
    });
    saveSeasons(next);
  };

  const toggleAllSeasonEpisodes = (seasonNum) => {
    const next = seasons.map((s) => {
      if (s.season !== seasonNum) return s;
      const allWatched = (s.watched?.length || 0) >= s.total_episodes;
      return {
        ...s,
        watched: allWatched ? [] : Array.from({ length: s.total_episodes }, (_, i) => i + 1),
      };
    });
    saveSeasons(next);
  };

  const handleAddSeason = (e) => {
    e.preventDefault();
    const count = Math.max(1, parseInt(newSeasonEps, 10) || 12);
    const nextNum = seasons.length > 0 ? Math.max(...seasons.map((s) => s.season)) + 1 : 1;
    const next = [...seasons, { season: nextNum, total_episodes: count, watched: [] }];
    saveSeasons(next);
    setActiveSeason(nextNum);
    setAddingSeason(false);
  };

  const handleDeleteSeason = (seasonNum) => {
    if (seasons.length <= 1) return;
    const next = seasons.filter((s) => s.season !== seasonNum);
    saveSeasons(next);
    setActiveSeason(next[0].season);
  };

  const handleSeasonEpCountChange = (seasonNum, newTotal) => {
    const count = Math.max(1, Math.min(500, parseInt(newTotal, 10) || 1));
    const next = seasons.map((s) =>
      s.season === seasonNum
        ? { ...s, total_episodes: count, watched: (s.watched || []).filter((e) => e <= count) }
        : s
    );
    saveSeasons(next);
  };

  // Mangas : tomes possédés
  const ownedVolumes = item.owned_volumes || [];
  const maxVolumes = Math.max(
    Number(item.total_volumes) || 0,
    ...(ownedVolumes.length ? ownedVolumes : [0]),
    12
  );

  const toggleVolume = (volNum) => {
    const exists = ownedVolumes.includes(volNum);
    const next = exists
      ? ownedVolumes.filter((v) => v !== volNum)
      : [...ownedVolumes, volNum].sort((a, b) => a - b);
    onQuickUpdate(item.id, { owned_volumes: next, is_owned: next.length > 0 });
  };

  const applyVolumeRange = (e) => {
    if (e) e.preventDefault();
    const n = parseInt(volRangeEnd, 10);
    if (!n || n < 1 || n > 300) return;
    const range = Array.from({ length: n }, (_, i) => i + 1);
    const merged = Array.from(new Set([...ownedVolumes, ...range])).sort((a, b) => a - b);
    const nextTotal = Math.max(Number(item.total_volumes) || 0, n);
    onQuickUpdate(item.id, {
      owned_volumes: merged,
      is_owned: merged.length > 0,
      total_volumes: nextTotal,
    });
    setVolRangeEnd('');
  };

  const clearVolumes = () => {
    onQuickUpdate(item.id, { owned_volumes: [], is_owned: false });
  };

  const updateTotalVolumes = (val) => {
    const num = Math.max(1, Math.min(300, parseInt(val, 10) || 0));
    if (!num) return;
    onQuickUpdate(item.id, { total_volumes: num });
  };
  const updateChapterProgress = (newVal) => {
    const val = Math.max(0, parseInt(newVal, 10) || 0);
    onQuickUpdate(item.id, { current_progress: val });
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-surface border border-borderdark rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Barre supérieure : Engrenage en haut à gauche + Fermer en haut à droite */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-borderdark bg-night/40">
          <button
            type="button"
            onClick={() => onOpenEdit(item)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-borderdark hover:border-violetmain text-slate-300 hover:text-white text-xs font-semibold transition"
            title="Modifier l'affiche et les informations"
          >
            <Settings className="w-4 h-4 text-violetmain" />
            Modifier la fiche
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-night transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps 2 colonnes */}
        <div className="flex flex-col md:flex-row overflow-y-auto flex-1">
          {/* COLONNE GAUCHE : Affiche + Sélecteur de statut */}
          <div className="w-full md:w-72 shrink-0 p-6 border-b md:border-b-0 md:border-r border-borderdark flex flex-col gap-4 bg-night/25">
            <div className="relative aspect-[2/3] w-48 md:w-full mx-auto rounded-2xl overflow-hidden bg-night border border-borderdark shadow-xl">
              {item.cover_url ? (
                <img
                  src={item.cover_url}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
                  <BookOpen className="w-12 h-12 mb-2 opacity-40" />
                  <span className="text-xs">Pas d'affiche</span>
                </div>
              )}

              {item.rating !== null && item.rating !== undefined && (
                <div className="absolute top-3 right-3 flex items-center gap-1 bg-night/90 border border-borderdark px-2.5 py-1 rounded-lg text-xs font-bold text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  {item.rating} / 10
                </div>
              )}
            </div>

            {/* Bouton déroulant de statut (style Myutaku) pour Animé / Film / Série / Webtoon */}
            {!isCollection && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setStatusMenuOpen((o) => !o)}
                  className={`w-full flex items-center justify-center gap-2.5 py-3 px-5 rounded-full text-sm font-bold text-white shadow-lg transition ${currentStatus.color}`}
                >
                  <Bookmark className="w-4 h-4 fill-white/20" />
                  <span>{currentStatus.label}</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${statusMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {statusMenuOpen && (
                  <div className="absolute left-0 right-0 mt-2 bg-surface border border-borderdark rounded-xl shadow-2xl overflow-hidden z-20">
                    {statusList.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          onQuickUpdate(item.id, { status: st.id });
                          setStatusMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-night transition ${
                          item.status === st.id ? 'text-violetmain font-bold' : 'text-slate-200'
                        }`}
                      >
                        {st.label}
                        {item.status === st.id && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Boutons d'états cumulables pour Livres & Mangas */}
            {isCollection && (
              <div className="flex flex-col gap-2">
                {item.category === 'book' && (
                  <button
                    type="button"
                    onClick={() => onQuickUpdate(item.id, { is_owned: !item.is_owned })}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-bold border transition ${
                      item.is_owned
                        ? 'bg-adobright border-adobright text-white'
                        : 'bg-night border-borderdark text-slate-400 hover:border-violetmain'
                    }`}
                  >
                    <Library className="w-4 h-4" />
                    {item.is_owned ? 'Possédé' : 'Non possédé'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onQuickUpdate(item.id, { is_read: !item.is_read })}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-bold border transition ${
                    item.is_read
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-night border-borderdark text-slate-400 hover:border-violetmain'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  {item.is_read ? 'Lu' : 'Non lu'}
                </button>

                <button
                  type="button"
                  onClick={() => onQuickUpdate(item.id, { is_wishlist: !item.is_wishlist })}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-bold border transition ${
                    item.is_wishlist
                      ? 'bg-violetmain border-violetmain text-white'
                      : 'bg-night border-borderdark text-slate-400 hover:border-violetmain'
                  }`}
                >
                  <Heart className="w-4 h-4" />
                  {item.is_wishlist ? 'Dans mes envies' : 'Ajouter aux envies'}
                </button>
              </div>
            )}

            {/* Infos rapides */}
            <div className="text-xs text-slate-400 space-y-1 pt-2 border-t border-borderdark">
              {item.release_year && <p>Année : <span className="text-slate-200">{item.release_year}</span></p>}
              {item.original_title && (
                <p className="truncate" title={item.original_title}>
                  Original : <span className="text-slate-200">{item.original_title}</span>
                </p>
              )}
              {item.notes && (
                <p className="pt-1 text-slate-300 italic">"{item.notes}"</p>
              )}
            </div>
          </div>

          {/* COLONNE DROITE : Titre + Contenu spécifique au média */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            <div>
              <h2 className="text-2xl font-bold text-white leading-tight">{item.title}</h2>
              {item.synopsis && (
                <p className="text-sm text-slate-400 mt-2 leading-relaxed whitespace-pre-line">
                  {item.synopsis}
                </p>
              )}
            </div>

            {/* 1. ANIMÉS & SÉRIES : Liste d'épisodes triée par saison */}
            {isEpisodic && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {seasons.map((s) => (
                      <button
                        key={s.season}
                        type="button"
                        onClick={() => setActiveSeason(s.season)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                          currentSeasonObj.season === s.season
                            ? 'bg-violetmain text-white shadow'
                            : 'bg-night border border-borderdark text-slate-300 hover:border-violetmain'
                        }`}
                      >
                        Saison {s.season} ({s.watched?.length || 0}/{s.total_episodes})
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => setAddingSeason((v) => !v)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-adoblue/60 hover:bg-adobright text-white transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> Saison
                    </button>
                  </div>
                </div>

                {addingSeason && (
                  <form
                    onSubmit={handleAddSeason}
                    className="flex flex-wrap items-center gap-2 bg-night p-3 rounded-xl border border-borderdark"
                  >
                    <span className="text-xs text-slate-300">Nombre d'épisodes :</span>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={newSeasonEps}
                      onChange={(e) => setNewSeasonEps(e.target.value)}
                      className="w-20 bg-surface border border-borderdark rounded-lg px-2.5 py-1 text-xs text-white"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1 rounded-lg bg-violetmain text-white text-xs font-semibold"
                    >
                      Ajouter
                    </button>
                  </form>
                )}

                {/* Contrôles de la saison active */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-night/60 p-3 rounded-xl border border-borderdark">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span>Épisodes dans la S{currentSeasonObj.season} :</span>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={currentSeasonObj.total_episodes}
                      onChange={(e) =>
                        handleSeasonEpCountChange(currentSeasonObj.season, e.target.value)
                      }
                      className="w-16 bg-surface border border-borderdark rounded px-2 py-1 text-xs text-white"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleAllSeasonEpisodes(currentSeasonObj.season)}
                      className="px-3 py-1 rounded-lg bg-surface border border-borderdark hover:border-violetmain text-xs font-semibold text-slate-200"
                    >
                      {(currentSeasonObj.watched?.length || 0) >= currentSeasonObj.total_episodes
                        ? 'Tout décocher'
                        : 'Tout cocher'}
                    </button>
                    {seasons.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSeason(currentSeasonObj.season)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10"
                        title="Supprimer cette saison"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Liste des épisodes */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-80 overflow-y-auto pr-1">
                  {Array.from({ length: currentSeasonObj.total_episodes }, (_, i) => i + 1).map(
                    (epNum) => {
                      const isWatched = (currentSeasonObj.watched || []).includes(epNum);
                      return (
                        <button
                          key={epNum}
                          type="button"
                          onClick={() => toggleEpisode(currentSeasonObj.season, epNum)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold border transition ${
                            isWatched
                              ? 'bg-emerald-600/20 border-emerald-500/70 text-emerald-200'
                              : 'bg-night border-borderdark text-slate-300 hover:border-violetmain'
                          }`}
                        >
                          <span>Épisode {epNum}</span>
                          <span
                            className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                              isWatched
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-slate-600'
                            }`}
                          >
                            {isWatched && <Check className="w-3 h-3" />}
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            )}

            {/* 2. MANGAS : Chapitres lus + Tomes possédés */}
            {item.category === 'manga' && (
              <div className="space-y-6">
                {/* Bloc Chapitres lus */}
                <div className="bg-night/60 border border-borderdark rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white">Chapitres lus</h3>
                      <p className="text-xs text-slate-400">
                        Progression de lecture (indépendante des tomes possédés)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateChapterProgress((item.current_progress || 0) - 1)}
                        className="p-2 rounded-lg bg-surface border border-borderdark hover:border-violetmain text-white"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={item.current_progress || 0}
                        onChange={(e) => updateChapterProgress(e.target.value)}
                        className="w-20 text-center bg-surface border border-borderdark rounded-lg py-1.5 text-sm font-bold text-white"
                      />
                      <button
                        type="button"
                        onClick={() => updateChapterProgress((item.current_progress || 0) + 1)}
                        className="p-2 rounded-lg bg-violetmain hover:bg-violethover text-white"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {item.total_progress > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>{item.current_progress || 0} / {item.total_progress} chapitres</span>
                        <span>
                          {Math.min(100, Math.round(((item.current_progress || 0) / item.total_progress) * 100))}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-adobright to-violetmain rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, Math.round(((item.current_progress || 0) / item.total_progress) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Bloc Tomes possédés */}
                <div className="bg-night/60 border border-borderdark rounded-xl p-4 space-y-3">
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        Tomes possédés ({ownedVolumes.length}
                        {item.total_volumes ? ` / ${item.total_volumes}` : ''})
                      </h3>
                      <p className="text-xs text-slate-400">
                        Clique sur chaque tome que tu as dans ta bibliothèque
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span>Total :</span>
                        <input
                          type="number"
                          min="1"
                          max="300"
                          placeholder="110"
                          defaultValue={item.total_volumes || ''}
                          onBlur={(e) => updateTotalVolumes(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              updateTotalVolumes(e.currentTarget.value);
                            }
                          }}
                          className="w-16 bg-surface border border-borderdark rounded-lg px-2 py-1 text-xs text-white"
                        />
                      </div>

                      <form onSubmit={applyVolumeRange} className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          max="300"
                          placeholder="1 à N"
                          value={volRangeEnd}
                          onChange={(e) => setVolRangeEnd(e.target.value)}
                          className="w-20 bg-surface border border-borderdark rounded-lg px-2.5 py-1 text-xs text-white"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1 rounded-lg bg-adoblue hover:bg-adobright text-xs font-semibold text-white"
                        >
                          Cocher 1→N
                        </button>
                      </form>

                      <button
                        type="button"
                        onClick={clearVolumes}
                        disabled={ownedVolumes.length === 0}
                        className="px-2.5 py-1 rounded-lg bg-surface border border-borderdark hover:border-red-500/60 text-xs text-slate-300 hover:text-red-400 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-borderdark disabled:hover:text-slate-300"
                      >
                        Tout décocher
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-10 gap-1.5 max-h-56 overflow-y-auto pr-1">
                    {Array.from({ length: Math.min(maxVolumes, 300) }, (_, i) => i + 1).map((num) => {
                      const owned = ownedVolumes.includes(num);
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => toggleVolume(num)}
                          className={`py-2 rounded-lg text-xs font-bold border transition ${
                            owned
                              ? 'bg-adobright border-adobright text-white shadow'
                              : 'bg-surface border-borderdark text-slate-400 hover:border-violetmain'
                          }`}
                        >
                          T.{num}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 3. WEBTOONS / MANHWA : Chapitres lus */}
            {item.category === 'webtoon' && (
              <div className="bg-night/60 border border-borderdark rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">Chapitres lus</h3>
                    <p className="text-xs text-slate-400">
                      Clique sur +1 ou saisis directement ton dernier chapitre lu
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateChapterProgress((item.current_progress || 0) - 1)}
                      className="p-2 rounded-lg bg-surface border border-borderdark hover:border-violetmain text-white"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={item.current_progress || 0}
                      onChange={(e) => updateChapterProgress(e.target.value)}
                      className="w-24 text-center bg-surface border border-borderdark rounded-lg py-1.5 text-sm font-bold text-white"
                    />
                    <button
                      type="button"
                      onClick={() => updateChapterProgress((item.current_progress || 0) + 1)}
                      className="p-2 rounded-lg bg-violetmain hover:bg-violethover text-white"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {item.total_progress > 0 && (
                  <div className="w-full h-2.5 bg-surface rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-adobright to-violetmain rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, Math.round(((item.current_progress || 0) / item.total_progress) * 100))}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* 4. FILMS & LIVRES : Résumé détaillé */}
            {(item.category === 'movie' || item.category === 'book') && (
              <div className="bg-night/60 border border-borderdark rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-white">Détails</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {item.synopsis || 'Aucun synopsis renseigné. Clique sur l’engrenage en haut à gauche pour en ajouter un.'}
                </p>
                {item.category === 'book' && item.total_progress && (
                  <p className="text-xs text-slate-400">
                    Nombre de pages : <span className="text-white font-semibold">{item.total_progress}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}