import logging
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..models.setting import Setting
from ..schemas.setting import SettingsResponse, SettingsUpdate
from ..dependencies import get_current_user
from ..config import BASE_STORAGE_DIR

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/settings", tags=["settings"])

SETTINGS_DEFAULTS = {
    "base_storage_path": str(BASE_STORAGE_DIR),
}


def get_setting_value(db: Session, user_id: int, key: str) -> str:
    row = (
        db.query(Setting).filter(Setting.user_id == user_id, Setting.key == key).first()
    )
    if row:
        return row.value
    return SETTINGS_DEFAULTS.get(key, "")


def _get_base_storage_dir(db: Session, user_id: int) -> Path:
    val = get_setting_value(db, user_id, "base_storage_path")
    if val:
        base = Path(val)
    else:
        base = BASE_STORAGE_DIR
    user_dir = base / str(user_id)
    user_dir.mkdir(parents=True, exist_ok=True)
    return user_dir


def get_articles_dir(db: Session, user_id: int) -> Path:
    base = _get_base_storage_dir(db, user_id)
    articles_dir = base / "articles"
    articles_dir.mkdir(parents=True, exist_ok=True)
    return articles_dir


def get_videos_dir(db: Session, user_id: int) -> Path:
    base = _get_base_storage_dir(db, user_id)
    videos_dir = base / "videos"
    videos_dir.mkdir(parents=True, exist_ok=True)
    return videos_dir


@router.get("", response_model=SettingsResponse)
def get_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.query(Setting).filter(Setting.user_id == current_user.id).all()
    user_settings = {r.key: r.value for r in rows}
    merged = dict(SETTINGS_DEFAULTS)
    merged.update(user_settings)
    return SettingsResponse(settings=merged)


@router.put("", response_model=SettingsResponse)
def update_settings(
    body: SettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for key, value in body.settings.items():
        if key not in SETTINGS_DEFAULTS:
            raise HTTPException(status_code=400, detail=f"Unknown setting key: {key}")
        row = (
            db.query(Setting)
            .filter(Setting.user_id == current_user.id, Setting.key == key)
            .first()
        )
        if row:
            row.value = value
        else:
            db.add(Setting(user_id=current_user.id, key=key, value=value))
    db.commit()

    rows = db.query(Setting).filter(Setting.user_id == current_user.id).all()
    user_settings = {r.key: r.value for r in rows}
    merged = dict(SETTINGS_DEFAULTS)
    merged.update(user_settings)
    return SettingsResponse(settings=merged)
