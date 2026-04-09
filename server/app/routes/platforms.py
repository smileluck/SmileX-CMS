from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..models.platform import PlatformAccount
from ..schemas.platform import (
    PlatformAccountCreate,
    PlatformAccountUpdate,
    PlatformAccountResponse,
)
from ..dependencies import get_current_user
from ..plugins.registry import PluginRegistry

router = APIRouter(prefix="/api/platforms", tags=["platforms"])


class ValidateTokenRequest(BaseModel):
    access_token: str


@router.get("/available")
def get_available_platforms():
    return PluginRegistry.list_platforms()


@router.get("", response_model=List[PlatformAccountResponse])
def get_platform_accounts(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return (
        db.query(PlatformAccount)
        .filter(PlatformAccount.user_id == current_user.id)
        .all()
    )


@router.post("/bind", response_model=PlatformAccountResponse)
def bind_platform_account(
    account: PlatformAccountCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    valid_platforms = {p["platform_name"] for p in PluginRegistry.list_platforms()}
    if account.platform_name not in valid_platforms:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown platform '{account.platform_name}'. Available: {', '.join(sorted(valid_platforms))}",
        )

    existing = (
        db.query(PlatformAccount)
        .filter(
            PlatformAccount.user_id == current_user.id,
            PlatformAccount.platform_name == account.platform_name,
            PlatformAccount.account_name == account.account_name,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Account already bound")
    db_account = PlatformAccount(
        platform_name=account.platform_name,
        account_name=account.account_name,
        access_token=account.access_token,
        refresh_token=account.refresh_token,
        token_expires_at=account.token_expires_at,
        cookies=account.cookies,
        config=account.config,
        user_id=current_user.id,
    )
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account


@router.put("/{account_id}", response_model=PlatformAccountResponse)
def update_platform_account(
    account_id: int,
    update: PlatformAccountUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account = (
        db.query(PlatformAccount)
        .filter(
            PlatformAccount.id == account_id, PlatformAccount.user_id == current_user.id
        )
        .first()
    )
    if not account:
        raise HTTPException(status_code=404, detail="Platform account not found")
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(account, field, value)
    db.commit()
    db.refresh(account)
    return account


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def unbind_platform_account(
    account_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account = (
        db.query(PlatformAccount)
        .filter(
            PlatformAccount.id == account_id, PlatformAccount.user_id == current_user.id
        )
        .first()
    )
    if not account:
        raise HTTPException(status_code=404, detail="Platform account not found")
    db.delete(account)
    db.commit()


@router.post("/{account_id}/test")
async def test_connection(
    account_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account = (
        db.query(PlatformAccount)
        .filter(
            PlatformAccount.id == account_id, PlatformAccount.user_id == current_user.id
        )
        .first()
    )
    if not account:
        raise HTTPException(status_code=404, detail="Platform account not found")
    plugin = PluginRegistry.get(account.platform_name)
    if not plugin:
        raise HTTPException(
            status_code=400, detail=f"No plugin for platform: {account.platform_name}"
        )
    result = await plugin.test_connection(account, db=db)
    db.refresh(account)
    result["status"] = account.status
    return result


@router.post("/{account_id}/validate-token")
async def validate_token(
    account_id: int,
    body: ValidateTokenRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account = (
        db.query(PlatformAccount)
        .filter(
            PlatformAccount.id == account_id, PlatformAccount.user_id == current_user.id
        )
        .first()
    )
    if not account:
        raise HTTPException(status_code=404, detail="Platform account not found")
    plugin = PluginRegistry.get(account.platform_name)
    if not plugin:
        raise HTTPException(
            status_code=400, detail=f"No plugin for platform: {account.platform_name}"
        )
    if not hasattr(plugin, "validate_token"):
        raise HTTPException(
            status_code=400,
            detail=f"Platform {account.platform_name} does not support token validation",
        )
    result = await plugin.validate_token(account, body.access_token, db=db)
    db.refresh(account)
    result["status"] = account.status
    return result
