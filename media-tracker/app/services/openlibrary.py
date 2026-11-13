import requests

OPENLIBRARY_URL = "https://openlibrary.org/search.json"
COVER_BASE_URL = "https://covers.openlibrary.org/b/id"


def search_openlibrary(query, media_type='livres'):
    """
    Recherche de livres via Open Library (pas de clé API nécessaire).
    """
    params = {
        'q': query,
        'limit': 15,
        'fields': 'key,title,author_name,cover_i,first_publish_year'
    }

    try:
        response = requests.get(OPENLIBRARY_URL, params=params, timeout=8)
        response.raise_for_status()
    except requests.RequestException:
        return []

    data = response.json()
    results = []

    for item in data.get('docs', []):
        title = item.get('title')
        if not title:
            continue

        cover_id = item.get('cover_i')
        cover = f"{COVER_BASE_URL}/{cover_id}-M.jpg" if cover_id else ''

        # La clé Open Library ressemble à "/works/OL45804W" -> on garde juste "OL45804W"
        work_key = item.get('key', '').split('/')[-1]

        results.append({
            'title': title,
            'type': 'livres',
            'cover_image': cover,
            'external_id': f"openlibrary-{work_key}",
            'total_units': 1,  # un livre = 1 unité (lu / pas lu), comme les films
            'source': 'openlibrary'
        })

    return results