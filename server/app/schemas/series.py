from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class SeriesCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    sort_order: int = 0


class SeriesUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    sort_order: Optional[int] = None


class SeriesResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    sort_order: int = 0
    user_id: int
    article_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class SeriesSortItem(BaseModel):
    id: int
    sort_order: int


class SeriesSortRequest(BaseModel):
    items: List[SeriesSortItem]
