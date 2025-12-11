from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    String,
    Table,
    create_engine,
    Boolean,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from enum import Enum as PyEnum
from uuid import UUID as PyUUID, uuid4
from datetime import datetime
from database import metadata
import sqlalchemy

class UserRole(str, PyEnum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    EDITOR = "EDITOR"
    CONTRIBUTOR = "CONTRIBUTOR"
    VIEWER = "VIEWER"
    GUEST = "GUEST"

class InvitationStatus(str, PyEnum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"

class TransactionType(str, PyEnum):
    DEBIT = "DEBIT"
    CREDIT = "CREDIT"

class SplitMode(str, PyEnum):
    EQUAL = "EQUAL"
    PERCENTAGE = "PERCENTAGE"
    AMOUNT = "AMOUNT"

users = Table(
    "users",
    metadata,
    Column("id", sqlalchemy.String, primary_key=True, default=lambda: str(uuid4())),
    Column("username", String, unique=True, nullable=False),
    Column("email", String, unique=True, nullable=False),
    Column("hashed_password", String, nullable=True),
    Column("supabase_user_id", String, unique=True, nullable=True, index=True),
)

groups = Table(
    "groups",
    metadata,
    Column("id", sqlalchemy.String, primary_key=True, default=lambda: str(uuid4())),
    Column("name", String, nullable=False),
    Column("description", String),
    Column("createdAt", DateTime, server_default=func.now()),
    Column("createdBy", sqlalchemy.String, ForeignKey("users.id")),
)

members = Table(
    "members",
    metadata,
    Column("userId", sqlalchemy.String, ForeignKey("users.id"), primary_key=True),
    Column("groupId", sqlalchemy.String, ForeignKey("groups.id"), primary_key=True),
    Column("username", String, nullable=False),
    Column("role", Enum(UserRole), nullable=False),
    Column("joinedAt", DateTime, server_default=func.now()),
    Column("isActive", Boolean, server_default="true", nullable=False),
)

invitations = Table(
    "invitations",
    metadata,
    Column("id", sqlalchemy.String, primary_key=True, default=lambda: str(uuid4())),
    Column("groupId", sqlalchemy.String, ForeignKey("groups.id")),
    Column("groupName", String),
    Column("inviterId", sqlalchemy.String, ForeignKey("users.id")),
    Column("inviterName", String),
    Column("inviteeId", sqlalchemy.String, ForeignKey("users.id")),
    Column("inviteeEmail", String),
    Column("role", Enum(UserRole)),
    Column("status", Enum(InvitationStatus), default=InvitationStatus.PENDING),
    Column("createdAt", DateTime, server_default=func.now()),
)

transactions = Table(
    "transactions",
    metadata,
    Column("id", sqlalchemy.String, primary_key=True, default=lambda: str(uuid4())),
    Column("groupId", sqlalchemy.String, ForeignKey("groups.id")),
    Column("type", Enum(TransactionType)),
    Column("amount", Float),
    Column("description", String),
    Column("date", DateTime(timezone=True), server_default=func.now()),
    Column("createdBy", String),
    Column("createdById", sqlalchemy.String, ForeignKey("users.id")),
    Column("payerId", sqlalchemy.String, ForeignKey("users.id")),
    Column("splitMode", Enum(SplitMode)),
)

transaction_splits = Table(
    "transaction_splits",
    metadata,
    Column("transactionId", sqlalchemy.String, ForeignKey("transactions.id"), primary_key=True),
    Column("userId", sqlalchemy.String, ForeignKey("users.id"), primary_key=True),
    Column("amount", Float),
    Column("percentage", Float),
)


# Pydantic models

class UserBase(BaseModel):
    username: str
    email: EmailStr
    supabase_user_id: Optional[str] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str
    supabase_user_id: Optional[str] = None

    class Config:
        from_attributes = True

class UserInDB(User):
    hashed_password: Optional[str] = None
    supabase_user_id: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class TokenData(BaseModel):
    username: Optional[str] = None


class GroupBase(BaseModel):
    name: str
    description: Optional[str] = None

class GroupCreate(GroupBase):
    pass

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class Group(GroupBase):
    id: str
    createdAt: datetime
    createdBy: str
    members: List["Member"] = []

    class Config:
        from_attributes = True

class MemberBase(BaseModel):
    role: UserRole

class MemberCreate(MemberBase):
    identifier: str # Email for standard users, Name for GUEST

class MemberUpdate(BaseModel):
    role: UserRole

class Member(MemberBase):
    userId: str
    username: str
    joinedAt: datetime

    class Config:
        from_attributes = True



class InvitationBase(BaseModel):
    inviteeEmail: EmailStr
    role: UserRole

class InvitationCreate(InvitationBase):
    pass

class Invitation(InvitationBase):
    id: str
    groupId: str
    groupName: str
    inviterId: str
    inviterName: str
    status: InvitationStatus
    createdAt: datetime

    class Config:
        from_attributes = True

class InvitationRespond(BaseModel):
    accept: bool


class TransactionSplitBase(BaseModel):
    userId: str
    amount: float
    percentage: Optional[float] = None

class TransactionSplitCreate(TransactionSplitBase):
    pass

class TransactionSplit(TransactionSplitBase):
    pass

    class Config:
        from_attributes = True


class TransactionBase(BaseModel):
    type: TransactionType
    amount: float
    description: str
    payerId: str
    splitMode: SplitMode
    splits: List[TransactionSplitCreate]

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(TransactionBase):
    splits: Optional[List[TransactionSplitCreate]] = None
    date: Optional[datetime] = None

class Transaction(TransactionBase):
    id: str
    groupId: str
    date: datetime
    createdBy: str
    createdById: str
    splits: List[TransactionSplit]

    class Config:
        from_attributes = True