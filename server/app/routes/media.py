import shutil
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session, joinedload
from ..database import get_db
from ..models.user import User
from ..models.article import Article
from ..models.media import Media
from ..schemas.media import MediaResponse
from ..snowid import generate_snow_id
from ..config import BASE_STORAGE_DIR, MAX_UPLOAD_SIZE, ALLOWED_EXTENSIONS
from ..routes.settings import (
    get_articles_dir as _get_articles_dir,
    get_videos_dir as _get_videos_dir,
    get_media_dir as _get_media_dir,
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
    media_dir = _get_media_dir(db, current_user.id)
    file_path = media_dir / safe_filename

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

    logger.info(
        "Uploaded file: filename=%s, mime_type=%s, size=%d bytes, media_type=%s, saved_to=%s",
        filename,
        mime_type,
        len(content),
        media_type,
        str(file_path),
    )

    relative_path = file_path.relative_to(BASE_STORAGE_DIR).as_posix()

    db_media = Media(
        snow_id=snow_id,
        filename=filename,
        file_path=relative_path,
        file_type=mime_type,
        file_size=len(content),
        media_type=media_type,
        user_id=current_user.id,
    )
    db.add(db_media)
    db.commit()
    db.refresh(db_media)

    logger.info(
        "Media record created: snow_id=%s, db_file_path=%s, user_id=%d",
        snow_id,
        relative_path,
        current_user.id,
    )

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
        article_dir.relative_to(BASE_STORAGE_DIR).as_posix() + f"/images/{safe_filename}"
    )
    markdown_path = f"images/{safe_filename}"

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

    logger.info(
        "Uploaded file to article: filename=%s, mime_type=%s, size=%d bytes, media_type=%s, saved_to=%s, article_id=%d",
        filename,
        mime_type,
        len(content),
        media_type,
        str(dest),
        article_id,
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

    logger.info(
        "Media record created: snow_id=%s, db_file_path=%s, article_id=%d, user_id=%d",
        snow_id,
        relative_path,
        article_id,
        current_user.id,
    )

    resp = MediaResponse.model_validate(db_media)
    resp.markdown_path = markdown_path
    return resp


@router.post("/copy-to-article/{article_id}/{media_id}", response_model=MediaResponse)
def copy_media_to_article(
    article_id: int,
    media_id: int,
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

    media = (
        db.query(Media)
        .filter(Media.id == media_id, Media.user_id == current_user.id)
        .first()
    )
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    src_path = Path(media.file_path)
    if not src_path.is_absolute():
        src_path = BASE_STORAGE_DIR / src_path
    if not src_path.exists():
        raise HTTPException(status_code=404, detail="Source file not found")

    article_dir = _resolve_article_dir(article, db, current_user.id)
    images_dir = article_dir / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(media.filename).suffix.lower() or Path(media.file_path).suffix.lower()
    snow_id = generate_snow_id()
    now = datetime.now(timezone.utc)
    timestamp = now.strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{snow_id}{ext}"
    dest = images_dir / safe_filename

    try:
        shutil.copy2(str(src_path), str(dest))
    except OSError as e:
        logger.error("Failed to copy media file to article: %s", e)
        raise HTTPException(status_code=500, detail="Failed to copy file")

    relative_path = (
        article_dir.relative_to(BASE_STORAGE_DIR).as_posix() + f"/images/{safe_filename}"
    )
    markdown_path = f"images/{safe_filename}"

    media.file_path = relative_path
    media.article_id = article_id
    db.commit()
    db.refresh(media)

    logger.info(
        "Copied media to article: media_id=%d, article_id=%d, new_path=%s",
        media_id,
        article_id,
        relative_path,
    )

    resp = MediaResponse.model_validate(media)
    resp.markdown_path = markdown_path
    return resp


@router.get("", response_model=List[MediaResponse])
def get_media_files(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    media_type: Optional[str] = None,
    article_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = (
        db.query(Media)
        .filter(Media.user_id == current_user.id)
        .options(joinedload(Media.article))
    )
    if media_type:
        q = q.filter(Media.media_type == media_type)
    if article_id:
        q = q.filter(Media.article_id == article_id)
    return q.order_by(Media.created_at.desc()).offset(skip).limit(limit).unique().all()


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

    file_path = Path(media.file_path)
    if not file_path.is_absolute():
        file_path = BASE_STORAGE_DIR / file_path

    if media.article_id is None and file_path.exists():
        try:
            file_path.unlink()
        except OSError as e:
            logger.warning("Failed to delete media file %s: %s", file_path, e)
    db.delete(media)
    db.commit()
