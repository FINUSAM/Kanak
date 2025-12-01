from fastapi import APIRouter, Depends, HTTPException, status
from models import Invitation, InvitationRespond, User, InvitationStatus, members, invitations
from typing import List
from uuid import UUID
from database import database
from security import get_current_user

router = APIRouter()

@router.get("/", response_model=List[Invitation])
async def get_pending_invitations(current_user: User = Depends(get_current_user)):
    query = invitations.select().where(
        (invitations.c.inviteeId == current_user["id"]) |
        (invitations.c.inviteeEmail == current_user["email"])
    )
    return await database.fetch_all(query)

@router.post("/{invitationId}/respond")
async def respond_to_invitation(invitationId: str, response: InvitationRespond, current_user: User = Depends(get_current_user)):
    query = invitations.select().where(invitations.c.id == invitationId)
    invitation_record = await database.fetch_one(query)

    if not invitation_record:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if (invitation_record["inviteeId"] != current_user["id"] and
        invitation_record["inviteeEmail"] != current_user["email"]):
        raise HTTPException(status_code=403, detail="Not authorized to respond to this invitation")

    if response.accept:
        # Add user to group members
        insert_member_query = members.insert().values(
            userId=current_user["id"],
            groupId=invitation_record["groupId"],
            username=current_user["username"],
            role=invitation_record["role"]
        )
        await database.execute(insert_member_query)

        # Update invitation status
        update_invitation_query = invitations.update().where(invitations.c.id == invitationId).values(
            status=InvitationStatus.ACCEPTED,
            inviteeId=current_user["id"] # Ensure inviteeId is set if not already
        )
        await database.execute(update_invitation_query)
        return {"message": "Invitation accepted and user added to group"}
    else:
        update_invitation_query = invitations.update().where(invitations.c.id == invitationId).values(
            status=InvitationStatus.REJECTED
        )
        await database.execute(update_invitation_query)
        return {"message": "Invitation rejected"}
