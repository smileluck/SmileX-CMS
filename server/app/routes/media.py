import os
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..models.article import Article
from ..models.media import Media
from ..schemas.media import MediaResponse
from ..snowid import generate_snow_id
from ..config import UPLOADS_DIR, BASE_STORAGE_DIR, MAX_UPLOAD_SIZE, ALLOWED_EXTENSIONS
from ..routes.settings import (
    get_articles_dir as _get_articles_dir,
    get_videos_dir as _get_videos_dir,
    _get_base_storage_dir,
)
from ..dependencies import get_current_user

from .articles import _article_dir as _calc_article_dir

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/media", tags=["media"])


def validate_file_extension(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' is not allowed. Allowed types: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )
    return ext


def _get_content_dir(article_type: str, db: Session, user_id: int) -> Path:
    if article_type == "video":
        return _get_videos_dir(db, user_id)
    return _get_articles_dir(db, user_id)


def _resolve_article_dir(article: Article, db: Session, user_id: int) -> Path:
    content_dir = _get_content_dir(article.article_type, db, user_id)
    if article.file_path:
        p = Path(article.file_path)
        if not p.is_absolute():
            p = BASE_STORAGE_DIR / p
        return p
    return _calc_article_dir(article.snow_id, article.title, content_dir)


@router.post("/upload", response_model=MediaResponse)
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    filename = file.filename or "file"
    ext = validate_file_extension(filename)

    content = await file.read(MAX_UPLOAD_SIZE + 1)
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max size: {MAX_UPLOAD_SIZE // (1024 * 1024)}MB",
        )

    snow_id = generate_snow_id()
    safe_filename = f"{snow_id}{ext}"
    file_path = UPLOADS_DIR / safe_filename

    try:
        file_path.write_bytes(content)
    except OSError as e:
        logger.error("Failed to write uploaded file: %s", e)
        raise HTTPException(status_code=500, detail="Failed to save file")

    mime_type = file.content_type or "application/octet-stream"
    media_type = (
        "image"
        if mime_type.startswith("image/")
        else "video"
        if mime_type.startswith("video/")
        else "audio"
        if mime_type.startswith("audio/")
        else "other"
    )

    db_media = Media(
        snow_id=snow_id,
        filename=filename,
        file_path=f"uploads/{safe_filename}",
        file_type=mime_type,
        file_size=len(content),
        media_type=media_type,
        user_id=current_user.id,
    )
    db.add(db_media)
    db.commit()
    db.refresh(db_media)
    return db_media


@router.post("/upload-to-article/{article_id}", response_model=MediaResponse)
async def upload_to_article(
    article_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    article = (
        db.query(Article)
        .filter(Article.id == article_id, Article.author_id == current_user.id)
        .first()
    )
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    filename = file.filename or "file"
    ext = validate_file_extension(filename)

    content = await file.read(MAX_UPLOAD_SIZE + 1)
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max size: {MAX_UPLOAD_SIZE // (1024 * 1024)}MB",
        )

    article_dir = _resolve_article_dir(article, db, current_user.id)
    images_dir = article_dir / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

    snow_id = generate_snow_id()
    now = datetime.now(timezone.utc)
    timestamp = now.strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{snow_id}{ext}"
    dest = images_dir / safe_filename

    try:
        dest.write_bytes(content)
    except OSError as e:
        logger.error("Failed to write article file: %s", e)
        raise HTTPException(status_code=500, detail="Failed to save file")

    content_dir = _get_content_dir(article.article_type, db, current_user.id)
    relative_path = (
        str(article_dir.relative_to(BASE_STORAGE_DIR)) + f"/images/{safe_filename}"
    )

    mime_type = file.content_type or "application/octet-stream"
    media_type = (
        "image"
        if mime_type.startswith("image/")
        else "video"
        if mime_type.startswith("video/")
        else "audio"
        if mime_type.startswith("audio/")
        else "other"
    )

    db_media = Media(
        snow_id=snow_id,
        filename=filename,
        file_path=relative_path,
        file_type=mime_type,
        file_size=len(content),
        media_type=media_type,
        article_id=article_id,
        user_id=current_user.id,
    )
    db.add(db_media)
    db.commit()
    db.refresh(db_media)
    return db_media


@router.get("", response_model=List[MediaResponse])
def get_media_files(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    media_type: Optional[str] = None,
    article_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Media).filter(Media.user_id == current_user.id)
    if media_type:
        q = q.filter(Media.media_type == media_type)
    if article_id:
        q = q.filter(Media.article_id == article_id)
    return q.order_by(Media.created_at.desc()).offset(skip).limit(limit).all()


@router.delete("/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_media_file(
    media_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    media = (
        db.query(Media)
        .filter(Media.id == media_id, Media.user_id == current_user.id)
        .first()
    )
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    if media.article_id:
        article = db.query(Article).filter(Article.id == media.article_id).first()
        if article:
            file_path = BASE_STORAGE_DIR / media.file_path
        else:
            file_path = Path(media.file_path)
    else:
        file_path = Path(media.file_path)
        if not file_path.is_absolute():
            file_path = UPLOADS_DIR / file_path

    if file_path.exists():
        try:
            file_path.unlink()
        except OSError as e:
            logger.warning("Failed to delete media file %s: %s", file_path, e)
    db.delete(media)
    db.commit()
