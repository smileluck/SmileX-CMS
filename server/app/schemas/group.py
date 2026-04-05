from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class GroupBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    parent_id: Optional[int] = None
    sort_order: int = 0


class GroupCreate(GroupBase):
    pass


class GroupUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    parent_id: Optional[int] = None
    sort_order: Optional[int] = None


class GroupResponse(GroupBase):
    id: int
    user_id: int
    created_at: datetime
    children: Optional[List["GroupResponse"]] = None

    class Config:
        from_attributes = True


class GroupSortItem(BaseModel):
    id: int
    sort_order: int
    parent_id: Optional[int] = None


class GroupSortRequest(BaseModel):
    items: List[GroupSortItem]
