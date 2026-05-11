from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models.user import User
from ..models.series import Series
from ..models.article import Article
from ..schemas.series import SeriesCreate, SeriesUpdate, SeriesResponse, SeriesSortRequest
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/series", tags=["series"])

DEFAULT_SERIES_NAME = "未分类"


def _ensure_default_series(db: Session, user_id: int) -> Series:
    default = db.query(Series).filter(
        Series.name == DEFAULT_SERIES_NAME, Series.user_id == user_id
    ).first()
    if not default:
        default = Series(
            name=DEFAULT_SERIES_NAME,
            description="默认系列",
            sort_order=0,
            user_id=user_id,
        )
        db.add(default)
        db.commit()
        db.refresh(default)
    return default


@router.get("", response_model=List[SeriesResponse])
def get_series(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _ensure_default_series(db, current_user.id)

    series_list = (
        db.query(Series)
        .filter(Series.user_id == current_user.id)
        .order_by(Series.sort_order)
        .all()
    )

    article_counts = dict(
        db.query(Article.series_id, func.count(Article.id))
        .filter(Article.author_id == current_user.id)
        .group_by(Article.series_id)
        .all()
    )

    result = []
    for s in series_list:
        resp = SeriesResponse.model_validate(s)
        resp.article_count = article_counts.get(s.id, 0)
        result.append(resp)
    return result


@router.post("", response_model=SeriesResponse)
def create_series(
    series_create: SeriesCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.query(Series).filter(
        Series.name == series_create.name, Series.user_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="系列名称已存在")

    db_series = Series(
        name=series_create.name,
        description=series_create.description,
        sort_order=series_create.sort_order,
        user_id=current_user.id,
    )
    db.add(db_series)
    db.commit()
    db.refresh(db_series)
    return SeriesResponse.model_validate(db_series)


@router.put("/{series_id}", response_model=SeriesResponse)
def update_series(
    series_id: int,
    series_update: SeriesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    series = (
        db.query(Series)
        .filter(Series.id == series_id, Series.user_id == current_user.id)
        .first()
    )
    if not series:
        raise HTTPException(status_code=404, detail="系列不存在")

    update_data = series_update.model_dump(exclude_unset=True)
    if "name" in update_data and update_data["name"] == DEFAULT_SERIES_NAME and series.name != DEFAULT_SERIES_NAME:
        existing = db.query(Series).filter(
            Series.name == DEFAULT_SERIES_NAME, Series.user_id == current_user.id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="默认系列名称已存在")

    for field, value in update_data.items():
        setattr(series, field, value)
    db.commit()
    db.refresh(series)
    return SeriesResponse.model_validate(series)


@router.delete("/{series_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_series(
    series_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    series = (
        db.query(Series)
        .filter(Series.id == series_id, Series.user_id == current_user.id)
        .first()
    )
    if not series:
        raise HTTPException(status_code=404, detail="系列不存在")

    if series.name == DEFAULT_SERIES_NAME:
        raise HTTPException(status_code=400, detail="默认系列不能删除")

    default_series = _ensure_default_series(db, current_user.id)
    db.query(Article).filter(
        Article.series_id == series_id, Article.author_id == current_user.id
    ).update({"series_id": default_series.id})

    db.delete(series)
    db.commit()


@router.patch("/sort")
def sort_series(
    sort_request: SeriesSortRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for item in sort_request.items:
        series = (
            db.query(Series)
            .filter(Series.id == item.id, Series.user_id == current_user.id)
            .first()
        )
        if series:
            series.sort_order = item.sort_order
    db.commit()
    return {"message": "Sort order updated"}
