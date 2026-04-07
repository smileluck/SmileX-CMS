from typing import Optional
from datetime import datetime
from pydantic import BaseModel, model_validator


class MediaResponse(BaseModel):
    id: int
    snow_id: str
    filename: str
    file_path: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    media_type: str = "image"
    article_id: Optional[int] = None
    article_title: Optional[str] = None
    user_id: int
    created_at: datetime

    @model_validator(mode="before")
    @classmethod
    def set_article_title(cls, values):
        if hasattr(values, "article") and values.article:
            values.article_title = values.article.title
        return values

    class Config:
        from_attributes = True
