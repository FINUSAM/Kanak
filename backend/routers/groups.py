from fastapi import APIRouter, HTTPException, status
from models import Group, GroupCreate, MemberCreate, Invitation
from typing import List
from uuid import UUID

router = APIRouter()

# In-memory storage
groups_db = {}
invitations_db = {}


@router.get("/", response_model=List[Group])
def get_groups_for_current_user():
    return list(groups_db.values())


@router.post("/", response_model=Group, status_code=status.HTTP_201_CREATED)
def create_new_group(group: GroupCreate):
    new_group_id = UUID(int=len(groups_db) + 1)
    new_group = Group(
        id=new_group_id,
        name=group.name,
        description=group.description,
        createdBy=UUID(int=1)  # Dummy user
    )
    groups_db[new_group_id] = new_group.dict()
    return new_group


@router.get("/{groupId}", response_model=Group)
def get_group_details(groupId: UUID):
    if groupId not in groups_db:
        raise HTTPException(status_code=404, detail="Group not found")
    return groups_db[groupId]


@router.get("/{groupId}/invitations", response_model=List[Invitation])
def get_pending_invitations_for_group(groupId: UUID):
    if groupId not in groups_db:
        raise HTTPException(status_code=404, detail="Group not found")

    group_invitations = [inv for inv in invitations_db.values() if inv["groupId"] == groupId]
    return group_invitations


@router.post("/{groupId}/members", response_model=Group)
def add_or_invite_member_to_group(groupId: UUID, member: MemberCreate):
    if groupId not in groups_db:
        raise HTTPException(status_code=404, detail="Group not found")

    # This is a dummy implementation.
    # In a real app, you would handle invitations vs. direct adds.
    group = groups_db[groupId]
    return group

