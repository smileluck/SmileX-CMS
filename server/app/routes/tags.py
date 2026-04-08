import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models.user import User
from ..models.tag import Tag, ArticleTag
from ..models.article import Article
from ..schemas.tag import TagCreate, TagUpdate, TagResponse
from ..dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tags", tags=["tags"])


@router.get("", response_model=List[TagResponse])
def get_tags(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count_subq = (
        db.query(
            ArticleTag.tag_id,
            func.count(ArticleTag.article_id).label("article_count"),
        )
        .group_by(ArticleTag.tag_id)
        .subquery()
    )

    video_count_subq = (
        db.query(
            ArticleTag.tag_id,
            func.count(ArticleTag.article_id).label("video_count"),
        )
        .join(Article, Article.id == ArticleTag.article_id)
        .filter(Article.article_type == "video")
        .group_by(ArticleTag.tag_id)
        .subquery()
    )

    tags = (
        db.query(
            Tag,
            func.coalesce(count_subq.c.article_count, 0).label("article_count"),
            func.coalesce(video_count_subq.c.video_count, 0).label("video_count"),
        )
        .outerjoin(count_subq, Tag.id == count_subq.c.tag_id)
        .outerjoin(video_count_subq, Tag.id == video_count_subq.c.tag_id)
        .filter(Tag.user_id == current_user.id)
        .order_by(Tag.name)
        .all()
    )

    result = []
    for tag, article_count, video_count in tags:
        result.append(
            TagResponse(
                id=tag.id,
                name=tag.name,
                color=tag.color,
                user_id=tag.user_id,
                article_count=article_count,
                video_count=video_count,
                created_at=tag.created_at,
            )
        )
    return result


@router.post("", response_model=TagResponse)
def create_tag(
    tag_create: TagCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(Tag)
        .filter(Tag.name == tag_create.name, Tag.user_id == current_user.id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tag with this name already exists",
        )

    db_tag = Tag(
        name=tag_create.name,
        color=tag_create.color,
        user_id=current_user.id,
    )
    db.add(db_tag)
    db.commit()
    db.refresh(db_tag)
    return TagResponse(
        id=db_tag.id,
        name=db_tag.name,
        color=db_tag.color,
        user_id=db_tag.user_id,
        article_count=0,
        video_count=0,
        created_at=db_tag.created_at,
    )


@router.put("/{tag_id}", response_model=TagResponse)
def update_tag(
    tag_id: int,
    tag_update: TagUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tag = db.query(Tag).filter(Tag.id == tag_id, Tag.user_id == current_user.id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    if tag_update.name is not None:
        existing = (
            db.query(Tag)
            .filter(
                Tag.name == tag_update.name,
                Tag.user_id == current_user.id,
                Tag.id != tag_id,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Tag with this name already exists",
            )

    for field, value in tag_update.model_dump(exclude_unset=True).items():
        setattr(tag, field, value)
    db.commit()
    db.refresh(tag)

    article_count = (
        db.query(func.count(ArticleTag.article_id))
        .filter(ArticleTag.tag_id == tag.id)
        .scalar()
        or 0
    )

    video_count = (
        db.query(func.count(ArticleTag.article_id))
        .join(Article, Article.id == ArticleTag.article_id)
        .filter(ArticleTag.tag_id == tag.id, Article.article_type == "video")
        .scalar()
        or 0
    )

    return TagResponse(
        id=tag.id,
        name=tag.name,
        color=tag.color,
        user_id=tag.user_id,
        article_count=article_count,
        video_count=video_count,
        created_at=tag.created_at,
    )


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(
    tag_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tag = db.query(Tag).filter(Tag.id == tag_id, Tag.user_id == current_user.id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    db.query(ArticleTag).filter(ArticleTag.tag_id == tag_id).delete()
    db.delete(tag)
    db.commit()


@router.get("/{tag_id}/articles")
def get_tag_articles(
    tag_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tag = db.query(Tag).filter(Tag.id == tag_id, Tag.user_id == current_user.id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    article_ids = (
        db.query(ArticleTag.article_id).filter(ArticleTag.tag_id == tag_id).subquery()
    )
    articles = (
        db.query(Article)
        .filter(Article.id.in_(article_ids), Article.author_id == current_user.id)
        .order_by(Article.updated_at.desc())
        .all()
    )
    return articles


@router.post("/migrate-legacy")
def migrate_legacy_tags(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    articles = (
        db.query(Article)
        .filter(Article.author_id == current_user.id, Article.tags.isnot(None))
        .all()
    )

    migrated = 0
    for article in articles:
        if not isinstance(article.tags, list):
            continue
        for tag_name in article.tags:
            if not isinstance(tag_name, str) or not tag_name.strip():
                continue
            tag_name = tag_name.strip()

            tag_obj = (
                db.query(Tag)
                .filter(Tag.name == tag_name, Tag.user_id == current_user.id)
                .first()
            )
            if not tag_obj:
                tag_obj = Tag(name=tag_name, user_id=current_user.id)
                db.add(tag_obj)
                db.flush()

            existing_link = (
                db.query(ArticleTag)
                .filter(
                    ArticleTag.article_id == article.id, ArticleTag.tag_id == tag_obj.id
                )
                .first()
            )
            if not existing_link:
                db.add(ArticleTag(article_id=article.id, tag_id=tag_obj.id))
                migrated += 1

    db.commit()
    return {"migrated": migrated}
