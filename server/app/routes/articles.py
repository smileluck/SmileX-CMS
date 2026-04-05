import re
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..models.article import Article
from ..models.group import Group
from ..models.media import Media
from ..schemas.article import ArticleCreate, ArticleUpdate, ArticleResponse
from ..snowid import generate_snow_id
from ..config import ARTICLES_DIR
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/articles", tags=["articles"])


def _sanitize_filename(name: str) -> str:
    return re.sub(r'[\\/:*?"<>|]', "_", name)[:80]


def _article_dir(snow_id: str, title: str) -> Path:
    return ARTICLES_DIR / f"{snow_id}_{_sanitize_filename(title)}"


@router.post("", response_model=ArticleResponse)
def create_article(
    article: ArticleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    snow_id = generate_snow_id()
    article_dir = _article_dir(snow_id, article.title)
    article_dir.mkdir(parents=True, exist_ok=True)

    md_path = article_dir / "index.md"
    md_path.write_text(article.content, encoding="utf-8")

    db_article = Article(
        snow_id=snow_id,
        title=article.title,
        content=article.content,
        summary=article.summary,
        article_type=article.article_type,
        cover_image=article.cover_image,
        group_id=article.group_id,
        tags=article.tags,
        author_id=current_user.id,
        file_path=str(article_dir.relative_to(ARTICLES_DIR.parent)),
    )
    db.add(db_article)
    db.commit()
    db.refresh(db_article)
    return db_article


@router.get("", response_model=List[ArticleResponse])
def get_articles(
    skip: int = 0,
    limit: int = 50,
    group_id: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    article_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Article).filter(Article.author_id == current_user.id)
    if group_id is not None:
        q = q.filter(Article.group_id == group_id)
    if status:
        q = q.filter(Article.status == status)
    if article_type:
        q = q.filter(Article.article_type == article_type)
    if search:
        q = q.filter(Article.title.ilike(f"%{search}%"))
    return q.order_by(Article.updated_at.desc()).offset(skip).limit(limit).all()


@router.get("/{article_id}", response_model=ArticleResponse)
def get_article(
    article_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    article = (
        db.query(Article)
        .filter(Article.id == article_id, Article.author_id == current_user.id)
        .first()
    )
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Article not found"
        )
    return article


@router.put("/{article_id}", response_model=ArticleResponse)
def update_article(
    article_id: int,
    article_update: ArticleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    article = (
        db.query(Article)
        .filter(Article.id == article_id, Article.author_id == current_user.id)
        .first()
    )
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Article not found"
        )

    update_data = article_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(article, field, value)

    if article_update.content is not None:
        article_dir = (
            Path(article.file_path)
            if article.file_path
            else _article_dir(article.snow_id, article.title)
        )
        if not article_dir.is_absolute():
            article_dir = ARTICLES_DIR.parent / article_dir
        article_dir.mkdir(parents=True, exist_ok=True)
        (article_dir / "index.md").write_text(article_update.content, encoding="utf-8")

    db.commit()
    db.refresh(article)
    return article


@router.delete("/{article_id}")
def delete_article(
    article_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    article = (
        db.query(Article)
        .filter(Article.id == article_id, Article.author_id == current_user.id)
        .first()
    )
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Article not found"
        )

    import shutil

    if article.file_path:
        article_dir = Path(article.file_path)
        if not article_dir.is_absolute():
            article_dir = ARTICLES_DIR.parent / article_dir
        if article_dir.exists():
            shutil.rmtree(article_dir, ignore_errors=True)

    db.delete(article)
    db.commit()
    return {"message": "Article deleted successfully"}


@router.post("/{article_id}/duplicate", response_model=ArticleResponse)
def duplicate_article(
    article_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    article = (
        db.query(Article)
        .filter(Article.id == article_id, Article.author_id == current_user.id)
        .first()
    )
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Article not found"
        )

    snow_id = generate_snow_id()
    new_title = f"{article.title} (副本)"
    article_dir = _article_dir(snow_id, new_title)
    article_dir.mkdir(parents=True, exist_ok=True)
    (article_dir / "index.md").write_text(article.content, encoding="utf-8")

    new_article = Article(
        snow_id=snow_id,
        title=new_title,
        content=article.content,
        summary=article.summary,
        article_type=article.article_type,
        group_id=article.group_id,
        tags=article.tags,
        author_id=current_user.id,
        file_path=str(article_dir.relative_to(ARTICLES_DIR.parent)),
    )
    db.add(new_article)
    db.commit()
    db.refresh(new_article)
    return new_article
