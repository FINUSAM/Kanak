from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from enum import Enum
from uuid import UUID, uuid4
from datetime import datetime

class UserRole(str, Enum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    EDITOR = "EDITOR"
    CONTRIBUTOR = "CONTRIBUTOR"
    VIEWER = "VIEWER"
    GUEST = "GUEST"

class InvitationStatus(str, Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"

class TransactionType(str, Enum):
    DEBIT = "DEBIT"
    CREDIT = "CREDIT"

class SplitMode(str, Enum):
    EQUAL = "EQUAL"
    PERCENTAGE = "PERCENTAGE"
    AMOUNT = "AMOUNT"

class User(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    username: str
    email: EmailStr

class Member(BaseModel):
    userId: UUID
    username: str
    role: UserRole
    joinedAt: datetime = Field(default_factory=datetime.utcnow)

class Group(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    name: str
    description: Optional[str] = None
    members: List[Member] = []
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    createdBy: UUID

class Invitation(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    groupId: UUID
    groupName: str
    inviterId: UUID
    inviterName: str
    inviteeId: UUID
    inviteeEmail: EmailStr
    role: UserRole
    status: InvitationStatus = InvitationStatus.PENDING
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class TransactionSplit(BaseModel):
    userId: UUID
    amount: float
    percentage: Optional[float] = None

class Transaction(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    groupId: UUID
    type: TransactionType
    amount: float
    description: str
    category: Optional[str] = None
    date: datetime = Field(default_factory=datetime.utcnow)
    createdBy: str
    createdById: UUID
    payerId: UUID
    splitMode: SplitMode
    splits: List[TransactionSplit]

# Request/Response Models

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class InvitationRespond(BaseModel):
    accept: bool

class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None

class MemberCreate(BaseModel):
    identifier: str # Email for standard users, Name for GUEST
    role: UserRole

class TransactionCreate(BaseModel):
    type: TransactionType
    amount: float
    description: str
    category: Optional[str] = None
    payerId: UUID
    splitMode: SplitMode
    splits: List[TransactionSplit]
