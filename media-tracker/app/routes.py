from flask import Blueprint, render_template, request, redirect, url_for, flash
from app.models import get_all_media, add_media, update_progress, delete_media, get_db, get_media_by_external_id
from app.services.search_service import search_all_sources
from app.services.anilist import search_anilist, get_anime_episodes
from app.services.tmdb import get_tv_episode_count, get_tv_episodes, get_tv_seasons
main_bp = Blueprint('main', __name__)


@main_bp.route('/')
def index():
    medias = get_all_media()
    return render_template('index.html', medias=medias)


@main_bp.route('/add', methods=['POST'])
def add():
    """Route pour ajouter un média manuellement."""
    title = request.form.get('title')
    media_type = request.form.get('type')
    status = request.form.get('status', 'watching')
    cover_image = request.form.get('cover_image', '')
    
    try:
        total_units = int(request.form.get('total_units', 0) or 0)
    except ValueError:
        total_units = 0

    if title and media_type:
        add_media(
            title=title,
            media_type=media_type,
            status=status,
            cover_image=cover_image,
            total_units=total_units
        )
        flash(f'"{title}" a été ajouté avec succès !', 'success')
    else:
        flash('Le titre et le type sont obligatoires.', 'danger')

    return redirect(url_for('main.index'))


@main_bp.route('/update/<int:media_id>', methods=['POST'])
def update(media_id):
    """Met à jour la progression et/ou le statut d'un média."""
    current_unit = request.form.get('current_unit')
    status = request.form.get('status')

    # Conversion sécurisée de la progression si elle est fournie
    unit_val = None
    if current_unit is not None and current_unit != '':
        try:
            unit_val = int(current_unit)
        except ValueError:
            unit_val = None

    # Récupération de la progression actuelle si seule une modification de statut est demandée
    if unit_val is None:
        db = get_db()
        prog = db.execute(
            'SELECT current_unit FROM progress WHERE media_id = ?', 
            (media_id,)
        ).fetchone()
        unit_val = prog['current_unit'] if prog else 0

    update_progress(media_id, unit_val, status=status)
    return redirect(url_for('main.index', type=request.args.get('type', '')))


@main_bp.route('/delete/<int:media_id>', methods=['POST'])
def delete(media_id):
    """Supprime un média de la base de données."""
    delete_media(media_id)
    flash('Média supprimé.', 'info')
    return redirect(url_for('main.index'))


@main_bp.route('/search', methods=['GET', 'POST'])
def search():
    """Page de recherche multi-API."""
    query = request.args.get('q', '')
    media_filter = request.args.get('type', '')  # 'anime', 'manga', 'movie', 'series'...
    results = []
    
    if query:
        results = search_all_sources(query, media_type=media_filter)
        
    return render_template(
        'search.html', 
        query=query, 
        results=results, 
        active_filter=media_filter
    )


@main_bp.route('/import', methods=['POST'])
def import_media():
    """Importation directe d'un résultat d'API dans la base SQLite."""
    title = request.form.get('title')
    media_type = request.form.get('type')
    cover_image = request.form.get('cover_image')
    external_id = request.form.get('external_id')
    total_units = int(request.form.get('total_units', 0) or 0)
    status = request.form.get('status', 'watching')

    if not title or not media_type:
        return redirect(url_for('main.index'))

    # Anti-doublon : un même external_id ne doit pas être importé deux fois
    if external_id and get_media_by_external_id(external_id):
        flash(f'"{title}" est déjà dans votre collection.', 'info')
        return redirect(url_for('main.index'))

    # Récupère le vrai nombre d'épisodes pour les séries TMDB (voir point 3)
    if media_type == 'serie' and external_id and external_id.startswith('tmdb-'):
        tmdb_id = external_id.split('tmdb-')[1]
        fetched_units = get_tv_episode_count(tmdb_id)
        if fetched_units:
            total_units = fetched_units

    add_media(
        title=title,
        media_type=media_type,
        status=status,
        cover_image=cover_image,
        external_id=external_id,
        total_units=total_units
    )
    flash(f'"{title}" a été ajouté à votre collection !', 'success')
    return redirect(url_for('main.index'))

@main_bp.route('/media/<int:media_id>')
def media_detail(media_id):
    db = get_db()
    media = db.execute('''
        SELECT media.*, progress.current_unit, progress.status
        FROM media JOIN progress ON progress.media_id = media.id
        WHERE media.id = ?
    ''', (media_id,)).fetchone()

    if not media:
        flash("Média introuvable.", "danger")
        return redirect(url_for('main.index'))

    episodes = []
    seasons = []
    selected_season = request.args.get('season', type=int)

    if media['type'] == 'anime' and media['external_id'] and media['external_id'].startswith('anilist-'):
        anilist_id = media['external_id'].split('anilist-')[1]
        episodes = get_anime_episodes(anilist_id, media['total_units'])

    elif media['type'] == 'serie' and media['external_id'] and media['external_id'].startswith('tmdb-'):
        tmdb_id = media['external_id'].split('tmdb-')[1]
        seasons = get_tv_seasons(tmdb_id)

        if not selected_season and seasons:
            selected_season = seasons[0]['season_number']

        # Décalage cumulé : nb d'épisodes de toutes les saisons AVANT celle affichée
        offset = sum(s['episode_count'] for s in seasons if s['season_number'] < selected_season)

        raw_episodes = get_tv_episodes(tmdb_id, selected_season)
        for ep in raw_episodes:
            ep['global_number'] = offset + ep['number']
        episodes = raw_episodes

    else:
        total = media['total_units'] or 0
        episodes = [{'number': i, 'global_number': i, 'title': '', 'synopsis': '', 'thumbnail': ''} for i in range(1, total + 1)]

    return render_template('detail.html', media=media, episodes=episodes, seasons=seasons, selected_season=selected_season)