# app/models.py
import sqlite3
from flask import g, current_app
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'database.db')


def get_db():
    """Retourne une connexion SQLite unique par requête (stockée dans g)."""
    if 'db' not in g:
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute('PRAGMA foreign_keys = ON')
    return g.db


def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()


def init_db():
    """Crée les tables si elles n'existent pas encore."""
    db = get_db()
    db.executescript('''
        CREATE TABLE IF NOT EXISTS media (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            type TEXT NOT NULL,             -- manga, anime, webtoon, serie, film, livres
            cover_image TEXT,
            external_id TEXT,               -- id AniList/TMDB pour éviter les doublons
            total_units INTEGER DEFAULT 0,  -- nb tomes/chapitres/épisodes total (0 = inconnu)
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            media_id INTEGER NOT NULL,
            current_unit INTEGER DEFAULT 0,
            status TEXT DEFAULT 'plan',     -- watching/completed/dropped/plan (ou pal/owned/missing/wishlist pour manga)
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
        );
    ''')
    db.commit()


def get_all_media(media_type=None, status=None):
    db = get_db()
    query = '''
        SELECT media.*, progress.current_unit, progress.status
        FROM media
        JOIN progress ON progress.media_id = media.id
        WHERE 1=1
    '''
    params = []

    if media_type:
        query += ' AND media.type = ?'
        params.append(media_type)
    if status:
        query += ' AND progress.status = ?'
        params.append(status)

    query += ' ORDER BY media.created_at DESC'
    return db.execute(query, params).fetchall()


def add_media(title, media_type, status='watching', cover_image='', external_id=None, total_units=0):
    db = get_db()
    cur = db.execute(
        'INSERT INTO media (title, type, cover_image, external_id, total_units) VALUES (?, ?, ?, ?, ?)',
        (title, media_type, cover_image, external_id, total_units)
    )
    media_id = cur.lastrowid
    db.execute(
        'INSERT INTO progress (media_id, current_unit, status) VALUES (?, 0, ?)',
        (media_id, status)
    )
    db.commit()
    return media_id


def update_progress(media_id, current_unit, status=None):
    db = get_db()
    if status:
        db.execute(
            'UPDATE progress SET current_unit = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE media_id = ?',
            (current_unit, status, media_id)
        )
    else:
        db.execute(
            'UPDATE progress SET current_unit = ?, updated_at = CURRENT_TIMESTAMP WHERE media_id = ?',
            (current_unit, media_id)
        )
    db.commit()


def delete_media(media_id):
    db = get_db()
    db.execute('DELETE FROM media WHERE id = ?', (media_id,))  # CASCADE supprime la progress associée
    db.commit()

def get_media_by_external_id(external_id):
    db = get_db()
    return db.execute(
        'SELECT * FROM media WHERE external_id = ?', (external_id,)
    ).fetchone()