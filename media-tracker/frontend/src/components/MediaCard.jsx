import React from 'react';
import { Plus, Minus, BookOpen, Star, Check, Heart, Library } from 'lucide-react';

const STATUS_LABELS = {
  en_cours: { label: 'En cours', cls: 'bg-adobright/90 text-white' },
  termine: { label: 'Terminé', cls: 'bg-emerald-600/90 text-white' },
  envie: { label: 'Envie', cls: 'bg-violetmain/90 text-white' },
  pause: { label: 'Pause', cls: 'bg-amber-600/90 text-white' },
};

export default function MediaCard({ item, onEdit, onStepProgress }) {
  const isCollection = item.category === 'manga' || item.category === 'book';
  const hasProgress = ['anime', 'series', 'webtoon', 'manga'].includes(item.category);
  const progressUnit = item.category === 'anime' || item.category === 'series' ? 'Ep.' : 'Ch.';

  const percent =
    item.total_progress && item.total_progress > 0
      ? Math.min(100, Math.round((item.current_progress / item.total_progress) * 100))
      : null;

  const statusBadge = item.status ? STATUS_LABELS[item.status] : null;

  return (
    <div
      onClick={() => onEdit(item)}
      className="group relative flex flex-col bg-surface border border-borderdark rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:border-violetmain/70 hover:shadow-lg hover:shadow-violetmain/10"
    >
      {/* Affiche */}
      <div className="relative aspect-[2/3] w-full bg-night overflow-hidden">
        {item.cover_url ? (
          <img
            src={item.cover_url}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 p-4 text-center">
            <BookOpen className="w-10 h-10 mb-2 opacity-50" />
            <span className="text-xs">Pas d'image</span>
          </div>
        )}

        {/* Dégradé bas */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-surface via-surface/60 to-transparent" />

        {/* Badges haut gauche */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {!isCollection && statusBadge && (
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md backdrop-blur-sm ${statusBadge.cls}`}>
              {statusBadge.label}
            </span>
          )}

          {isCollection && item.is_owned && (
            <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-adoblue/95 text-blue-100 border border-adobright/40">
              <Library className="w-3 h-3" />
              {item.category === 'manga'
                ? `${item.owned_volumes?.length || 0} t.`
                : 'Possédé'}
            </span>
          )}
          {isCollection && item.is_read && (
            <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-600/90 text-white">
              <Check className="w-3 h-3" /> Lu
            </span>
          )}
          {isCollection && item.is_wishlist && (
            <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-violetmain/90 text-white">
              <Heart className="w-3 h-3" /> Envie
            </span>
          )}
        </div>

        {/* Note haut droite */}
        {item.rating !== null && item.rating !== undefined && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-night/85 border border-borderdark px-2 py-0.5 rounded-md text-xs font-semibold text-amber-400">
            <Star className="w-3 h-3 fill-amber-400" />
            {item.rating}
          </div>
        )}
      </div>

      {/* Infos */}
      <div className="p-3 flex flex-col flex-1 justify-between gap-2">
        <div>
          <h3 className="font-semibold text-sm text-slate-100 line-clamp-2 leading-snug group-hover:text-violetmain transition-colors">
            {item.title}
          </h3>
          {item.release_year && (
            <p className="text-[11px] text-slate-400 mt-0.5">{item.release_year}</p>
          )}
        </div>

        {/* Barre de progression + boutons rapides */}
        {hasProgress && (
          <div className="pt-1">
            <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
              <span className="font-medium">
                {item.category === 'series' && item.current_season > 1
                  ? `S${item.current_season} · `
                  : ''}
                {progressUnit} {item.current_progress}
                {item.total_progress ? ` / ${item.total_progress}` : ''}
              </span>

              <div
                className="flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => onStepProgress(item.id, -1)}
                  className="p-1 rounded bg-night border border-borderdark hover:border-violetmain text-slate-300 hover:text-white transition"
                  title="-1"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onStepProgress(item.id, 1)}
                  className="p-1 rounded bg-adoblue hover:bg-violetmain text-white transition"
                  title="+1"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {percent !== null && (
              <div className="w-full h-1.5 bg-night rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-adobright to-violetmain rounded-full transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}