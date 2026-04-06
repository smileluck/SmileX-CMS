import os
import logging
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

BASE_DIR = Path(__file__).resolve().parent.parent

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'cas.db'}")

BASE_STORAGE_DIR = Path(os.getenv("BASE_STORAGE_DIR", str(BASE_DIR / "storage")))
UPLOADS_DIR = Path(os.getenv("UPLOADS_DIR", str(BASE_DIR / "uploads")))

ARTICLES_DIR = BASE_STORAGE_DIR / "articles"
VIDEOS_DIR = BASE_STORAGE_DIR / "videos"

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    logging.warning(
        "SECRET_KEY not set. Using a random key. Set SECRET_KEY env var for production."
    )
    SECRET_KEY = os.urandom(32).hex()

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))
DEBUG = os.getenv("DEBUG", "false").lower() == "true"

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173")

MAX_UPLOAD_SIZE = int(os.getenv("MAX_UPLOAD_SIZE", str(100 * 1024 * 1024)))

ALLOWED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".svg",
    ".mp4",
    ".mov",
    ".avi",
    ".mkv",
    ".webm",
    ".mp3",
    ".wav",
    ".ogg",
    ".flac",
    ".pdf",
    ".doc",
    ".docx",
}

for d in [BASE_STORAGE_DIR, ARTICLES_DIR, VIDEOS_DIR, UPLOADS_DIR]:
    d.mkdir(parents=True, exist_ok=True)
