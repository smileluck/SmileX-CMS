from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class MediaResponse(BaseModel):
    id: int
    snow_id: str
    filename: str
    file_path: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    media_type: str = "image"
    article_id: Optional[int] = None
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
