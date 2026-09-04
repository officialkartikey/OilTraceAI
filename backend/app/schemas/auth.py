from pydantic import BaseModel

class SignupRequest(BaseModel):
    email: str
    password: str
    userType: str = "Analyst"
    secret_key: str

class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    userType: str

class LoginResponse(BaseModel):
    token: str
    user: UserResponse
