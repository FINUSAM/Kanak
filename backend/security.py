import os
from passlib.context import CryptContext
from jose import jwk, jwt, JWTError
from datetime import datetime, timedelta
from typing import Optional
import httpx 
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from models import users, User
from database import database
from cachetools import cached, TTLCache

SECRET_KEY = os.getenv("SECRET_KEY", "a_super_secret_key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Supabase specific configurations
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_AUDIENCE = os.getenv("SUPABASE_AUDIENCE")
SUPABASE_ISSUER = os.getenv("SUPABASE_ISSUER")

# Cache JWKS for 1 hour
@cached(cache=TTLCache(maxsize=1, ttl=3600))
def get_jwks():
    if not SUPABASE_URL:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_URL environment variable not configured."
        )
    jwks_url = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
    try:
        response = httpx.get(jwks_url)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not fetch JWKS: {e}")

async def get_supabase_user_claims(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        jwks = get_jwks()
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        if not kid:
            raise JWTError("Missing 'kid' in token header")

        rsa_key = {}
        for key in jwks["keys"]:
            if key["kid"] == kid:
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key["use"],
                    "n": key["n"],
                    "e": key["e"],
                }
                break
        
        if not rsa_key:
            raise JWTError("Unable to find appropriate key in JWKS")
            
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=SUPABASE_AUDIENCE,
            issuer=SUPABASE_ISSUER,
        )
        return payload
    except JWTError as e:
        print(f"JWT Validation Error: {e}")
        raise credentials_exception
    except Exception as e:
        print(f"Unexpected error in get_supabase_user_claims: {e}")
        raise credentials_exception

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password[:72])

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(supabase_claims: dict = Depends(get_supabase_user_claims)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or user not found",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    supabase_user_id = supabase_claims.get("sub")
    if not supabase_user_id:
        raise credentials_exception

    query = users.select().where(users.c.supabase_user_id == supabase_user_id)
    user = await database.fetch_one(query)

    if user is None:
        raise credentials_exception
    return User(**user)
