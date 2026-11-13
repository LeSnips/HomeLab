FROM python:3.13-slim

WORKDIR /app

# Installe les dépendances système minimales (rien de spécial ici, mais utile si tu ajoutes des libs qui compilent du C plus tard)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copie et installe les dépendances Python d'abord (meilleur cache Docker)
COPY requirement.txt .
RUN pip install --no-cache-dir -r requirement.txt

# Copie le reste du projet
COPY . .

# Le dossier instance/ doit exister pour que SQLite puisse y créer database.db
RUN mkdir -p instance

EXPOSE 5000

# Gunicorn : 2 workers suffisent largement pour un usage perso sur Raspberry Pi
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "wsgi:app"]