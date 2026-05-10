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
    get_media_dir as _get_media_dir,
    _get_base_storage_dir,
)
from ..dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/articles", tags=["articles"])

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"}


def _extract_title_from_content(content: str) -> Optional[str]:
    for line in content.splitlines():
        stripped = line.strip()
        if stripped.startswith("#"):
            return stripped.lstrip("#").strip()
    return None


def _scan_images_in_dir(dir_path: Path, md_filename: str = "index.md") -> List[str]:
    images: List[str] = []
    # 1. images/ subdirectory (standard format)
    images_dir = dir_path / "images"
    if images_dir.is_dir():
        for f in sorted(images_dir.iterdir()):
            if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS:
                images.append(f"images/{f.name}")
    # 2. *.assets/ directories (Typora-style: index.assets, article-name.assets, etc.)
    for item in dir_path.iterdir():
        if item.is_dir() and item.name.endswith(".assets"):
            for f in sorted(item.iterdir()):
                if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS:
                    images.append(f"{item.name}/{f.name}")
    # 3. Direct image files in the directory (excluding cover)
    for f in sorted(dir_path.iterdir()):
        if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS:
            if f.name.lower().startswith("cover"):
                continue
            images.append(f.name)
    return images


def _detect_cover_image(dir_path: Path) -> Optional[str]:
    for name in ["cover.jpg", "cover.jpeg", "cover.png", "cover.gif", "cover.webp"]:
        if (dir_path / name).is_file():
            return name
    return None


def _parse_dir_name(dir_name: str) -> tuple[str, Optional[str]]:
    # Try standard format: {title}-{snow_id} where snow_id is numeric, 10-20 digits
    match = re.match(r"^(.+)-(\d{10,20})$", dir_name)
    if match:
        return match.group(1).replace("_", " "), match.group(2)
    return dir_name.replace("_", " "), None


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


def _recursive_scan_md_dirs(base_dir: Path) -> List[Path]:
    """Recursively find all directories containing .md files."""
    found: List[Path] = []
    if not base_dir.is_dir():
        return found
    for item in sorted(base_dir.rglob("*")):
        if not item.is_dir():
            continue
        # skip hidden and .assets dirs
        if item.name.startswith(".") or item.name.endswith(".assets"):
            continue
        # check if this dir has any .md file
        has_md = any(f.suffix.lower() == ".md" for f in item.iterdir() if f.is_file())
        if has_md:
            found.append(item)
    return found


@router.post("/scan")
def scan_articles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    articles_dir = _get_articles_dir(db, current_user.id)
    videos_dir = _get_videos_dir(db, current_user.id)

    # collect existing file_paths for this user
    existing_paths = {
        a.file_path
        for a in db.query(Article.file_path)
        .filter(Article.author_id == current_user.id, Article.file_path.isnot(None))
        .all()
    }

    new_articles: List[Dict[str, Any]] = []
    existing_articles: List[str] = []

    for content_dir, article_type in [(articles_dir, "article"), (videos_dir, "video")]:
        type_label = "articles" if article_type == "article" else "videos"
        for dir_path in _recursive_scan_md_dirs(content_dir):
            # find the primary md file
            md_file = dir_path / "index.md"
            if not md_file.is_file():
                md_files = [f for f in dir_path.iterdir() if f.is_file() and f.suffix.lower() == ".md"]
                if md_files:
                    md_file = md_files[0]
                else:
                    continue

            relative = dir_path.relative_to(BASE_STORAGE_DIR).as_posix()

            if relative in existing_paths:
                existing_articles.append(relative)
                continue

            try:
                content = md_file.read_text(encoding="utf-8")
            except OSError:
                continue

            dir_name = dir_path.name
            dir_title, snow_id = _parse_dir_name(dir_name)
            content_title = _extract_title_from_content(content)
            title = content_title or dir_title

            cover = _detect_cover_image(dir_path)
            images = _scan_images_in_dir(dir_path, md_file.name)

            new_articles.append({
                "dir_name": dir_name,
                "title": title,
                "snow_id": snow_id,
                "content": content,
                "article_type": article_type,
                "cover_image": cover,
                "file_path": relative,
                "images": images,
                "images_count": len(images),
            })

    return {
        "total_scanned": len(new_articles) + len(existing_articles),
        "new_articles": new_articles,
        "existing_articles": existing_articles,
        "existing_count": len(existing_articles),
    }


@router.post("/import")
def import_articles(
    body: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items: List[Dict[str, Any]] = body.get("articles", [])
    extract_media: bool = body.get("extract_media", False)

    if not items:
        raise HTTPException(status_code=400, detail="No articles to import")

    imported: List[Dict[str, Any]] = []
    media_imported = 0

    for item in items:
        file_path = item.get("file_path")
        title = item.get("title", "Untitled")
        content = item.get("content", "")
        snow_id = item.get("snow_id")
        article_type = item.get("article_type", "article")
        cover_image = item.get("cover_image")
        images = item.get("images", [])

        if not file_path:
            continue

        # check duplicate
        existing = (
            db.query(Article)
            .filter(Article.file_path == file_path, Article.author_id == current_user.id)
            .first()
        )
        if existing:
            continue

        # validate snow_id uniqueness
        if snow_id:
            if db.query(Article).filter(Article.snow_id == snow_id).first():
                snow_id = generate_snow_id()
        else:
            snow_id = generate_snow_id()

        db_article = Article(
            snow_id=snow_id,
            title=title,
            content=content,
            article_type=article_type,
            cover_image=cover_image,
            author_id=current_user.id,
            file_path=file_path,
            tags=[],
        )
        db.add(db_article)
        db.flush()

        # extract media to shared library
        if extract_media and images:
            article_dir = BASE_STORAGE_DIR / file_path
            media_dir = _get_base_storage_dir(db, current_user.id) / "media"
            media_dir.mkdir(parents=True, exist_ok=True)
            for img_rel in images:
                src = article_dir / img_rel
                if not src.is_file():
                    continue
                media_snow_id = generate_snow_id()
                ext = src.suffix.lower()
                dest = media_dir / f"{media_snow_id}{ext}"
                try:
                    shutil.copy2(str(src), str(dest))
                except OSError as e:
                    logger.warning("Failed to copy media %s: %s", src, e)
                    continue

                relative_media_path = dest.relative_to(BASE_STORAGE_DIR).as_posix()
                mime_map = {
                    ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                    ".png": "image/png", ".gif": "image/gif",
                    ".webp": "image/webp", ".svg": "image/svg+xml",
                    ".bmp": "image/bmp",
                }
                db_media = Media(
                    snow_id=media_snow_id,
                    filename=src.name,
                    file_path=relative_media_path,
                    file_type=mime_map.get(ext, "image/png"),
                    file_size=src.stat().st_size,
                    media_type="image",
                    article_id=db_article.id,
                    user_id=current_user.id,
                )
                db.add(db_media)
                media_imported += 1

        imported.append(_article_to_response(db_article, db))

    db.commit()
    return {
        "imported": imported,
        "imported_count": len(imported),
        "media_imported": media_imported,
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
        .outerjoin(PlatformAccount, PublishTask.platform_account_id == PlatformAccount.id)
        .filter(PublishTask.article_id.in_(article_ids))
        .all()
    )

    summary: Dict[int, list] = {}
    for task, account in tasks:
        if task.article_id not in summary:
            summary[task.article_id] = []
        summary[task.article_id].append(
            {
                "platform_name": account.platform_name if account else task.platform_name,
                "account_name": account.account_name if account else ("本地" if task.publish_method == "local" else ""),
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
        media_records = db.query(Media).filter(Media.article_id == article_id).all()
        media_dir = _get_media_dir(db, current_user.id)
        media_dir.mkdir(parents=True, exist_ok=True)

        for media in media_records:
            old_path = Path(media.file_path)
            if not old_path.is_absolute():
                old_path = BASE_STORAGE_DIR / old_path
            if old_path.exists():
                ext = old_path.suffix.lower()
                new_filename = f"{media.snow_id}{ext}"
                new_path = media_dir / new_filename
                shutil.move(str(old_path), str(new_path))
                media.file_path = new_path.relative_to(BASE_STORAGE_DIR).as_posix()

        content_dir = _get_content_dir(article.article_type, db, current_user.id)
        article_dir = _resolve_article_dir(article, content_dir)
        if article_dir.exists():
            shutil.rmtree(article_dir, ignore_errors=True)

    db.query(PublishTask).filter(PublishTask.article_id == article_id).update(
        {"article_id": None, "article_title_snapshot": article.title},
        synchronize_session="fetch",
    )

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
        .outerjoin(PlatformAccount, PublishTask.platform_account_id == PlatformAccount.id)
        .filter(PublishTask.article_id == article_id)
        .all()
    )

    result = []
    for task, account in tasks:
        result.append(
            {
                "platform_name": account.platform_name if account else task.platform_name,
                "account_name": account.account_name if account else ("本地" if task.publish_method == "local" else ""),
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
