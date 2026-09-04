import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_database: str = "kairos"
    ml_service_url: str = "http://localhost:8000"
    
    # Cloudinary Config
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""
    
    super_secret_key: str = "default_secret"

    class Config:
        env_file = ".env"

settings = Settings()
