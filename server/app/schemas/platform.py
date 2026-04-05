from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class PlatformAccountBase(BaseModel):
    platform_name: str = Field(..., max_length=50)
    account_name: str = Field(..., max_length=100)
    config: Optional[Dict[str, Any]] = None


class PlatformAccountCreate(PlatformAccountBase):
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_expires_at: Optional[datetime] = None
    cookies: Optional[str] = None


class PlatformAccountUpdate(BaseModel):
    account_name: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_expires_at: Optional[datetime] = None
    cookies: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    status: Optional[str] = None


class PlatformAccountResponse(PlatformAccountBase):
    id: int
    status: str = "active"
    token_expires_at: Optional[datetime] = None
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
