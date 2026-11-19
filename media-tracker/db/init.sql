CREATE TYPE media_category AS ENUM (
    'anime',
    'movie',
    'series',
    'book',
    'webtoon',
    'manga'
);

CREATE TYPE watch_status AS ENUM (
    'en_cours',
    'termine',
    'envie',
    'pause'
);

CREATE TABLE IF NOT EXISTS media_items (
    id SERIAL PRIMARY KEY,
    category media_category NOT NULL,
    
    -- Infos de base (importées via API ou saisies/modifiées manuellement)
    title VARCHAR(255) NOT NULL,
    original_title VARCHAR(255),
    cover_url TEXT,
    synopsis TEXT,
    release_year INT,
    external_id VARCHAR(100),
    external_source VARCHAR(50) DEFAULT 'manual', -- 'tmdb', 'anilist', 'google_books', 'manual'

    -- Statut pour Animés, Films, Séries, Webtoons
    status watch_status,

    -- États cumulables pour Livres & Mangas
    is_owned BOOLEAN DEFAULT FALSE,
    is_wishlist BOOLEAN DEFAULT FALSE,
    is_read BOOLEAN DEFAULT FALSE,

    -- Suivi de progression
    -- Animé/Série = épisodes vus | Manga/Webtoon = chapitres lus
    current_progress INT DEFAULT 0,
    total_progress INT,
    current_season INT DEFAULT 1, -- Utile pour les séries
    seasons_data JSONB DEFAULT '[]'::jsonb

    -- Spécifique Mangas : liste exacte des tomes possédés (ex: {1, 2, 3, 4})
    owned_volumes INTEGER[] DEFAULT '{}',
    total_volumes INT,

    -- Infos personnelles
    rating NUMERIC(3, 1) CHECK (rating >= 0 AND rating <= 10),
    notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour accélérer le filtrage par onglet et statut
CREATE INDEX idx_media_category ON media_items(category);
CREATE INDEX idx_media_status ON media_items(status);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_media_items_updated_at
    BEFORE UPDATE ON media_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();