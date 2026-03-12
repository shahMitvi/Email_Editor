import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import certifi

load_dotenv()

MONGO_URL = os.getenv("MONGODB_URL")
# DB_NAME = os.getenv("DB_NAME","your_db_name")

ca = certifi.where()
client = AsyncIOMotorClient(MONGO_URL, tlsCAFile=ca)
db = client["your_db_name"]

def get_db():
    return db
