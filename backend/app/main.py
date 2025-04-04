"""
This module provides utility for the backend
This encases the main function for the backend
"""

import uuid
from datetime import datetime
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

from app.config import DEFAULT_MODEL_ID, DEFAULT_MODEL_PROVIDER
from app.models import (
    Conversation, 
    User, 
    conversations_collection, 
    generate_response, 
    get_available_models, 
    users_collection
)

# Load environment variables
load_dotenv()

app = FastAPI(title="ThreadFlow API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    """
    This class provides utility for the chatbot message
    Input: BaseModel - AI model to be used for the interface
    """

    message: str
    provider: str = DEFAULT_MODEL_PROVIDER
    model_id: str = DEFAULT_MODEL_ID


class UserCreate(BaseModel):
    """User creation model for API requests"""
    id: str
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    image: Optional[str] = None


class ConversationCreate(BaseModel):
    """Conversation creation model"""
    user_id: str
    title: str
    initial_message: Optional[str] = None


@app.get("/")
async def root():
    """Returns a message referencing the API"""
    return {"message": "Welcome to ThreadFlow API"}


@app.get("/health")
async def health_check():
    """Returns a message referencing the health of the API"""
    return {"status": "healthy"}


@app.get("/models")
async def models():
    """Returns available models and their configurations"""
    return get_available_models()


@app.post("/chat")
async def chat(message: ChatMessage):
    """Asynchronous method for the chat interface"""
    try:
        # Generate response using the specified provider and model
        response_text = await generate_response(message=message.message, provider=message.provider, model_id=message.model_id)
        return {"response": response_text}
    except HTTPException as excp_err:
        # Log the error
        print(f"Error calling AI API: {str(excp_err)}")
        # Return a user-friendly error message
        return {"response": f"Sorry, I encountered an error when you requested: {str(excp_err)}"}


@app.post("/users", response_model=User)
async def create_user(user: UserCreate):
    """Create a new user or update if exists"""
    # Check if user exists
    existing = await users_collection.find_one({"id": user.id})
    
    if existing:
        # Update user
        user_data = user.model_dump()
        user_data["updated_at"] = datetime.now()
        await users_collection.update_one(
            {"id": user.id}, 
            {"$set": user_data}
        )
    else:
        # Create new user
        user_data = user.model_dump()
        user_data["created_at"] = datetime.now()
        user_data["updated_at"] = datetime.now()
        await users_collection.insert_one(user_data)
    
    # Return the user
    result = await users_collection.find_one({"id": user.id})
    return User(**result)


@app.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    """Get user by ID"""
    user = await users_collection.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)


@app.post("/conversations", response_model=Conversation)
async def create_conversation(conv: ConversationCreate):
    """Create a new conversation"""
    # Check if user exists
    user = await users_collection.find_one({"id": conv.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create conversation
    conversation_id = str(uuid.uuid4())
    conversation = {
        "id": conversation_id,
        "user_id": conv.user_id,
        "title": conv.title,
        "messages": [],
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    
    # Add initial message if provided
    if conv.initial_message:
        conversation["messages"].append({
            "role": "user",
            "content": conv.initial_message,
            "timestamp": datetime.now()
        })
    
    await conversations_collection.insert_one(conversation)
    
    # Return the conversation
    result = await conversations_collection.find_one({"id": conversation_id})
    return Conversation(**result)


@app.get("/conversations/{user_id}", response_model=List[Conversation])
async def get_user_conversations(user_id: str):
    """Get all conversations for a user"""
    # Check if user exists
    user = await users_collection.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    conversations = await conversations_collection.find({"user_id": user_id}).to_list(length=100)
    return [Conversation(**conv) for conv in conversations]
