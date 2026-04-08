from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class TagCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    color: Optional[str] = Field(None, max_length=20)


class TagUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    color: Optional[str] = Field(None, max_length=20)


class TagResponse(BaseModel):
    id: int
    name: str
    color: Optional[str] = None
    user_id: int
    article_count: int = 0
    video_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True
