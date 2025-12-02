from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from database import database
from models import groups, members, Group, GroupCreate, GroupUpdate, User, Invitation, MemberCreate, MemberUpdate, InvitationStatus, UserRole, users, invitations, transactions, transaction_splits
from security import get_current_user
from uuid import uuid4

router = APIRouter()

@router.get("/", response_model=List[Group])
async def get_groups_for_current_user(current_user: User = Depends(get_current_user)):
    query = groups.select().where(groups.c.id.in_(
        members.select().where(
            (members.c.userId == current_user["id"]) & (members.c.isActive == True)
        ).with_only_columns(members.c.groupId)
    ))
    user_groups = await database.fetch_all(query)
    
    # For each group, fetch its active members
    groups_with_members = []
    for group in user_groups:
        members_query = members.select().where((members.c.groupId == group["id"]) & (members.c.isActive == True))
        group_members = await database.fetch_all(members_query)
        groups_with_members.append({**group, "members": group_members})
        
    return groups_with_members

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
        role="OWNER",
        isActive=True
    )
    await database.execute(member_query)

    # Fetch the newly created group and member to return
    new_group_query = groups.select().where(groups.c.id == group_id)
    new_group = await database.fetch_one(new_group_query)

    new_member_query = members.select().where(
        (members.c.groupId == group_id) & (members.c.userId == current_user["id"])
    )
    new_member = await database.fetch_one(new_member_query)

    return {
        "id": new_group["id"],
        "name": new_group["name"],
        "description": new_group["description"],
        "createdAt": new_group["createdAt"],
        "createdBy": new_group["createdBy"],
        "members": [new_member]
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

    # Get all active members of the group
    members_query = members.select().where((members.c.groupId == groupId) & (members.c.isActive == True))
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
    
    query = invitations.select().where(
        (invitations.c.groupId == groupId) &
        (invitations.c.status == InvitationStatus.PENDING)
    )
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
            role=UserRole.GUEST,
            isActive=True
        )
        await database.execute(insert_member_query)
        # Fetch updated group with new member
        updated_group_members_query = members.select().where(members.c.groupId == groupId)
        updated_group_members = await database.fetch_all(updated_group_members_query)
        return {**group, "members": updated_group_members}

    # Handle standard users (by email - identifier is email)
    else:
        # Check if an invitation has already been sent to this email for this group
        existing_invitation_query = invitations.select().where(
            (invitations.c.groupId == groupId) & (invitations.c.inviteeEmail == member_data.identifier)
        )
        if await database.fetch_one(existing_invitation_query):
            raise HTTPException(status_code=400, detail="An invitation has already been sent to this user for this group.")

        # Find existing user by email
        target_user_query = users.select().where(users.c.email == member_data.identifier)
        target_user = await database.fetch_one(target_user_query)

        # Check if the target user is already a member of the group
        if target_user:
            existing_member_query = members.select().where(
                (members.c.groupId == groupId) & (members.c.userId == target_user["id"])
            )
            if await database.fetch_one(existing_member_query):
                raise HTTPException(status_code=400, detail="This user is already a member of the group.")

        # Create an invitation
        invitation_id = str(uuid4())
        insert_invitation_query = invitations.insert().values(
            id=invitation_id,
            groupId=groupId,
            groupName=group["name"],
            inviterId=current_user["id"],
            inviterName=current_user["username"],
            inviteeEmail=member_data.identifier,
            inviteeId=target_user["id"] if target_user else None,
            role=member_data.role,
            status=InvitationStatus.PENDING
        )
        await database.execute(insert_invitation_query)
        
        updated_group_members_query = members.select().where(members.c.groupId == groupId)
        updated_group_members = await database.fetch_all(updated_group_members_query)
        return {**group, "members": updated_group_members}

@router.delete("/{groupId}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(groupId: str, current_user: User = Depends(get_current_user)):
    # Check if group exists
    group_query = groups.select().where(groups.c.id == groupId)
    group = await database.fetch_one(group_query)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Check if current user is the OWNER
    member_query = members.select().where(
        (members.c.groupId == groupId) & (members.c.userId == current_user["id"])
    )
    member = await database.fetch_one(member_query)
    if not member or member["role"] != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Only the group owner can delete the group.")

    # Delete associated data
    # Note: Foreign key constraints should handle cascading deletes if set up properly in the DB schema.
    # However, to be explicit and safe, we delete from child tables first.

    # Get all transaction IDs for the group
    transactions_in_group_query = transactions.select().where(transactions.c.groupId == groupId).with_only_columns(transactions.c.id)
    transaction_ids = [row[0] for row in await database.fetch_all(transactions_in_group_query)]

    if transaction_ids:
        # Delete from transaction_splits
        delete_splits_query = transaction_splits.delete().where(transaction_splits.c.transactionId.in_(transaction_ids))
        await database.execute(delete_splits_query)

        # Delete from transactions
        delete_transactions_query = transactions.delete().where(transactions.c.id.in_(transaction_ids))
        await database.execute(delete_transactions_query)
    
    # Delete from invitations
    delete_invitations_query = invitations.delete().where(invitations.c.groupId == groupId)
    await database.execute(delete_invitations_query)
    
    # Delete from members
    delete_members_query = members.delete().where(members.c.groupId == groupId)
    await database.execute(delete_members_query)

    # Finally, delete the group
    delete_group_query = groups.delete().where(groups.c.id == groupId)
    await database.execute(delete_group_query)

@router.put("/{groupId}", response_model=Group)
async def update_group(groupId: str, group_data: GroupUpdate, current_user: User = Depends(get_current_user)):
    # Check if group exists
    group_query = groups.select().where(groups.c.id == groupId)
    group = await database.fetch_one(group_query)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Check if current user is the OWNER
    member_query = members.select().where(
        (members.c.groupId == groupId) & (members.c.userId == current_user["id"])
    )
    member = await database.fetch_one(member_query)
    if not member or member["role"] != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Only the group owner can edit the group.")

    # Update group data
    update_data = group_data.dict(exclude_unset=True)
    update_query = groups.update().where(groups.c.id == groupId).values(**update_data)
    await database.execute(update_query)

    # Fetch and return the updated group
    updated_group_query = groups.select().where(groups.c.id == groupId)
    updated_group = await database.fetch_one(updated_group_query)

    members_query = members.select().where(members.c.groupId == groupId)
    group_members = await database.fetch_all(members_query)

    return {**updated_group, "members": group_members}

    return {**updated_group, "members": group_members}

@router.put("/{groupId}/members/{memberId}/replace-with-guest", response_model=Group)
async def replace_member_with_guest(groupId: str, memberId: str, current_user: User = Depends(get_current_user)):
    # Check if group exists
    group_query = groups.select().where(groups.c.id == groupId)
    group = await database.fetch_one(group_query)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Authorize action: only OWNER or ADMIN
    current_user_member_query = members.select().where(
        (members.c.groupId == groupId) & (members.c.userId == current_user["id"])
    )
    current_user_member = await database.fetch_one(current_user_member_query)
    if not current_user_member or current_user_member["role"] not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only group owners and admins can remove members.")

    # Get target member info
    target_member_query = members.select().where(
        (members.c.groupId == groupId) & (members.c.userId == memberId)
    )
    target_member = await database.fetch_one(target_member_query)
    if not target_member:
        raise HTTPException(status_code=404, detail="Member not found")

    # Prevent removing self, owner, or guest
    if current_user["id"] == memberId:
        raise HTTPException(status_code=400, detail="You cannot remove yourself from the group.")
    if target_member["role"] == UserRole.OWNER:
        raise HTTPException(status_code=400, detail="Cannot remove the group owner.")
    if target_member["role"] == UserRole.GUEST:
        raise HTTPException(status_code=400, detail="Cannot remove a guest member directly. Guest members are created when a user leaves or is removed.")

    # --- Start Replacement Process ---
    original_user_id = target_member["userId"]
    original_username = target_member["username"]
    group_id_short = groupId[:8]

    # 1. Create a new virtual guest user
    guest_user_id = str(uuid4())
    guest_username_unique = f"{original_username}-{guest_user_id[:8]}" # Make username globally unique
    guest_email = f"{original_username.replace(' ', '_').lower()}.{group_id_short}@guest.kanak"
    insert_guest_user_query = users.insert().values(
        id=guest_user_id,
        username=guest_username_unique,
        email=guest_email,
        hashed_password=""
    )
    await database.execute(insert_guest_user_query)

    # 2. Re-assign all financial records to the new guest user
    # Update transaction_splits
    update_splits_query = transaction_splits.update().where(
        transaction_splits.c.userId == original_user_id
    ).values(userId=guest_user_id)
    await database.execute(update_splits_query)

    # Update payerId in transactions
    update_payer_query = transactions.update().where(
        transactions.c.payerId == original_user_id
    ).values(payerId=guest_user_id)
    await database.execute(update_payer_query)
    
    # Update createdById in transactions
    update_createdby_query = transactions.update().where(
        transactions.c.createdById == original_user_id
    ).values(createdById=guest_user_id)
    await database.execute(update_createdby_query)

    # 3. Delete the original member from the group
    delete_member_query = members.delete().where(
        (members.c.groupId == groupId) & (members.c.userId == original_user_id)
    )
    await database.execute(delete_member_query)

    # 4. Add the new guest as a member of the group, keeping original name for display
    add_guest_member_query = members.insert().values(
        userId=guest_user_id,
        groupId=groupId,
        username=original_username, # Keep original username for display
        role=UserRole.GUEST,
        isActive=True
    )
    await database.execute(add_guest_member_query)
    
    # --- End Replacement Process ---

    # Fetch and return the updated group
    updated_group_query = groups.select().where(groups.c.id == groupId)
    updated_group = await database.fetch_one(updated_group_query)
    group_members = await database.fetch_all(
        members.select().where((members.c.groupId == groupId) & (members.c.isActive == True))
    )
    return {**updated_group, "members": group_members}


@router.post("/{groupId}/leave", status_code=status.HTTP_200_OK)
async def leave_group(groupId: str, current_user: User = Depends(get_current_user)):
    # Check if group exists
    group_query = groups.select().where(groups.c.id == groupId)
    group = await database.fetch_one(group_query)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Check if user is a member
    member_query = members.select().where(
        (members.c.groupId == groupId) & (members.c.userId == current_user["id"])
    )
    member = await database.fetch_one(member_query)
    if not member or not member["isActive"]:
        raise HTTPException(status_code=403, detail="You are not an active member of this group.")

    # Prevent OWNER from leaving
    if member["role"] == UserRole.OWNER:
        raise HTTPException(status_code=400, detail="The group owner cannot leave the group. You can delete the group instead.")

    # --- Start Replacement Process ---
    original_user_id = current_user["id"]
    original_username = current_user["username"]
    group_id_short = groupId[:8]

    # 1. Create a new virtual guest user
    guest_user_id = str(uuid4())
    guest_username_unique = f"{original_username}-{guest_user_id[:8]}" # Make username globally unique
    guest_email = f"{original_username.replace(' ', '_').lower()}.{group_id_short}@guest.kanak"
    insert_guest_user_query = users.insert().values(
        id=guest_user_id,
        username=guest_username_unique,
        email=guest_email,
        hashed_password=""
    )
    await database.execute(insert_guest_user_query)

    # 2. Re-assign all financial records to the new guest user
    # Update transaction_splits
    update_splits_query = transaction_splits.update().where(
        transaction_splits.c.userId == original_user_id
    ).values(userId=guest_user_id)
    await database.execute(update_splits_query)

    # Update payerId in transactions
    update_payer_query = transactions.update().where(
        transactions.c.payerId == original_user_id
    ).values(payerId=guest_user_id)
    await database.execute(update_payer_query)
    
    # Update createdById in transactions
    update_createdby_query = transactions.update().where(
        transactions.c.createdById == original_user_id
    ).values(createdById=guest_user_id)
    await database.execute(update_createdby_query)

    # 3. Delete the original member from the group
    delete_member_query = members.delete().where(
        (members.c.groupId == groupId) & (members.c.userId == original_user_id)
    )
    await database.execute(delete_member_query)

    # 4. Add the new guest as a member of the group, keeping original name for display
    add_guest_member_query = members.insert().values(
        userId=guest_user_id,
        groupId=groupId,
        username=original_username, # Keep original username for display
        role=UserRole.GUEST,
        isActive=True
    )
    await database.execute(add_guest_member_query)
    
    return {"message": "You have successfully left the group and your records have been anonymized."}

