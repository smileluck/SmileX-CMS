from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..models.group import Group
from ..schemas.group import GroupCreate, GroupUpdate, GroupResponse, GroupSortRequest
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/groups", tags=["groups"])


def _build_tree(groups: List[Group]) -> List[dict]:
    lookup = {
        g.id: {
            "id": g.id,
            "name": g.name,
            "parent_id": g.parent_id,
            "user_id": g.user_id,
            "sort_order": g.sort_order,
            "created_at": g.created_at,
            "children": [],
        }
        for g in groups
    }
    roots = []
    for g in lookup.values():
        parent = lookup.get(g["parent_id"])
        if parent:
            parent["children"].append(g)
        else:
            roots.append(g)
    return roots


@router.get("", response_model=List[GroupResponse])
def get_groups(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    groups = (
        db.query(Group)
        .filter(Group.user_id == current_user.id)
        .order_by(Group.sort_order)
        .all()
    )
    return _build_tree(groups)


@router.post("", response_model=GroupResponse)
def create_group(
    group_create: GroupCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_group = Group(
        name=group_create.name,
        parent_id=group_create.parent_id,
        sort_order=group_create.sort_order,
        user_id=current_user.id,
    )
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return db_group


@router.put("/{group_id}", response_model=GroupResponse)
def update_group(
    group_id: int,
    group_update: GroupUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    group = (
        db.query(Group)
        .filter(Group.id == group_id, Group.user_id == current_user.id)
        .first()
    )
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    for field, value in group_update.model_dump(exclude_unset=True).items():
        setattr(group, field, value)
    db.commit()
    db.refresh(group)
    return group


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    group = (
        db.query(Group)
        .filter(Group.id == group_id, Group.user_id == current_user.id)
        .first()
    )
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    db.delete(group)
    db.commit()


@router.patch("/sort")
def sort_groups(
    sort_request: GroupSortRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for item in sort_request.items:
        group = (
            db.query(Group)
            .filter(Group.id == item.id, Group.user_id == current_user.id)
            .first()
        )
        if group:
            group.sort_order = item.sort_order
            if item.parent_id is not None:
                group.parent_id = item.parent_id
    db.commit()
    return {"message": "Sort order updated"}
