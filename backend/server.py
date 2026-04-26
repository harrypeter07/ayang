from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict

# ---------- Setup ----------
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

mongo_url = os.environ.get("MONGO_URL")
db_name = os.environ.get("DB_NAME")

if not mongo_url or not db_name:
    raise Exception("Missing environment variables: MONGO_URL or DB_NAME")

# Be tolerant of common deployment input mistakes in env dashboards.
mongo_url = mongo_url.strip().strip("\"'")
if mongo_url.startswith("MONGO_URL="):
    mongo_url = mongo_url.split("=", 1)[1].strip().strip("\"'")

if not (mongo_url.startswith("mongodb://") or mongo_url.startswith("mongodb+srv://")):
    raise Exception(
        "Invalid MONGO_URL format. Value must start with "
        "'mongodb://' or 'mongodb+srv://'."
    )

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

app = FastAPI(title="RCC Leads API")
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ["JWT_SECRET"]

# ---------- Password + JWT ----------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

# ---------- Models ----------
ROLES = {"admin", "lead_filler", "closer"}
STATUSES = {"not_called", "called", "approved", "rejected", "follow_up"}

class UserPublic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: EmailStr
    name: str
    role: str
    created_at: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str

class LeadCreate(BaseModel):
    instagram_id: str
    business_name: str
    phone: str
    category: str
    notes: Optional[str] = ""
    assigned_closer_id: Optional[str] = None

class LeadUpdate(BaseModel):
    instagram_id: Optional[str] = None
    business_name: Optional[str] = None
    phone: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None
    assigned_closer_id: Optional[str] = None

class StatusUpdate(BaseModel):
    status: str
    closer_notes: str
    follow_up_date: Optional[str] = None  # ISO date string

class Lead(BaseModel):
    id: str
    instagram_id: str
    business_name: str
    phone: str
    category: str
    notes: str
    assigned_closer_id: Optional[str] = None
    assigned_closer_name: Optional[str] = None
    status: str
    follow_up_date: Optional[str] = None
    closer_notes: str
    created_by_id: str
    created_by_name: str
    created_at: str
    updated_at: str

# ---------- Auth dependency ----------
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def require_roles(*roles):
    async def checker(user: dict = Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return checker

# ---------- Auth endpoints ----------
@api_router.post("/auth/login")
async def login(body: LoginRequest, response: Response):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], user["email"], user["role"])
    response.set_cookie(
        key="access_token", value=token, httponly=True,
        secure=True, samesite="none", max_age=7*24*3600, path="/"
    )
    return {
        "id": user["id"], "email": user["email"], "name": user["name"],
        "role": user["role"], "token": token,
    }

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]}

# ---------- User management (admin only) ----------
@api_router.get("/users")
async def list_users(user: dict = Depends(require_roles("admin"))):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)
    return users

@api_router.get("/users/closers")
async def list_closers(user: dict = Depends(get_current_user)):
    # admin + lead_filler need this for assigning leads
    if user["role"] not in ("admin", "lead_filler"):
        raise HTTPException(status_code=403, detail="Forbidden")
    closers = await db.users.find({"role": "closer"}, {"_id": 0, "password_hash": 0}).sort("name", 1).to_list(200)
    return closers

@api_router.post("/users")
async def create_user(body: CreateUserRequest, user: dict = Depends(require_roles("admin"))):
    if body.role not in ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")
    email = body.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    new_user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name.strip(),
        "role": body.role,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(new_user)
    new_user.pop("password_hash")
    new_user.pop("_id", None)
    return new_user

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(require_roles("admin"))):
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target["role"] == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete admin user")
    await db.users.delete_one({"id": user_id})
    # Unassign any leads from this closer
    await db.leads.update_many(
        {"assigned_closer_id": user_id},
        {"$set": {"assigned_closer_id": None, "assigned_closer_name": None}},
    )
    return {"ok": True}

# ---------- Helpers ----------
async def enrich_lead(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc

async def get_closer_name(closer_id: Optional[str]) -> Optional[str]:
    if not closer_id:
        return None
    c = await db.users.find_one({"id": closer_id}, {"_id": 0, "name": 1})
    return c["name"] if c else None

# ---------- Leads endpoints ----------
@api_router.get("/leads")
async def list_leads(
    status: Optional[str] = None,
    assigned_closer_id: Optional[str] = None,
    search: Optional[str] = None,
    follow_up_today: Optional[bool] = False,
    user: dict = Depends(get_current_user),
):
    query = {}
    if user["role"] == "closer":
        query["assigned_closer_id"] = user["id"]
    elif assigned_closer_id:
        query["assigned_closer_id"] = assigned_closer_id

    if status:
        query["status"] = status
    if search:
        query["instagram_id"] = {"$regex": search, "$options": "i"}
    if follow_up_today:
        today = datetime.now(timezone.utc).date().isoformat()
        query["status"] = "follow_up"
        query["follow_up_date"] = today

    leads = await db.leads.find(query, {"_id": 0}).sort("updated_at", -1).to_list(1000)
    return leads

@api_router.post("/leads")
async def create_lead(body: LeadCreate, user: dict = Depends(require_roles("admin", "lead_filler"))):
    phone = body.phone.strip()
    ig = body.instagram_id.strip().lstrip("@")
    # Duplicate check
    dup = await db.leads.find_one({"$or": [{"phone": phone}, {"instagram_id": ig}]})
    if dup:
        raise HTTPException(status_code=409, detail="Duplicate: Lead with same Instagram ID or Phone already exists")
    now = datetime.now(timezone.utc).isoformat()
    closer_name = await get_closer_name(body.assigned_closer_id)
    lead = {
        "id": str(uuid.uuid4()),
        "instagram_id": ig,
        "business_name": body.business_name.strip(),
        "phone": phone,
        "category": body.category.strip(),
        "notes": (body.notes or "").strip(),
        "assigned_closer_id": body.assigned_closer_id,
        "assigned_closer_name": closer_name,
        "status": "not_called",
        "follow_up_date": None,
        "closer_notes": "",
        "created_by_id": user["id"],
        "created_by_name": user["name"],
        "created_at": now,
        "updated_at": now,
    }
    await db.leads.insert_one(lead.copy())
    lead.pop("_id", None)
    return lead

@api_router.put("/leads/{lead_id}")
async def update_lead(lead_id: str, body: LeadUpdate, user: dict = Depends(require_roles("admin", "lead_filler"))):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    update = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if "instagram_id" in update:
        update["instagram_id"] = update["instagram_id"].strip().lstrip("@")
    if "assigned_closer_id" in update:
        update["assigned_closer_name"] = await get_closer_name(update["assigned_closer_id"])
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.leads.update_one({"id": lead_id}, {"$set": update})
    fresh = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    return fresh

@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, user: dict = Depends(require_roles("admin", "lead_filler"))):
    res = await db.leads.delete_one({"id": lead_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"ok": True}

@api_router.patch("/leads/{lead_id}/status")
async def update_status(lead_id: str, body: StatusUpdate, user: dict = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    # closers can only update leads assigned to them
    if user["role"] == "closer" and lead.get("assigned_closer_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Not your lead")
    if body.status not in STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    if body.status == "follow_up" and not body.follow_up_date:
        raise HTTPException(status_code=400, detail="follow_up_date required for follow_up status")
    update = {
        "status": body.status,
        "closer_notes": body.closer_notes.strip(),
        "follow_up_date": body.follow_up_date if body.status == "follow_up" else None,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.leads.update_one({"id": lead_id}, {"$set": update})
    fresh = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    return fresh

@api_router.get("/stats/closer-activity")
async def closer_activity(user: dict = Depends(require_roles("admin"))):
    pipeline = [
        {"$match": {"assigned_closer_id": {"$ne": None}}},
        {"$group": {
            "_id": {"closer_id": "$assigned_closer_id", "closer_name": "$assigned_closer_name", "status": "$status"},
            "count": {"$sum": 1},
        }},
    ]
    result = {}
    async for row in db.leads.aggregate(pipeline):
        cid = row["_id"]["closer_id"]
        cname = row["_id"]["closer_name"] or "Unknown"
        status = row["_id"]["status"]
        if cid not in result:
            result[cid] = {"closer_id": cid, "closer_name": cname, "total": 0, "by_status": {}}
        result[cid]["by_status"][status] = row["count"]
        result[cid]["total"] += row["count"]
    return list(result.values())

# ---------- Startup: seed + indexes ----------
@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.leads.create_index("id", unique=True)
    await db.leads.create_index("assigned_closer_id")
    await db.leads.create_index("phone")
    await db.leads.create_index("instagram_id")

    await _seed_user(
        email=os.environ.get("ADMIN_EMAIL", ""),
        password=os.environ.get("ADMIN_PASSWORD", ""),
        name="Harsh (Admin)",
        role="admin",
    )
    await _seed_user(
        email=os.environ.get("FILLER_EMAIL", ""),
        password=os.environ.get("FILLER_PASSWORD", ""),
        name="Yasmeen (Lead Filler)",
        role="lead_filler",
    )
    logger.info("RCC Leads backend started. Admin + Lead Filler seeded.")

async def _seed_user(email: str, password: str, name: str, role: str):
    if not email or not password:
        return
    email = email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": email,
            "password_hash": hash_password(password),
            "name": name,
            "role": role,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Seeded {role}: {email}")
    elif not verify_password(password, existing["password_hash"]):
        await db.users.update_one(
            {"email": email},
            {"$set": {"password_hash": hash_password(password), "name": name, "role": role}},
        )
        logger.info(f"Updated seeded {role}: {email}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Router + CORS
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
        origin.strip()
        for origin in os.environ.get("CORS_ORIGINS", "").split(",")
        if origin.strip()
    ] or ["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@api_router.get("/")
async def root():
    return {"message": "RCC Leads API running"}
