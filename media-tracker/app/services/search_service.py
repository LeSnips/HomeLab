from app.services.anilist import search_anilist
from app.services.tmdb import search_tmdb
from app.services.openlibrary import search_openlibrary

TYPE_TO_SOURCE = {
    'anime':   ('anilist', 'ANIME'),
    'manga':   ('anilist', 'MANGA'),
    'webtoon': ('anilist', 'MANGA'),
    'film':    ('tmdb', 'movie'),
    'serie':   ('tmdb', 'tv'),
    'livres':  ('openlibrary', None),
}


def search_all_sources(query, media_type=None):
    if not query:
        return []

    types_to_search = [media_type] if media_type in TYPE_TO_SOURCE else TYPE_TO_SOURCE.keys()

    results = []
    for t in types_to_search:
        source, source_type = TYPE_TO_SOURCE[t]
        if source == 'anilist':
            results.extend(search_anilist(query, media_type=source_type))
        elif source == 'tmdb':
            results.extend(search_tmdb(query, media_type=source_type))
        elif source == 'openlibrary':
            results.extend(search_openlibrary(query))

    return results