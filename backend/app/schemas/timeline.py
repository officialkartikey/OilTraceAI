from pydantic import BaseModel
from datetime import datetime

class TimelineEvent(BaseModel):
    stage: str
    status: str
    message: str
    timestamp: datetime
