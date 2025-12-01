from fastapi import APIRouter, HTTPException, status
from models import User, UserCreate, UserLogin
from uuid import UUID

router = APIRouter()

# In-memory storage for users
users_db = {}

@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
def register_user(user: UserCreate):
    if user.email in [u["email"] for u in users_db.values()]:
        raise HTTPException(status_code=400, detail="User already exists")
    
    new_user_id = UUID(int=len(users_db) + 1)
    new_user = User(id=new_user_id, username=user.username, email=user.email)
    users_db[new_user_id] = new_user.dict()
    return new_user

@router.post("/login", response_model=User)
def login_user(user: UserLogin):
    for u in users_db.values():
        if u["email"] == user.email:
            # In a real application, you would verify the password here
            return User(**u)
    raise HTTPException(status_code=404, detail="User not found")
