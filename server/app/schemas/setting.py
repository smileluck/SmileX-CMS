from typing import Optional, Dict
from datetime import datetime
from pydantic import BaseModel


class SettingItem(BaseModel):
    key: str
    value: str

    class Config:
        from_attributes = True


class SettingsResponse(BaseModel):
    settings: Dict[str, str]


class SettingsUpdate(BaseModel):
    settings: Dict[str, str]
