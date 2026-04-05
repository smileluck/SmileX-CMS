import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'cas.db'}")

ARTICLES_DIR = Path(os.getenv("ARTICLES_DIR", str(BASE_DIR / "articles")))
VIDEOS_DIR = Path(os.getenv("VIDEOS_DIR", str(BASE_DIR / "videos")))
UPLOADS_DIR = Path(os.getenv("UPLOADS_DIR", str(BASE_DIR / "uploads")))

SECRET_KEY = os.getenv("SECRET_KEY", "smilex-cas-secret-key-change-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))
DEBUG = os.getenv("DEBUG", "true").lower() == "true"

for d in [ARTICLES_DIR, VIDEOS_DIR, UPLOADS_DIR]:
    d.mkdir(parents=True, exist_ok=True)
