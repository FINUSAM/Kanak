from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import database, engine, metadata
from routers import auth, groups, invitations, transactions

metadata.create_all(bind=engine)

app = FastAPI(
    title="Kanak API",
    version="1.1.0",
    description="Backend API specification for Kanak, a group expense tracker with role-based access, invitation systems, and complex transaction splitting."
)

@app.on_event("startup")
async def startup():
    await database.connect()

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "https://kanak-lywq.onrender.com", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(groups.router, prefix="/groups", tags=["Groups"])
app.include_router(invitations.router, prefix="/invitations", tags=["Invitations"])
app.include_router(transactions.router, prefix="/groups", tags=["Transactions"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the Kanak API"}
