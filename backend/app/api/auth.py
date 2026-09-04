from fastapi import APIRouter, HTTPException, status
from app.schemas.auth import SignupRequest, LoginRequest, LoginResponse, UserResponse
from app.repositories.user_repository import UserRepository
from app.core.config import settings
import hashlib
import uuid

router = APIRouter()
user_repo = UserRepository()

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

@router.post("/signup")
async def signup(request: SignupRequest):
    if request.secret_key != settings.super_secret_key:
        raise HTTPException(status_code=403, detail="Invalid super secret key")
        
    existing_user = await user_repo.get_by_email(request.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_data = {
        "email": request.email,
        "password": hash_password(request.password),
        "userType": request.userType
    }
    
    await user_repo.create_user(user_data)
    
    return {"message": "User registered successfully"}

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    user = await user_repo.get_by_email(request.email)
    if not user or user["password"] != hash_password(request.password):
        # Return 401 but we might also just send the response based on frontend parsing
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = str(uuid.uuid4())
    
    return LoginResponse(
        token=token,
        user=UserResponse(
            id=str(user["_id"]),
            email=user["email"],
            userType=user.get("userType", "Analyst")
        )
    )
