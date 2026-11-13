import requests

ANILIST_URL = "https://graphql.anilist.co"

ANILIST_QUERY = '''
query ($search: String, $type: MediaType) {
  Page(perPage: 15) {
    media(search: $search, type: $type) {
      id
      title { romaji english }
      coverImage { large }
      episodes
      chapters
      format
      countryOfOrigin
    }
  }
}
'''

ANILIST_EPISODES_QUERY = '''
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    streamingEpisodes { title thumbnail }
  }
}
'''

def get_anime_episodes(anilist_id, total_units=0):
    try:
        response = requests.post(
            ANILIST_URL,
            json={'query': ANILIST_EPISODES_QUERY, 'variables': {'id': int(anilist_id)}},
            timeout=8
        )
        response.raise_for_status()
        eps = response.json().get('data', {}).get('Media', {}).get('streamingEpisodes', [])
    except requests.RequestException:
        eps = []

    episodes = [
        {
            'number': i,
            'global_number': i,
            'title': ep.get('title') or f'Episode {i}',
            'thumbnail': ep.get('thumbnail', ''),
            'synopsis': ''
        }
        for i, ep in enumerate(eps, start=1)
    ]

    # streamingEpisodes est souvent incomplet sur les longues séries (ne référence parfois
    # que les derniers épisodes) : on complète jusqu'au vrai total avec des entrées simples.
    if total_units and len(episodes) < total_units:
        for i in range(len(episodes) + 1, total_units + 1):
            episodes.append({'number': i, 'global_number': i, 'title': f'Episode {i}', 'thumbnail': '', 'synopsis': ''})

    return episodes

def search_anilist(query, media_type='ANIME'):
    """
    Recherche AniList pour anime/manga.
    media_type: 'ANIME' ou 'MANGA' (valeurs attendues par l'API AniList).
    """
    variables = {'search': query, 'type': media_type}
    try:
        response = requests.post(
            ANILIST_URL,
            json={'query': ANILIST_QUERY, 'variables': variables},
            timeout=8
        )
        response.raise_for_status()
    except requests.RequestException:
        return []

    data = response.json()
    items = data.get('data', {}).get('Page', {}).get('media', [])

    results = []
    for item in items:
        title = item['title'].get('english') or item['title'].get('romaji')
        cover = item.get('coverImage', {}).get('large', '')
        total = item.get('episodes') if media_type == 'ANIME' else item.get('chapters')
        country = item.get('countryOfOrigin')

        # Distinction manga papier vs webtoon (origine Corée -> webtoon)
        if media_type == 'MANGA':
            resolved_type = 'webtoon' if country == 'KR' else 'manga'
        else:
            resolved_type = 'anime'

        results.append({
            'title': title,
            'type': resolved_type,
            'cover_image': cover,
            'external_id': f"anilist-{item['id']}",
            'total_units': total or 0,
            'source': 'anilist'
        })

    return results