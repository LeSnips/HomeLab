import os
from decimal import Decimal
from flask import Flask, jsonify, request
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor, Json
from services import search_external, get_tmdb_series_seasons

app = Flask(__name__)
CORS(app)

DATABASE_URL = os.environ.get("DATABASE_URL")


def get_db():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


def serialize_row(row):
    if not row:
        return None
    item = dict(row)
    if isinstance(item.get("rating"), Decimal):
        item["rating"] = float(item["rating"])
    for key in ("created_at", "updated_at"):
        if item.get(key):
            item[key] = item[key].isoformat()
    if item.get("owned_volumes") is None:
        item["owned_volumes"] = []
    if item.get("seasons_data") is None: 
        item["seasons_data"] = []
    return item


def clean_int(val, default=None):
    if val in (None, ""):
        return default
    return int(val)


def clean_float(val):
    if val in (None, ""):
        return None
    return float(val)


def parse_bool_param(val):
    if val is None or val == "":
        return None
    return val.lower() == "true"


@app.route("/api/health", methods=["GET"])
def health():
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1;")
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"status": "error", "detail": str(e)}), 500


@app.route("/api/search", methods=["GET"])
def search():
    category = request.args.get("category", "")
    query = request.args.get("q", "").strip()
    if not category or not query:
        return jsonify([])
    try:
        results = search_external(category, query)
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)}), 502


@app.route("/api/media", methods=["GET"])
def list_media():
    category = request.args.get("category")
    status = request.args.get("status")
    is_owned = parse_bool_param(request.args.get("is_owned"))
    is_wishlist = parse_bool_param(request.args.get("is_wishlist"))
    is_read = parse_bool_param(request.args.get("is_read"))
    q = request.args.get("q", "").strip()

    conditions = []
    params = []

    if category and category != "all":
        conditions.append("category = %s")
        params.append(category)
    if status:
        conditions.append("status = %s")
        params.append(status)
    if is_owned is not None:
        conditions.append("is_owned = %s")
        params.append(is_owned)
    if is_wishlist is not None:
        conditions.append("is_wishlist = %s")
        params.append(is_wishlist)
    if is_read is not None:
        conditions.append("is_read = %s")
        params.append(is_read)
    if q:
        conditions.append("(title ILIKE %s OR original_title ILIKE %s)")
        params.extend([f"%{q}%", f"%{q}%"])

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    sql = f"SELECT * FROM media_items {where_clause} ORDER BY updated_at DESC;"

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()

    return jsonify([serialize_row(r) for r in rows])


@app.route("/api/media", methods=["POST"])
@app.route("/api/media", methods=["POST"])
def create_media():
    data = request.get_json() or {}
    if not data.get("title") or not data.get("category"):
        return jsonify({"error": "title et category sont requis"}), 400

    volumes = sorted({int(v) for v in data.get("owned_volumes", []) if str(v).isdigit()})
    is_owned = bool(data.get("is_owned", False))
    if data["category"] == "manga" and volumes:
        is_owned = True

    status = data.get("status") or None

    if data["category"] == "manga" and not status:
        total_vols = clean_int(data.get("total_volumes"))
        if not volumes:
            status = "non_possede"
        elif total_vols and len(volumes) >= total_vols:
            status = "termine"
        else:
            status = "a_completer"
            
    total_progress = clean_int(data.get("total_progress"))
    seasons_data = data.get("seasons_data") or []

    # Import automatique des saisons/épisodes pour les séries TMDB
    if (
        data["category"] == "series"
        and data.get("external_source") == "tmdb"
        and data.get("external_id")
        and not seasons_data
    ):
        try:
            fetched_seasons, fetched_total = get_tmdb_series_seasons(data["external_id"])
            if fetched_seasons:
                seasons_data = fetched_seasons
                total_progress = fetched_total
        except Exception as e:
            print(f"Erreur récupération saisons TMDB: {e}")

    # Initialisation de la saison 1 pour les animés si le nombre d'épisodes est connu
    if data["category"] == "anime" and total_progress and not seasons_data:
        seasons_data = [{
            "season": 1,
            "total_episodes": total_progress,
            "watched": [],
        }]

    sql = """
        INSERT INTO media_items (
            category, title, original_title, cover_url, synopsis, release_year,
            external_id, external_source, status, is_owned, is_wishlist, is_read,
            current_progress, total_progress, current_season, owned_volumes,
            total_volumes, rating, notes, seasons_data
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING *;
    """
    values = (
        data["category"],
        data["title"].strip(),
        data.get("original_title"),
        data.get("cover_url"),
        data.get("synopsis"),
        clean_int(data.get("release_year")),
        data.get("external_id"),
        data.get("external_source", "manual"),
        status,
        is_owned,
        bool(data.get("is_wishlist", False)),
        bool(data.get("is_read", False)),
        clean_int(data.get("current_progress"), 0),
        total_progress,
        clean_int(data.get("current_season"), 1),
        volumes,
        clean_int(data.get("total_volumes")),
        clean_float(data.get("rating")),
        data.get("notes"),
        Json(seasons_data),
    )

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, values)
            created = cur.fetchone()
            conn.commit()

    return jsonify(serialize_row(created)), 201


@app.route("/api/media/<int:item_id>", methods=["PUT"])
def update_media(item_id):
    data = request.get_json() or {}
    volumes = sorted({int(v) for v in data.get("owned_volumes", []) if str(v).isdigit()})
    is_owned = bool(data.get("is_owned", False))
    if data.get("category") == "manga":
        is_owned = len(volumes) > 0 if "owned_volumes" in data else is_owned

    status = data.get("status") or None

    sql = """
        UPDATE media_items SET
            category = %s,
            title = %s,
            original_title = %s,
            cover_url = %s,
            synopsis = %s,
            release_year = %s,
            status = %s,
            is_owned = %s,
            is_wishlist = %s,
            is_read = %s,
            current_progress = %s,
            total_progress = %s,
            current_season = %s,
            owned_volumes = %s,
            total_volumes = %s,
            rating = %s,
            notes = %s
        WHERE id = %s
        RETURNING *;
    """
    values = (
        data["category"],
        data["title"].strip(),
        data.get("original_title"),
        data.get("cover_url"),
        data.get("synopsis"),
        clean_int(data.get("release_year")),
        status,
        is_owned,
        bool(data.get("is_wishlist", False)),
        bool(data.get("is_read", False)),
        clean_int(data.get("current_progress"), 0),
        clean_int(data.get("total_progress")),
        clean_int(data.get("current_season"), 1),
        volumes,
        clean_int(data.get("total_volumes")),
        clean_float(data.get("rating")),
        data.get("notes"),
        item_id,
    )

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, values)
            updated = cur.fetchone()
            conn.commit()

    if not updated:
        return jsonify({"error": "Introuvable"}), 404
    return jsonify(serialize_row(updated))


@app.route("/api/media/<int:item_id>/progress", methods=["PATCH"])
def patch_progress(item_id):
    data = request.get_json() or {}
    delta = clean_int(data.get("delta"), 0)

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE media_items
                SET current_progress = GREATEST(0, current_progress + %s)
                WHERE id = %s
                RETURNING *;
                """,
                (delta, item_id),
            )
            updated = cur.fetchone()
            conn.commit()

    if not updated:
        return jsonify({"error": "Introuvable"}), 404
    return jsonify(serialize_row(updated))


@app.route("/api/media/<int:item_id>/volumes", methods=["PATCH"])
def patch_volumes(item_id):
    """Permet de cocher/décocher un tome spécifique sur un manga."""
    data = request.get_json() or {}
    volume = clean_int(data.get("volume"))
    if volume is None or volume < 1:
        return jsonify({"error": "Numéro de tome invalide"}), 400

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT owned_volumes FROM media_items WHERE id = %s;", (item_id,))
            row = cur.fetchone()
            if not row:
                return jsonify({"error": "Introuvable"}), 404

            volumes = set(row["owned_volumes"] or [])
            if volume in volumes:
                volumes.remove(volume)
            else:
                volumes.add(volume)

            sorted_vols = sorted(volumes)
            cur.execute(
                """
                UPDATE media_items
                SET owned_volumes = %s, is_owned = %s
                WHERE id = %s
                RETURNING *;
                """,
                (sorted_vols, len(sorted_vols) > 0, item_id),
            )
            updated = cur.fetchone()
            conn.commit()

    return jsonify(serialize_row(updated))


@app.route("/api/media/<int:item_id>", methods=["DELETE"])
def delete_media(item_id):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM media_items WHERE id = %s RETURNING id;", (item_id,))
            deleted = cur.fetchone()
            conn.commit()

    if not deleted:
        return jsonify({"error": "Introuvable"}), 404
    return jsonify({"deleted": item_id})

@app.route("/api/media/<int:item_id>", methods=["PATCH"])
def patch_media(item_id):
    data = request.get_json() or {}
    allowed = {
        "status", "is_owned", "is_wishlist", "is_read",
        "current_progress", "total_progress", "current_season",
        "owned_volumes", "total_volumes", "seasons_data", "rating", "notes"
    }

    updates = []
    values = []
    for key, val in data.items():
        if key not in allowed:
            continue
        if key == "seasons_data":
            updates.append("seasons_data = %s")
            values.append(Json(val))
        elif key == "owned_volumes":
            vols = sorted({int(v) for v in (val or []) if str(v).isdigit()})
            updates.append("owned_volumes = %s")
            values.append(vols)
        else:
            updates.append(f"{key} = %s")
            values.append(val)

    if not updates:
        return jsonify({"error": "Aucun champ valide"}), 400

    values.append(item_id)
    sql = f"UPDATE media_items SET {', '.join(updates)} WHERE id = %s RETURNING *;"

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, values)
            updated = cur.fetchone()
            conn.commit()

    if not updated:
        return jsonify({"error": "Introuvable"}), 404
    return jsonify(serialize_row(updated))

@app.route("/api/media/<int:item_id>/sync-seasons", methods=["POST"])
def sync_seasons(item_id):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM media_items WHERE id = %s;", (item_id,))
            item = cur.fetchone()
            if not item:
                return jsonify({"error": "Introuvable"}), 404

            if item["category"] != "series" or item["external_source"] != "tmdb" or not item["external_id"]:
                return jsonify({"error": "Synchronisation disponible uniquement pour les séries TMDB"}), 400

            fetched_seasons, fetched_total = get_tmdb_series_seasons(item["external_id"])
            if not fetched_seasons:
                return jsonify({"error": "Aucune saison trouvée sur TMDB"}), 404

            # Conserve les épisodes déjà cochés par saison
            existing_map = {
                s["season"]: s.get("watched", [])
                for s in (item.get("seasons_data") or [])
            }
            merged = []
            for s in fetched_seasons:
                old_watched = [e for e in existing_map.get(s["season"], []) if e <= s["total_episodes"]]
                merged.append({
                    "season": s["season"],
                    "total_episodes": s["total_episodes"],
                    "watched": sorted(old_watched),
                })

            total_watched = sum(len(s["watched"]) for s in merged)

            cur.execute(
                """
                UPDATE media_items
                SET seasons_data = %s, current_progress = %s, total_progress = %s
                WHERE id = %s
                RETURNING *;
                """,
                (Json(merged), total_watched, fetched_total, item_id),
            )
            updated = cur.fetchone()
            conn.commit()

    return jsonify(serialize_row(updated))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)