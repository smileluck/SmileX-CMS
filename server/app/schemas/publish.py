from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel


class PublishTaskCreate(BaseModel):
    article_id: int
    platform_account_ids: List[int]
    publish_options: Optional[Dict[str, Dict[str, Any]]] = None


class PublishLocalRequest(BaseModel):
    article_id: int
    platform_names: List[str]
    theme_id: str = "classic"
    primary_color: Optional[str] = None


class PublishLocalResultItem(BaseModel):
    platform_name: str
    success: bool
    output_path: Optional[str] = None
    error_message: Optional[str] = None
    task_id: Optional[int] = None


class PublishLocalResponse(BaseModel):
    success: bool
    results: List[PublishLocalResultItem] = []


class PublishTaskResponse(BaseModel):
    id: int
    article_id: int
    platform_account_id: Optional[int] = None
    user_id: int
    platform_name: Optional[str] = None
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
    article_title: Optional[str] = None
    account_name: Optional[str] = None
    article_version: Optional[int] = None

    class Config:
        from_attributes = True


class PublishTaskListResponse(BaseModel):
    tasks: List[PublishTaskResponse]
    total: int


class PublishLogResponse(BaseModel):
    id: int
    task_id: int
    level: str
    message: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PreviewHtmlRequest(BaseModel):
    html: str
    theme_id: str = "classic"
    primary_color: Optional[str] = None
    platform: Optional[str] = None


class PreviewHtmlResponse(BaseModel):
    html: str


class PublishBatchResponse(BaseModel):
    tasks: List[PublishTaskResponse]
    total: int
    created: int
