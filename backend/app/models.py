from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class Message(BaseModel):
    id: str
    content: str
    role: str  # "user" or "assistant"
    timestamp: datetime

class Thread(BaseModel):
    id: str
    messages: List[Message]
    parent_thread_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime 