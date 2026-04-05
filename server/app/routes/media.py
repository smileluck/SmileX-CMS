import os
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..models.article import Article
from ..models.media import Media
from ..schemas.media import MediaResponse
from ..snowid import generate_snow_id
from ..config import UPLOADS_DIR, ARTICLES_DIR
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/media", tags=["media"])


@router.post("/upload", response_model=MediaResponse)
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    snow_id = generate_snow_id()
    ext = os.path.splitext(file.filename or "file")[1]
    filename = f"{snow_id}{ext}"
    file_path = UPLOADS_DIR / filename

    content = await file.read()
    file_path.write_bytes(content)

    mime_type = file.content_type or "application/octet-stream"
    media_type = (
        "image"
        if mime_type.startswith("image/")
        else "video"
        if mime_type.startswith("video/")
        else "other"
    )

    db_media = Media(
        snow_id=snow_id,
        filename=file.filename or filename,
        file_path=f"uploads/{filename}",
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

    article_dir = Path(article.file_path) if article.file_path else None
    if not article_dir or not article_dir.is_absolute():
        article_dir = ARTICLES_DIR.parent / (article.file_path or "")
    article_dir.mkdir(parents=True, exist_ok=True)

    snow_id = generate_snow_id()
    ext = os.path.splitext(file.filename or "file")[1]
    filename = f"{snow_id}{ext}"
    dest = article_dir / filename

    content = await file.read()
    dest.write_bytes(content)

    relative_path = f"./{filename}"

    mime_type = file.content_type or "application/octet-stream"
    media_type = (
        "image"
        if mime_type.startswith("image/")
        else "video"
        if mime_type.startswith("video/")
        else "other"
    )

    db_media = Media(
        snow_id=snow_id,
        filename=file.filename or filename,
        file_path=str(dest),
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
    skip: int = 0,
    limit: int = 100,
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


@router.delete("/{media_id}")
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
    if file_path.exists():
        file_path.unlink()
    db.delete(media)
    db.commit()
    return {"message": "Media deleted"}
