import os
import re
import requests

TMDB_API_KEY = os.environ.get("TMDB_API_KEY", "")


def clean_html(text):
    if not text:
        return ""
    return re.sub(r"<[^>]+>", "", text).strip()


def search_anilist(query, media_type="ANIME"):
    url = "https://graphql.anilist.co"
    gql = """
    query ($search: String, $type: MediaType) {
      Page(page: 1, perPage: 10) {
        media(search: $search, type: $type) {
          id
          title { romaji english native }
          coverImage { large }
          description(asHtml: false)
          startDate { year }
          episodes
          chapters
          volumes
        }
      }
    }
    """
    resp = requests.post(
        url,
        json={"query": gql, "variables": {"search": query, "type": media_type}},
        timeout=10,
    )
    resp.raise_for_status()
    items = resp.json().get("data", {}).get("Page", {}).get("media", [])

    results = []
    for item in items:
        title = item["title"].get("english") or item["title"].get("romaji") or item["title"].get("native")
        total_progress = item.get("episodes") if media_type == "ANIME" else item.get("chapters")
        results.append({
            "external_id": str(item["id"]),
            "external_source": "anilist",
            "title": title,
            "original_title": item["title"].get("native") or item["title"].get("romaji"),
            "cover_url": item.get("coverImage", {}).get("large"),
            "synopsis": clean_html(item.get("description")),
            "release_year": item.get("startDate", {}).get("year"),
            "total_progress": total_progress,
            "total_volumes": item.get("volumes"),
        })
    return results


def search_tmdb(query, media_type="movie"):
    if not TMDB_API_KEY or TMDB_API_KEY == "ta_cle_tmdb_ici":
        return []

    endpoint = "movie" if media_type == "movie" else "tv"
    url = f"https://api.themoviedb.org/3/search/{endpoint}"
    params = {
        "api_key": TMDB_API_KEY,
        "query": query,
        "language": "fr-FR",
    }
    resp = requests.get(url, params=params, timeout=10)
    resp.raise_for_status()
    items = resp.json().get("results", [])[:10]

    results = []
    for item in items:
        poster = item.get("poster_path")
        date_str = item.get("release_date") if endpoint == "movie" else item.get("first_air_date")
        year = int(date_str[:4]) if date_str and len(date_str) >= 4 else None

        results.append({
            "external_id": str(item["id"]),
            "external_source": "tmdb",
            "title": item.get("title") if endpoint == "movie" else item.get("name"),
            "original_title": item.get("original_title") if endpoint == "movie" else item.get("original_name"),
            "cover_url": f"https://image.tmdb.org/t/p/w500{poster}" if poster else None,
            "synopsis": item.get("overview") or "",
            "release_year": year,
            "total_progress": None,
            "total_volumes": None,
        })
    return results


def search_google_books(query):
    url = "https://www.googleapis.com/books/v1/volumes"
    params = {"q": query, "maxResults": 10}
    resp = requests.get(url, params=params, timeout=10)
    resp.raise_for_status()
    items = resp.json().get("items", [])

    results = []
    for item in items:
        info = item.get("volumeInfo", {})
        image_links = info.get("imageLinks", {})
        cover = image_links.get("thumbnail") or image_links.get("smallThumbnail")
        if cover:
            cover = cover.replace("http://", "https://")

        pub_date = info.get("publishedDate", "")
        year = int(pub_date[:4]) if pub_date and pub_date[:4].isdigit() else None

        results.append({
            "external_id": item.get("id"),
            "external_source": "google_books",
            "title": info.get("title", "Sans titre"),
            "original_title": ", ".join(info.get("authors", [])),
            "cover_url": cover,
            "synopsis": info.get("description") or "",
            "release_year": year,
            "total_progress": info.get("pageCount"),
            "total_volumes": None,
        })
    return results


def search_external(category, query):
    if category == "anime":
        return search_anilist(query, "ANIME")
    if category in ("manga", "webtoon"):
        return search_anilist(query, "MANGA")
    if category == "movie":
        return search_tmdb(query, "movie")
    if category == "series":
        return search_tmdb(query, "series")
    if category == "book":
        return search_google_books(query)
    return []