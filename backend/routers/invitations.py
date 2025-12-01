from fastapi import APIRouter, HTTPException, status
from models import Invitation, InvitationRespond
from typing import List
from uuid import UUID

router = APIRouter()

# In-memory storage
invitations_db = {}

@router.get("/", response_model=List[Invitation])
def get_pending_invitations():
    return list(invitations_db.values())

@router.post("/{invitationId}/respond")
def respond_to_invitation(invitationId: UUID, response: InvitationRespond):
    if invitationId not in invitations_db:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    invitation = invitations_db[invitationId]
    if response.accept:
        invitation["status"] = "ACCEPTED"
    else:
        invitation["status"] = "REJECTED"
        
    return {"message": "Invitation responded"}
