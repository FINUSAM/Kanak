import os
from databases import Database
from sqlalchemy import create_engine, MetaData
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./kanak.db")

connect_args = {}
engine_kwargs = {}

if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    engine_kwargs = {"pool_pre_ping": True}

database = Database(DATABASE_URL)
metadata = MetaData()

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    **engine_kwargs
)
