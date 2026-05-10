from typing import Optional
from datetime import datetime
from pydantic import BaseModel, model_validator


class MediaResponse(BaseModel):
    id: int
    snow_id: str
    filename: str
    file_path: str
    markdown_path: Optional[str] = None
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    media_type: str = "image"
    article_id: Optional[int] = None
    article_title: Optional[str] = None
    article_snow_id: Optional[str] = None
    user_id: int
    created_at: datetime

    @model_validator(mode="before")
    @classmethod
    def set_article_title(cls, values):
        if hasattr(values, "article") and values.article:
            values.article_title = values.article.title
            values.article_snow_id = values.article.snow_id
        elif not getattr(values, "article_title", None):
            values.article_title = "通用"
        return values

    class Config:
        from_attributes = True
