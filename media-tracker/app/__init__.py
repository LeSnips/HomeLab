import os
from flask import Flask
from app.models import close_db, init_db

def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-key-change-in-production')
    
    # Enregistrement du nettoyage de la connexion SQLite après chaque requête
    app.teardown_appcontext(close_db)

    # Initialisation de la base de données dans le contexte de l'application
    with app.app_context():
        init_db()

    # Enregistrement des routes (Blueprint)
    from app.routes import main_bp
    app.register_blueprint(main_bp)

    return app