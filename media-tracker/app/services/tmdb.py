import os
import requests

TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w342"

def get_tv_episode_count(tmdb_id):
    """Récupère le nombre total d'épisodes d'une série TMDB (appelé seulement à l'import)."""
    api_key = os.getenv('TMDB_API_KEY')
    if not api_key:
        return 0

    url = f"{TMDB_BASE_URL}/tv/{tmdb_id}"
    params = {'api_key': api_key, 'language': 'fr-FR'}

    try:
        response = requests.get(url, params=params, timeout=8)
        response.raise_for_status()
    except requests.RequestException:
        return 0

    return response.json().get('number_of_episodes', 0) or 0

def search_tmdb(query, media_type='movie'):
    """
    Recherche TMDB pour films ('movie') et séries ('tv').
    Nécessite la variable d'environnement TMDB_API_KEY.
    """
    api_key = os.getenv('TMDB_API_KEY')
    if not api_key:
        return []

    endpoint = 'movie' if media_type == 'movie' else 'tv'
    url = f"{TMDB_BASE_URL}/search/{endpoint}"
    params = {'api_key': api_key, 'query': query, 'language': 'fr-FR'}

    try:
        response = requests.get(url, params=params, timeout=8)
        response.raise_for_status()
    except requests.RequestException:
        return []

    data = response.json()
    results = []

    for item in data.get('results', [])[:15]:
        title = item.get('title') or item.get('name')
        poster_path = item.get('poster_path')
        cover = f"{TMDB_IMAGE_BASE}{poster_path}" if poster_path else ''

        results.append({
            'title': title,
            'type': 'film' if media_type == 'movie' else 'serie',
            'cover_image': cover,
            'external_id': f"tmdb-{item['id']}",
            'total_units': 1 if media_type == 'movie' else 0,  # film = 1 unité (vu/pas vu) ; série = calculé à l'import
            'source': 'tmdb'
        })

    return results


def get_tv_episodes(tmdb_id, season_number=1):
    api_key = os.getenv('TMDB_API_KEY')
    if not api_key:
        return []

    url = f"{TMDB_BASE_URL}/tv/{tmdb_id}/season/{season_number}"
    try:
        response = requests.get(url, params={'api_key': api_key, 'language': 'fr-FR'}, timeout=8)
        response.raise_for_status()
    except requests.RequestException:
        return []

    results = []
    for ep in response.json().get('episodes', []):
        still = ep.get('still_path')
        results.append({
            'number': ep.get('episode_number'),
            'title': ep.get('name') or f"Episode {ep.get('episode_number')}",
            'synopsis': ep.get('overview') or "Aucune synopsis disponible pour le moment.",
            'thumbnail': f"{TMDB_IMAGE_BASE}{still}" if still else ''
        })
    return results


def get_tv_seasons(tmdb_id):
    """Liste des saisons d'une série TMDB (hors 'Spécials' = saison 0)."""
    api_key = os.getenv('TMDB_API_KEY')
    if not api_key:
        return []

    url = f"{TMDB_BASE_URL}/tv/{tmdb_id}"
    try:
        response = requests.get(url, params={'api_key': api_key, 'language': 'fr-FR'}, timeout=8)
        response.raise_for_status()
    except requests.RequestException:
        return []

    seasons = response.json().get('seasons', [])
    return [
        {
            'season_number': s['season_number'],
            'name': s.get('name') or f"Saison {s['season_number']}",
            'episode_count': s.get('episode_count', 0)
        }
        for s in seasons if s['season_number'] > 0
    ]