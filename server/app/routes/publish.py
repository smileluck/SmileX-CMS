from datetime import datetime, timezone
import logging
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from ..database import get_db, SessionLocal
from ..models.user import User
from ..models.article import Article
from ..models.platform import PlatformAccount
from ..models.publish_task import PublishTask
from ..models.publish_log import PublishLog
from ..models.article_version import ArticleVersion
from ..schemas.publish import (
    PublishTaskCreate,
    PublishTaskResponse,
    PublishLogResponse,
    PublishBatchResponse,
    PublishLocalRequest,
    PublishLocalResponse,
    PublishLocalResultItem,
    PreviewHtmlRequest,
    PreviewHtmlResponse,
    PublishTaskListResponse,
)
from ..dependencies import get_current_user
from ..plugins.registry import PluginRegistry
from ..plugins.themes import apply_primary_color, get_theme, list_themes
from ..plugins.wechat_styles import apply_inline_styles
from ..plugins.xiaohongshu_styles import XIAOHONGSHU_ELEMENT_STYLES, XIAOHONGSHU_CODE_BLOCK_STYLE
from ..plugins.zhihu_styles import ZHIHU_ELEMENT_STYLES, ZHIHU_CODE_BLOCK_STYLE
from ..plugins.juejin_styles import JUEJIN_ELEMENT_STYLES, JUEJIN_CODE_BLOCK_STYLE

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/publish", tags=["publish"])


def _get_article_version(article_id: int, db: Session) -> int | None:
    latest = (
        db.query(ArticleVersion.version_number)
        .filter(ArticleVersion.article_id == article_id)
        .order_by(ArticleVersion.version_number.desc())
        .first()
    )
    return latest[0] if latest else None


_PLATFORM_STYLES = {
    "xiaohongshu": (XIAOHONGSHU_ELEMENT_STYLES, XIAOHONGSHU_CODE_BLOCK_STYLE),
    "zhihu": (ZHIHU_ELEMENT_STYLES, ZHIHU_CODE_BLOCK_STYLE),
    "juejin": (JUEJIN_ELEMENT_STYLES, JUEJIN_CODE_BLOCK_STYLE),
}


@router.post("/preview-html", response_model=PreviewHtmlResponse)
def preview_html(
    req: PreviewHtmlRequest,
    current_user: User = Depends(get_current_user),
):
    if req.platform and req.platform in _PLATFORM_STYLES:
        style_map, code_block_style = _PLATFORM_STYLES[req.platform]
    else:
        theme = get_theme(req.theme_id) or get_theme("classic")
        style_map = theme.styles
        code_block_style = theme.code_block_style
        if req.primary_color:
            style_map = apply_primary_color(style_map, theme.primary_color, req.primary_color)

    styled = apply_inline_styles(req.html, style_map, code_block_style)
    return PreviewHtmlResponse(html=styled)


@router.get("/themes")
def get_themes():
    return [
        {
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "primary_color": t.primary_color,
        }
        for t in list_themes()
    ]


@router.post("/local", response_model=PublishLocalResponse)
def publish_local(
    req: PublishLocalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    article = (
        db.query(Article)
        .filter(Article.id == req.article_id, Article.author_id == current_user.id)
        .first()
    )
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    options: dict = {}
    if req.theme_id:
        options["theme_id"] = req.theme_id
    if req.primary_color:
        options["primary_color"] = req.primary_color

    results: list[PublishLocalResultItem] = []
    all_success = True
    now = datetime.now(timezone.utc)
    article_version = _get_article_version(article.id, db)
    for name in req.platform_names:
        plugin = PluginRegistry.get(name)
        if not plugin:
            results.append(PublishLocalResultItem(
                platform_name=name,
                success=False,
                error_message=f"Unknown platform: {name}",
            ))
            all_success = False
            continue
        gen = plugin.generate(article, options)
        task = PublishTask(
            article_id=article.id,
            article_title_snapshot=article.title,
            platform_account_id=None,
            platform_name=name,
            user_id=current_user.id,
            status="success" if gen.success else "failed",
            publish_method="local",
            error_message=gen.error_message,
            platform_post_url=gen.output_path if gen.success else None,
            article_version=article_version,
            started_at=now,
            completed_at=now,
        )
        db.add(task)
        db.flush()
        db.add(PublishLog(
            task_id=task.id,
            level="info" if gen.success else "error",
            message="Local generate succeeded" if gen.success else f"Local generate failed: {gen.error_message}",
            details={"output_path": gen.output_path} if gen.output_path else None,
        ))
        results.append(PublishLocalResultItem(
            platform_name=name,
            success=gen.success,
            output_path=gen.output_path,
            error_message=gen.error_message,
            task_id=task.id,
        ))
        if not gen.success:
            all_success = False
    db.commit()

    return PublishLocalResponse(success=all_success, results=results)


async def _execute_publish(task_id: int):
    db = SessionLocal()
    try:
        task = db.query(PublishTask).filter(PublishTask.id == task_id).first()
        if not task:
            return
        if not task.article:
            task.status = "failed"
            task.error_message = "Article has been deleted"
            db.commit()
            return
        task.status = "running"
        task.started_at = datetime.now(timezone.utc)
        db.commit()

        plugin = PluginRegistry.get(task.platform_account.platform_name)
        if not plugin:
            task.status = "failed"
            task.error_message = f"No plugin for {task.platform_account.platform_name}"
            db.commit()
            return

        log = PublishLog(
            task_id=task.id,
            level="info",
            message=f"Starting publish to {task.platform_account.platform_name}",
        )
        db.add(log)
        db.commit()

        result = await plugin.publish(task.article, task.platform_account, {"_db": db})

        if result.success:
            task.status = "success"
            task.platform_post_id = result.platform_post_id
            task.platform_post_url = result.platform_post_url
            log = PublishLog(
                task_id=task.id,
                level="info",
                message="Publish succeeded",
                details={
                    "platform_post_id": result.platform_post_id,
                    "platform_post_url": result.platform_post_url,
                },
            )
        else:
            task.status = "failed"
            task.error_message = result.error_message
            log = PublishLog(
                task_id=task.id,
                level="error",
                message="Publish failed",
                details={"error": result.error_message},
            )

        db.add(log)
        task.completed_at = datetime.now(timezone.utc)
        db.commit()
    except Exception as e:
        logger.exception("Publish task %d failed with exception", task_id)
        try:
            task = db.query(PublishTask).filter(PublishTask.id == task_id).first()
            if task:
                task.status = "failed"
                task.error_message = str(e)
                task.completed_at = datetime.now(timezone.utc)
                db.add(
                    PublishLog(
                        task_id=task.id,
                        level="error",
                        message=f"Exception: {e}",
                    )
                )
                db.commit()
        except Exception:
            logger.exception("Failed to update task %d status after exception", task_id)
    finally:
        db.close()


@router.post("", response_model=PublishBatchResponse)
def create_publish_tasks(
    task_create: PublishTaskCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    article = (
        db.query(Article)
        .filter(
            Article.id == task_create.article_id, Article.author_id == current_user.id
        )
        .first()
    )
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    created_tasks = []
    article_version = _get_article_version(article.id, db)
    for pa_id in task_create.platform_account_ids:
        account = (
            db.query(PlatformAccount)
            .filter(
                PlatformAccount.id == pa_id, PlatformAccount.user_id == current_user.id
            )
            .first()
        )
        if not account:
            continue
        plugin = PluginRegistry.get(account.platform_name)
        if not plugin:
            continue
        task = PublishTask(
            article_id=article.id,
            article_title_snapshot=article.title,
            platform_account_id=account.id,
            platform_name=account.platform_name,
            user_id=current_user.id,
            status="pending",
            publish_method=plugin.auth_method,
            article_version=article_version,
        )
        db.add(task)
        db.flush()
        created_tasks.append(task)

    db.commit()
    for t in created_tasks:
        db.refresh(t)
        background_tasks.add_task(_execute_publish, t.id)

    return PublishBatchResponse(
        tasks=created_tasks,
        total=len(task_create.platform_account_ids),
        created=len(created_tasks),
    )


def _enrich_task(task: PublishTask, db: Session) -> dict:
    article = db.query(Article).filter(Article.id == task.article_id).first()
    account = (
        db.query(PlatformAccount).filter(PlatformAccount.id == task.platform_account_id).first()
        if task.platform_account_id else None
    )
    resp = PublishTaskResponse.model_validate(task)
    resp.article_title = (
        article.title if article
        else task.article_title_snapshot
        or (f"文章 #{task.article_id}" if task.article_id else "(已删除)")
    )
    resp.article_snow_id = article.snow_id if article else None
    resp.article_deleted = article is None
    resp.account_name = account.account_name if account else None
    return resp


@router.get("/tasks", response_model=PublishTaskListResponse)
def get_publish_tasks(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    task_status: Optional[str] = Query(None, alias="status"),
    article_id: Optional[int] = Query(None),
    platform_name: Optional[str] = Query(None),
    publish_method: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(PublishTask).filter(PublishTask.user_id == current_user.id)
    if task_status:
        q = q.filter(PublishTask.status == task_status)
    if article_id:
        q = q.filter(PublishTask.article_id == article_id)
    if platform_name:
        q = q.filter(PublishTask.platform_name == platform_name)
    if publish_method:
        if publish_method == "cloud":
            q = q.filter(PublishTask.publish_method != "local")
        else:
            q = q.filter(PublishTask.publish_method == publish_method)
    if search:
        q = q.outerjoin(Article, PublishTask.article_id == Article.id).filter(
            (Article.title.ilike(f"%{search}%")) | (PublishTask.article_title_snapshot.ilike(f"%{search}%"))
        )
    total = q.count()
    tasks = q.order_by(PublishTask.created_at.desc()).offset(skip).limit(limit).all()
    return PublishTaskListResponse(
        tasks=[_enrich_task(t, db) for t in tasks],
        total=total,
    )


@router.get("/tasks/{task_id}", response_model=PublishTaskResponse)
def get_publish_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = (
        db.query(PublishTask)
        .filter(PublishTask.id == task_id, PublishTask.user_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Publish task not found")
    return _enrich_task(task, db)


@router.get("/tasks/{task_id}/logs", response_model=List[PublishLogResponse])
def get_publish_task_logs(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = (
        db.query(PublishTask)
        .filter(PublishTask.id == task_id, PublishTask.user_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Publish task not found")
    return (
        db.query(PublishLog)
        .filter(PublishLog.task_id == task_id)
        .order_by(PublishLog.created_at)
        .all()
    )


@router.get("/tasks/{task_id}/preview", response_class=HTMLResponse)
def preview_publish_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = (
        db.query(PublishTask)
        .filter(PublishTask.id == task_id, PublishTask.user_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Publish task not found")

    file_path = task.platform_post_url
    if not file_path:
        raise HTTPException(status_code=404, detail="No preview available")

    p = Path(file_path)
    if not p.exists():
        raise HTTPException(status_code=404, detail="Preview file not found")

    return p.read_text(encoding="utf-8")


@router.post("/tasks/{task_id}/retry", response_model=PublishTaskResponse)
def retry_publish_task(
    task_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = (
        db.query(PublishTask)
        .filter(PublishTask.id == task_id, PublishTask.user_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Publish task not found")
    task.status = "pending"
    task.retry_count = (task.retry_count or 0) + 1
    task.error_message = None
    db.commit()
    db.refresh(task)
    background_tasks.add_task(_execute_publish, task.id)
    return _enrich_task(task, db)


@router.post("/tasks/{task_id}/cancel", status_code=status.HTTP_204_NO_CONTENT)
def cancel_publish_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = (
        db.query(PublishTask)
        .filter(PublishTask.id == task_id, PublishTask.user_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Publish task not found")
    if task.status not in ("pending", "running"):
        raise HTTPException(status_code=400, detail="Task cannot be cancelled")
    task.status = "cancelled"
    db.commit()


@router.delete("/tasks", status_code=status.HTTP_204_NO_CONTENT)
def clear_publish_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(PublishLog).filter(
        PublishLog.task_id.in_(
            db.query(PublishTask.id).filter(PublishTask.user_id == current_user.id)
        )
    ).delete(synchronize_session="fetch")
    db.query(PublishTask).filter(PublishTask.user_id == current_user.id).delete()
    db.commit()
