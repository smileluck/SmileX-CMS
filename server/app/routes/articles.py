import re
import difflib
import shutil
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..models.article import Article
from ..models.article_version import ArticleVersion
from ..models.group import Group
from ..models.media import Media
from ..models.publish_task import PublishTask
from ..models.platform import PlatformAccount
from ..models.tag import Tag, ArticleTag
from ..schemas.article import (
    ArticleCreate,
    ArticleUpdate,
    ArticleResponse,
    TagBrief,
    ArticleVersionResponse,
    ArticleVersionBrief,
)
from ..snowid import generate_snow_id
from ..config import BASE_STORAGE_DIR
from ..routes.settings import (
    get_articles_dir as _get_articles_dir,
    get_videos_dir as _get_videos_dir,
    _get_base_storage_dir,
)
from ..dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/articles", tags=["articles"])


def _get_content_dir(article_type: str, db: Session, user_id: int) -> Path:
    if article_type == "video":
        return _get_videos_dir(db, user_id)
    return _get_articles_dir(db, user_id)


def _sanitize_filename(name: str) -> str:
    sanitized = re.sub(r'[\\/:*?"<>|\s]', "_", name)[:80]
    sanitized = sanitized.strip("_.")
    if not sanitized:
        sanitized = "untitled"
    return sanitized


def _article_dir(snow_id: str, title: str, base_dir: Path = None) -> Path:
    base = base_dir or BASE_STORAGE_DIR
    return base / f"{_sanitize_filename(title)}-{snow_id}"


def _resolve_article_dir(article: Article, base_dir: Path = None) -> Path:
    base = base_dir or BASE_STORAGE_DIR
    if article.file_path:
        p = Path(article.file_path)
        if not p.is_absolute():
            p = BASE_STORAGE_DIR / p
        return p
    return _article_dir(article.snow_id, article.title, base)


def _sync_article_tags(db: Session, article: Article, tag_ids: List[int], user_id: int):
    db.query(ArticleTag).filter(ArticleTag.article_id == article.id).delete()
    for tid in tag_ids:
        tag = db.query(Tag).filter(Tag.id == tid, Tag.user_id == user_id).first()
        if tag:
            db.add(ArticleTag(article_id=article.id, tag_id=tag.id))
    tag_names = []
    for tid in tag_ids:
        tag = db.query(Tag).filter(Tag.id == tid, Tag.user_id == user_id).first()
        if tag:
            tag_names.append(tag.name)
    article.tags = tag_names


def _article_to_response(article: Article, db: Session = None) -> dict:
    tag_objects = []
    if article.tags_rel:
        tag_objects = [
            TagBrief(id=t.id, name=t.name, color=t.color) for t in article.tags_rel
        ]
    version_count = 0
    current_version = None
    if db is not None:
        version_count = (
            db.query(ArticleVersion)
            .filter(ArticleVersion.article_id == article.id)
            .count()
        )
        latest = (
            db.query(ArticleVersion)
            .filter(ArticleVersion.article_id == article.id)
            .order_by(ArticleVersion.version_number.desc())
            .first()
        )
        if latest:
            current_version = latest.version_number
    return {
        "id": article.id,
        "snow_id": article.snow_id,
        "title": article.title,
        "content": article.content,
        "summary": article.summary,
        "article_type": article.article_type,
        "status": article.status,
        "file_path": article.file_path,
        "cover_image": article.cover_image,
        "group_id": article.group_id,
        "author_id": article.author_id,
        "tags": article.tags,
        "tag_objects": tag_objects,
        "metadata": article.article_metadata,
        "current_version": current_version,
        "version_count": version_count,
        "created_at": article.created_at,
        "updated_at": article.updated_at,
    }


@router.post("", response_model=ArticleResponse)
def create_article(
    article: ArticleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    snow_id = generate_snow_id()
    content_dir = _get_content_dir(article.article_type, db, current_user.id)
    article_dir = _article_dir(snow_id, article.title, content_dir)
    try:
        article_dir.mkdir(parents=True, exist_ok=True)
        (article_dir / "images").mkdir(exist_ok=True)
        (article_dir / "index.md").write_text(article.content, encoding="utf-8")
    except OSError as e:
        logger.error("Failed to create article directory: %s", e)
        raise HTTPException(status_code=500, detail="Failed to create article files")

    db_article = Article(
        snow_id=snow_id,
        title=article.title,
        content=article.content,
        summary=article.summary,
        article_type=article.article_type,
        cover_image=article.cover_image,
        group_id=article.group_id,
        tags=article.tags or [],
        author_id=current_user.id,
        file_path=article_dir.relative_to(BASE_STORAGE_DIR).as_posix(),
    )
    db.add(db_article)
    db.flush()

    if article.tag_ids:
        _sync_article_tags(db, db_article, article.tag_ids, current_user.id)

    db.commit()
    db.refresh(db_article)
    return _article_to_response(db_article, db)


@router.get("", response_model=List[ArticleResponse])
def get_articles(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    group_id: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    article_type: Optional[str] = None,
    tag_id: Optional[int] = None,
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
    if tag_id is not None:
        article_ids_sub = (
            db.query(ArticleTag.article_id)
            .filter(ArticleTag.tag_id == tag_id)
            .subquery()
        )
        q = q.filter(Article.id.in_(article_ids_sub))
    articles = q.order_by(Article.updated_at.desc()).offset(skip).limit(limit).all()
    return [_article_to_response(a, db) for a in articles]


@router.get("/publish-summary/batch")
def get_articles_publish_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_articles = db.query(Article).filter(Article.author_id == current_user.id).all()
    article_ids = [a.id for a in user_articles]

    if not article_ids:
        return {}

    tasks = (
        db.query(PublishTask, PlatformAccount)
        .join(PlatformAccount, PublishTask.platform_account_id == PlatformAccount.id)
        .filter(PublishTask.article_id.in_(article_ids))
        .all()
    )

    summary: Dict[int, list] = {}
    for task, account in tasks:
        if task.article_id not in summary:
            summary[task.article_id] = []
        summary[task.article_id].append(
            {
                "platform_name": account.platform_name,
                "account_name": account.account_name,
                "status": task.status,
                "platform_post_url": task.platform_post_url,
                "error_message": task.error_message,
            }
        )
    return summary


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
    return _article_to_response(article, db)


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

    metadata_value = update_data.pop("metadata", None)
    tag_ids_value = update_data.pop("tag_ids", None)

    for field, value in update_data.items():
        setattr(article, field, value)

    if metadata_value is not None:
        article.article_metadata = metadata_value

    if tag_ids_value is not None:
        _sync_article_tags(db, article, tag_ids_value, current_user.id)

    if "title" in update_data and update_data["title"] and article.file_path:
        content_dir = _get_content_dir(article.article_type, db, current_user.id)
        old_dir = _resolve_article_dir(article, content_dir)
        new_dir_name = f"{_sanitize_filename(update_data['title'])}-{article.snow_id}"
        new_dir = content_dir / new_dir_name
        if old_dir.exists() and old_dir != new_dir:
            try:
                old_dir.rename(new_dir)
                article.file_path = new_dir.relative_to(BASE_STORAGE_DIR).as_posix()
            except OSError as e:
                logger.warning("Failed to rename article directory: %s", e)

    if article_update.content is not None:
        content_dir = _get_content_dir(article.article_type, db, current_user.id)
        article_dir = _resolve_article_dir(article, content_dir)
        try:
            article_dir.mkdir(parents=True, exist_ok=True)
            (article_dir / "images").mkdir(exist_ok=True)
            (article_dir / "index.md").write_text(
                article_update.content, encoding="utf-8"
            )
        except OSError as e:
            logger.error("Failed to write article content: %s", e)
            raise HTTPException(
                status_code=500, detail="Failed to save article content"
            )

    db.commit()
    db.refresh(article)
    return _article_to_response(article, db)


@router.delete("/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
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

    if article.file_path:
        content_dir = _get_content_dir(article.article_type, db, current_user.id)
        article_dir = _resolve_article_dir(article, content_dir)
        if article_dir.exists():
            shutil.rmtree(article_dir, ignore_errors=True)

    db.delete(article)
    db.commit()


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
    content_dir = _get_content_dir(article.article_type, db, current_user.id)
    article_dir = _article_dir(snow_id, new_title, content_dir)
    try:
        article_dir.mkdir(parents=True, exist_ok=True)
        (article_dir / "images").mkdir(exist_ok=True)
        (article_dir / "index.md").write_text(article.content, encoding="utf-8")
    except OSError as e:
        logger.error("Failed to duplicate article files: %s", e)
        raise HTTPException(status_code=500, detail="Failed to duplicate article")

    new_article = Article(
        snow_id=snow_id,
        title=new_title,
        content=article.content,
        summary=article.summary,
        article_type=article.article_type,
        group_id=article.group_id,
        tags=article.tags,
        metadata=article.article_metadata,
        author_id=current_user.id,
        file_path=article_dir.relative_to(BASE_STORAGE_DIR).as_posix(),
    )
    db.add(new_article)
    db.flush()

    existing_tag_ids = [t.id for t in article.tags_rel] if article.tags_rel else []
    if existing_tag_ids:
        _sync_article_tags(db, new_article, existing_tag_ids, current_user.id)

    db.commit()
    db.refresh(new_article)
    return _article_to_response(new_article, db)


@router.get("/{article_id}/publish-status")
def get_article_publish_status(
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
        raise HTTPException(status_code=404, detail="Article not found")

    tasks = (
        db.query(PublishTask, PlatformAccount)
        .join(PlatformAccount, PublishTask.platform_account_id == PlatformAccount.id)
        .filter(PublishTask.article_id == article_id)
        .all()
    )

    result = []
    for task, account in tasks:
        result.append(
            {
                "platform_name": account.platform_name,
                "account_name": account.account_name,
                "status": task.status,
                "platform_post_url": task.platform_post_url,
                "error_message": task.error_message,
                "task_id": task.id,
            }
        )
    return result


def _count_tables(content: str) -> int:
    lines = content.split("\n")
    count = 0
    i = 0
    while i < len(lines):
        if (
            "|" in lines[i]
            and i + 1 < len(lines)
            and re.match(r"^[\s|:-]+$", lines[i + 1])
        ):
            count += 1
            i += 2
            while i < len(lines) and "|" in lines[i]:
                i += 1
        else:
            i += 1
    return count


def _generate_change_summary(
    old_title: str | None,
    old_content: str | None,
    new_title: str,
    new_content: str,
) -> str:
    changes: list[str] = []

    if old_title is not None and old_title != new_title:
        changes.append(f"标题从「{old_title}」改为「{new_title}」")

    if old_content is not None and old_content != new_content:
        old_imgs = set(re.findall(r"!\[[^\]]*\]\([^)]+\)", old_content))
        new_imgs = set(re.findall(r"!\[[^\]]*\]\([^)]+\)", new_content))
        added_imgs = new_imgs - old_imgs
        removed_imgs = old_imgs - new_imgs
        if added_imgs:
            changes.append(f"图片新增 {len(added_imgs)} 张")
        if removed_imgs:
            changes.append(f"图片删除 {len(removed_imgs)} 张")

        old_tables = _count_tables(old_content)
        new_tables = _count_tables(new_content)
        if new_tables > old_tables:
            changes.append(f"表格新增 {new_tables - old_tables} 个")
        elif old_tables > new_tables:
            changes.append(f"表格删除 {old_tables - new_tables} 个")

        old_lines = old_content.splitlines(keepends=True)
        new_lines = new_content.splitlines(keepends=True)
        diff = list(difflib.unified_diff(old_lines, new_lines, n=0))
        added = sum(1 for l in diff if l.startswith("+") and not l.startswith("+++"))
        removed = sum(1 for l in diff if l.startswith("-") and not l.startswith("---"))
        if added or removed:
            parts: list[str] = []
            if added:
                parts.append(f"新增 {added} 行")
            if removed:
                parts.append(f"删除 {removed} 行")
            changes.append("，".join(parts))

    if not changes:
        return "内容无变化"
    return "；".join(changes)


@router.post("/{article_id}/versions", response_model=ArticleVersionResponse)
def create_article_version(
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
        raise HTTPException(status_code=404, detail="Article not found")

    max_version = (
        db.query(ArticleVersion.version_number)
        .filter(ArticleVersion.article_id == article_id)
        .order_by(ArticleVersion.version_number.desc())
        .first()
    )
    next_number = (max_version[0] + 1) if max_version else 1

    prev_version = None
    if max_version:
        prev_version = (
            db.query(ArticleVersion)
            .filter(
                ArticleVersion.article_id == article_id,
                ArticleVersion.version_number == max_version[0],
            )
            .first()
        )

    if prev_version:
        change_summary = _generate_change_summary(
            prev_version.title,
            prev_version.content,
            article.title,
            article.content,
        )
    else:
        change_summary = "创建初始版本"

    if (
        prev_version
        and prev_version.content == article.content
        and prev_version.title == article.title
        and prev_version.summary == article.summary
    ):
        return prev_version

    version = ArticleVersion(
        article_id=article.id,
        version_number=next_number,
        title=article.title,
        content=article.content,
        summary=article.summary,
        tags=article.tags,
        change_summary=change_summary,
    )
    db.add(version)
    db.commit()
    db.refresh(version)
    return version


@router.get("/{article_id}/versions", response_model=List[ArticleVersionBrief])
def get_article_versions(
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
        raise HTTPException(status_code=404, detail="Article not found")

    versions = (
        db.query(ArticleVersion)
        .filter(ArticleVersion.article_id == article_id)
        .order_by(ArticleVersion.version_number.desc())
        .all()
    )
    return versions


@router.get(
    "/{article_id}/versions/{version_id}", response_model=ArticleVersionResponse
)
def get_article_version(
    article_id: int,
    version_id: int,
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

    version = (
        db.query(ArticleVersion)
        .filter(
            ArticleVersion.id == version_id, ArticleVersion.article_id == article_id
        )
        .first()
    )
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    return version


@router.put(
    "/{article_id}/versions/{version_id}", response_model=ArticleVersionResponse
)
def update_article_version(
    article_id: int,
    version_id: int,
    data: dict,
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

    version = (
        db.query(ArticleVersion)
        .filter(
            ArticleVersion.id == version_id, ArticleVersion.article_id == article_id
        )
        .first()
    )
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    if "content" in data:
        version.content = data["content"]
    if "title" in data:
        version.title = data["title"]
    if "summary" in data:
        version.summary = data["summary"]

    db.commit()
    db.refresh(version)
    return version


@router.post(
    "/{article_id}/versions/{version_id}/restore", response_model=ArticleResponse
)
def restore_article_version(
    article_id: int,
    version_id: int,
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

    version = (
        db.query(ArticleVersion)
        .filter(
            ArticleVersion.id == version_id, ArticleVersion.article_id == article_id
        )
        .first()
    )
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    article.title = version.title
    article.content = version.content
    article.summary = version.summary
    article.tags = version.tags

    if article.file_path:
        content_dir = _get_content_dir(article.article_type, db, current_user.id)
        article_dir = _resolve_article_dir(article, content_dir)
        try:
            article_dir.mkdir(parents=True, exist_ok=True)
            (article_dir / "images").mkdir(exist_ok=True)
            (article_dir / "index.md").write_text(version.content, encoding="utf-8")
        except OSError as e:
            logger.error("Failed to write restored content: %s", e)

    db.commit()
    db.refresh(article)
    return _article_to_response(article, db)


@router.get("/{article_id}/versions/{version_id}/diff")
def get_version_diff(
    article_id: int,
    version_id: int,
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

    version = (
        db.query(ArticleVersion)
        .filter(
            ArticleVersion.id == version_id, ArticleVersion.article_id == article_id
        )
        .first()
    )
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    prev_version = None
    if version.version_number > 1:
        prev_version = (
            db.query(ArticleVersion)
            .filter(
                ArticleVersion.article_id == article_id,
                ArticleVersion.version_number == version.version_number - 1,
            )
            .first()
        )

    if version.version_number == 1:
        old_lines: list[str] = []
        new_lines = version.content.splitlines(keepends=True)
    else:
        old_lines = (prev_version.content if prev_version else "").splitlines(
            keepends=True
        )
        new_lines = version.content.splitlines(keepends=True)

    diff_lines = list(difflib.unified_diff(old_lines, new_lines, n=3))
    diff_text = "".join(diff_lines)

    title_diff = None
    if version.version_number > 1 and prev_version:
        if prev_version.title != version.title:
            title_diff = {
                "old": prev_version.title,
                "new": version.title,
            }
    elif version.version_number == 1:
        title_diff = {"old": None, "new": version.title}

    return {
        "version_id": version.id,
        "version_number": version.version_number,
        "change_summary": version.change_summary,
        "diff": diff_text,
        "title_diff": title_diff,
    }
