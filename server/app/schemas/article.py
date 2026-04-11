from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class TagBrief(BaseModel):
    id: int
    name: str
    color: Optional[str] = None

    class Config:
        from_attributes = True


class ArticleBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = ""
    summary: Optional[str] = None
    article_type: str = "article"
    cover_image: Optional[str] = None
    group_id: Optional[int] = None
    tags: Optional[List[str]] = None
    tag_ids: Optional[List[int]] = None


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
    tag_ids: Optional[List[int]] = None
    metadata: Optional[Dict[str, Any]] = None


class ArticleResponse(BaseModel):
    id: int
    snow_id: str
    title: str
    content: str = ""
    summary: Optional[str] = None
    article_type: str = "article"
    status: str = "draft"
    file_path: Optional[str] = None
    cover_image: Optional[str] = None
    group_id: Optional[int] = None
    author_id: int
    tags: Optional[List[str]] = None
    tag_objects: Optional[List[TagBrief]] = Field(None, validation_alias="tag_objects")
    metadata: Optional[Dict[str, Any]] = Field(
        None, validation_alias="article_metadata"
    )
    current_version: Optional[int] = None
    version_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class ArticleVersionResponse(BaseModel):
    id: int
    article_id: int
    version_number: int
    title: str
    content: str = ""
    summary: Optional[str] = None
    tags: Optional[List[str]] = None
    change_summary: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ArticleVersionBrief(BaseModel):
    id: int
    article_id: int
    version_number: int
    title: str
    summary: Optional[str] = None
    tags: Optional[List[str]] = None
    change_summary: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
