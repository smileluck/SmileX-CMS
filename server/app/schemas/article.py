from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class ArticleBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = ""
    summary: Optional[str] = None
    article_type: str = "article"
    cover_image: Optional[str] = None
    group_id: Optional[int] = None
    tags: Optional[List[str]] = None


class ArticleCreate(ArticleBase):
    pass


class ArticleUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = None
    summary: Optional[str] = None
    status: Optional[str] = None
    article_type: Optional[str] = None
    cover_image: Optional[str] = None
    group_id: Optional[int] = None
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None


class ArticleResponse(ArticleBase):
    id: int
    snow_id: str
    status: str
    file_path: Optional[str] = None
    author_id: int
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
