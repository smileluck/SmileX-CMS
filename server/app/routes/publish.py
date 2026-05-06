from datetime import datetime, timezone
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from sqlalchemy.orm import Session
from ..database import get_db, SessionLocal
from ..models.user import User
from ..models.article import Article
from ..models.platform import PlatformAccount
from ..models.publish_task import PublishTask
from ..models.publish_log import PublishLog
from ..schemas.publish import (
    PublishTaskCreate,
    PublishTaskResponse,
    PublishLogResponse,
    PublishBatchResponse,
    PublishLocalRequest,
    PublishLocalResponse,
)
from ..dependencies import get_current_user
from ..plugins.registry import PluginRegistry

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/publish", tags=["publish"])


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

    plugin = PluginRegistry.get(req.platform_name)
    if not plugin:
        raise HTTPException(status_code=400, detail=f"Unknown platform: {req.platform_name}")

    result = plugin.generate(article, {})
    return PublishLocalResponse(
        success=result.success,
        output_path=result.output_path,
        error_message=result.error_message,
    )


async def _execute_publish(task_id: int):
    db = SessionLocal()
    try:
        task = db.query(PublishTask).filter(PublishTask.id == task_id).first()
        if not task:
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
            platform_account_id=account.id,
            user_id=current_user.id,
            status="pending",
            publish_method=plugin.auth_method,
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


@router.get("/tasks", response_model=List[PublishTaskResponse])
def get_publish_tasks(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(PublishTask).filter(PublishTask.user_id == current_user.id)
    if status:
        q = q.filter(PublishTask.status == status)
    return q.order_by(PublishTask.created_at.desc()).offset(skip).limit(limit).all()


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
    return task


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
    return task


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
