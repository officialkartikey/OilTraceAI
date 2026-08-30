import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    mongodb_uri: str = "mongodb://localhost:27017/"
    mongodb_database: str = "argus"
    ml_service_url: str = "http://localhost:8000"

    class Config:
        env_file = ".env"

settings = Settings()
