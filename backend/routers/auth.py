from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import database
from models import users, User, UserCreate, Token
from security import get_password_hash, verify_password, create_access_token, get_current_user
from datetime import timedelta
from uuid import uuid4

router = APIRouter()

ACCESS_TOKEN_EXPIRE_MINUTES = 30

@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
async def register_user(user: UserCreate):
    query = users.select().where(users.c.email == user.email)
    if await database.fetch_one(query):
        raise HTTPException(status_code=400, detail="User already exists")
    
    user_id = str(uuid4())
    hashed_password = get_password_hash(user.password)
    query = users.insert().values(id=user_id, username=user.username, email=user.email, hashed_password=hashed_password)
    await database.execute(query)
    return {**user.dict(), "id": user_id}


@router.post("/login", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    query = users.select().where(users.c.email == form_data.username) # form_data.username is the email
    user = await database.fetch_one(query)
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
