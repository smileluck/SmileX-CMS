from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel


class PublishTaskCreate(BaseModel):
    article_id: int
    platform_account_ids: List[int]
    publish_options: Optional[Dict[str, Dict[str, Any]]] = None


class PublishLocalRequest(BaseModel):
    article_id: int
    platform_name: str


class PublishLocalResponse(BaseModel):
    success: bool
    output_path: Optional[str] = None
    error_message: Optional[str] = None


class PublishTaskResponse(BaseModel):
    id: int
    article_id: int
    platform_account_id: int
    user_id: int
    status: str
    publish_method: Optional[str] = None
    platform_post_id: Optional[str] = None
    platform_post_url: Optional[str] = None
    error_message: Optional[str] = None
    retry_count: int = 0
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PublishLogResponse(BaseModel):
    id: int
    task_id: int
    level: str
    message: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PublishBatchResponse(BaseModel):
    tasks: List[PublishTaskResponse]
    total: int
    created: int
