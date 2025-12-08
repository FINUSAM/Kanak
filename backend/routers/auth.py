import sqlite3
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import database
from models import users, User, UserCreate, Token
from security import get_password_hash, verify_password, create_access_token, get_current_user, get_supabase_user_claims
from datetime import timedelta
from uuid import uuid4

router = APIRouter()

ACCESS_TOKEN_EXPIRE_MINUTES = 30

@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
async def register_user(user: UserCreate):
    query = users.select().where((users.c.email == user.email) | (users.c.username == user.username))
    if await database.fetch_one(query):
        raise HTTPException(status_code=400, detail="Username or email already exists")
    
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
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@router.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/sync", response_model=User)
async def sync_user_with_supabase(supabase_claims: dict = Depends(get_supabase_user_claims)):
    supabase_user_id = supabase_claims.get("sub")
    email = supabase_claims.get("email")
    # Prefer full_name, then name from user_metadata, then derive from email
    username = supabase_claims.get("user_metadata", {}).get("full_name") or \
               supabase_claims.get("user_metadata", {}).get("name") or \
               (email.split("@")[0] if email else None)

    if not supabase_user_id or not email or not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required claims from Supabase token (sub, email, or name)."
        )

    # Check if user with this supabase_user_id already exists
    query = users.select().where(users.c.supabase_user_id == supabase_user_id)
    existing_user = await database.fetch_one(query)

    if existing_user:
        # User exists, update details if necessary
        update_data = {}
        if existing_user["email"] != email:
            update_data["email"] = email
        if existing_user["username"] != username:
            # Check for username uniqueness before updating
            username_conflict_query = users.select().where(users.c.username == username)
            if not await database.fetch_one(username_conflict_query):
                update_data["username"] = username

        if update_data:
            update_query = users.update().where(users.c.id == existing_user["id"]).values(**update_data)
            await database.execute(update_query)
        
        # Fetch the potentially updated user to return
        updated_user = await database.fetch_one(query)
        return User(**updated_user)
    else:
        # User does not exist, try to create new one
        user_id = str(uuid4())
        
        # Ensure username is unique before inserting
        original_username = username
        counter = 1
        while True:
            username_query = users.select().where(users.c.username == username)
            if not await database.fetch_one(username_query):
                break
            username = f"{original_username}_{counter}"
            counter += 1

        insert_query = users.insert().values(
            id=user_id,
            username=username,
            email=email,
            supabase_user_id=supabase_user_id,
            hashed_password=None # Supabase users don't have a local password
        )
        
        try:
            await database.execute(insert_query)
        except (sqlite3.IntegrityError, Exception) as e: # Catch IntegrityError for race conditions
            # This handles the race condition: another request created the user
            # just after our SELECT check. We can now fetch the user that should exist.
            print(f"INFO: Handled race condition during user sync: {e}")
            pass
        
        # Fetch the user (either newly created or created by the other request)
        final_user = await database.fetch_one(users.select().where(users.c.supabase_user_id == supabase_user_id))
        if not final_user:
            raise HTTPException(status_code=500, detail="Could not create or find user after sync.")
            
        return User(**final_user)
