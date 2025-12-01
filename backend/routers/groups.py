from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from database import database
from models import groups, members, Group, GroupCreate, User, Invitation, MemberCreate, InvitationStatus, UserRole, users, invitations
from security import get_current_user
from uuid import uuid4

router = APIRouter()

@router.get("/", response_model=List[Group])
async def get_groups_for_current_user(current_user: User = Depends(get_current_user)):
    query = groups.select().where(groups.c.createdBy == current_user["id"])
    return await database.fetch_all(query)

@router.post("/", response_model=Group, status_code=status.HTTP_201_CREATED)
async def create_new_group(group: GroupCreate, current_user: User = Depends(get_current_user)):
    # Check if group with same name already exists for the user
    existing_group_query = groups.select().where(
        (groups.c.name == group.name) & (groups.c.createdBy == current_user["id"])
    )
    if await database.fetch_one(existing_group_query):
        raise HTTPException(status_code=400, detail="You already have a group with this name.")

    group_id = str(uuid4())
    query = groups.insert().values(
        id=group_id,
        name=group.name,
        description=group.description,
        createdBy=current_user["id"]
    )
    await database.execute(query)
    
    # Add the creator as the owner of the group
    member_query = members.insert().values(
        userId=current_user["id"],
        groupId=group_id,
        username=current_user["username"],
        role="OWNER"
    )
    await database.execute(member_query)

    # Fetch the newly created group to get the actual createdAt timestamp from the DB
    new_group_query = groups.select().where(groups.c.id == group_id)
    new_group = await database.fetch_one(new_group_query)

    return {
        "id": new_group["id"],
        "name": new_group["name"],
        "description": new_group["description"],
        "createdAt": new_group["createdAt"],
        "createdBy": new_group["createdBy"],
    }

@router.get("/{groupId}", response_model=Group)
async def get_group_details(groupId: str, current_user: User = Depends(get_current_user)):
    query = groups.select().where(groups.c.id == groupId)
    group = await database.fetch_one(query)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Check if the current user is a member of the group
    member_query = members.select().where(
        (members.c.groupId == groupId) & (members.c.userId == current_user["id"])
    )
    if not await database.fetch_one(member_query):
        raise HTTPException(status_code=403, detail="Not authorized to access this group")

    # Get all members of the group
    members_query = members.select().where(members.c.groupId == groupId)
    group_members = await database.fetch_all(members_query)

    return {**group, "members": group_members}

@router.get("/{groupId}/invitations", response_model=List[Invitation])
async def get_pending_invitations_for_group(groupId: str, current_user: User = Depends(get_current_user)):
    # Check if user is a member of the group
    member_query = members.select().where(
        (members.c.groupId == groupId) & (members.c.userId == current_user["id"])
    )
    if not await database.fetch_one(member_query):
        raise HTTPException(status_code=403, detail="Not authorized to access this group's invitations")
    
    query = invitations.select().where(invitations.c.groupId == groupId)
    return await database.fetch_all(query)

@router.post("/{groupId}/members", response_model=Group)
async def add_or_invite_member_to_group(groupId: str, member_data: MemberCreate, current_user: User = Depends(get_current_user)):
    # Check if group exists
    group_query = groups.select().where(groups.c.id == groupId)
    group = await database.fetch_one(group_query)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Check if current user has permission to add/invite members (e.g., ADMIN or OWNER)
    current_user_member_query = members.select().where(
        (members.c.groupId == groupId) & (members.c.userId == current_user["id"])
    )
    current_user_member = await database.fetch_one(current_user_member_query)
    if not current_user_member or current_user_member["role"] not in ["OWNER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized to add/invite members to this group")

    # Handle GUEST role - directly add as member
    if member_data.role == UserRole.GUEST:
        # Check if guest member already exists in group
        existing_guest_member_query = members.select().where(
            (members.c.groupId == groupId) & (members.c.username == member_data.identifier)
        )
        if await database.fetch_one(existing_guest_member_query):
            raise HTTPException(status_code=400, detail="Guest with this name already exists in the group")
        
        # Create a dummy user entry for the guest (no password, no real email)
        dummy_user_id = str(uuid4()) # Generate a new UUID for the guest user
        dummy_email = f"{member_data.identifier.replace(' ', '_').lower()}@{groupId}.guest"
        insert_dummy_user_query = users.insert().values(
            id=dummy_user_id,
            username=member_data.identifier,
            email=dummy_email,
            hashed_password="" # No password for guest
        )
        await database.execute(insert_dummy_user_query)

        insert_member_query = members.insert().values(
            userId=dummy_user_id,
            groupId=groupId,
            username=member_data.identifier,
            role=UserRole.GUEST
        )
        await database.execute(insert_member_query)
        # Fetch updated group with new member
        updated_group_members_query = members.select().where(members.c.groupId == groupId)
        updated_group_members = await database.fetch_all(updated_group_members_query)
        return {**group, "members": updated_group_members}

    # Handle standard users (by email - identifier is email)
    else:
        # Find existing user by email
        target_user_query = users.select().where(users.c.email == member_data.identifier)
        target_user = await database.fetch_one(target_user_query)

        if not target_user:
            # User does not exist, create an invitation
            invitation_id = str(uuid4())
            insert_invitation_query = invitations.insert().values(
                id=invitation_id,
                groupId=groupId,
                groupName=group["name"],
                inviterId=current_user["id"],
                inviterName=current_user["username"],
                inviteeEmail=member_data.identifier,
                role=member_data.role,
                status=InvitationStatus.PENDING
            )
            await database.execute(insert_invitation_query)
            raise HTTPException(status_code=202, detail="User not found, invitation sent.")
        
        # User exists, check if already a member
        existing_member_query = members.select().where(
            (members.c.groupId == groupId) & (members.c.userId == target_user["id"])
        )
        if await database.fetch_one(existing_member_query):
            raise HTTPException(status_code=400, detail="User is already a member of this group")

        # User exists and is not a member, add them directly
        insert_member_query = members.insert().values(
            userId=target_user["id"],
            groupId=groupId,
            username=target_user["username"],
            role=member_data.role
        )
        await database.execute(insert_member_query)
        # Fetch updated group with new member
        updated_group_members_query = members.select().where(members.c.groupId == groupId)
        updated_group_members = await database.fetch_all(updated_group_members_query)
        return {**group, "members": updated_group_members}
