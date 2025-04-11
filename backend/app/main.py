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
from app.logging import logger
from app.models import (
    Conversation, 
    User, 
    conversations_collection, 
    generate_response, 
    get_available_models, 
    users_collection,
    MessageItem
)

# Load environment variables
load_dotenv()

logger.info("Starting ThreadFlow API")
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
    user_id: Optional[str] = None
    conversation_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    user_message_id: str
    assistant_message_id: str
    
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

class ConversationMetadata(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    parent_conversation_id: Optional[str] = None
    branch_point_message_id: Optional[str] = None

class BranchRequest(BaseModel):
    message_id: str
    user_id: str
    
@app.get("/")
async def root():
    """Returns a message referencing the API"""
    logger.debug("Root endpoint called")
    return {"message": "Welcome to ThreadFlow API"}


@app.get("/health")
async def health_check():
    """Returns a message referencing the health of the API"""
    return {"status": "healthy"}


@app.get("/models")
async def models():
    """Returns available models and their configurations"""
    logger.info("Models endpoint called")
    return get_available_models()


@app.post("/chat", response_model=ChatResponse)
async def chat(message: ChatMessage):
    """Asynchronous method for the chat interface"""
    if not message.user_id:
         # Allow anonymous chats for now, but they won't be saved persistently
         # Or raise HTTPException(status_code=400, detail="user_id is required to save conversation")
        try:
            response_text = await generate_response(
                message=message.message, provider=message.provider, model_id=message.model_id
            )
            # For anonymous chat, we can't provide real IDs back
            return ChatResponse(
                response=response_text,
                conversation_id="anonymous",
                user_message_id="anonymous",
                assistant_message_id="anonymous"
            )
        except HTTPException as excp_err:
            logger.error(f"Error calling AI API (anonymous): {str(excp_err)}")
            # Return a simple dict for anonymous errors, or adjust ChatResponse
            raise HTTPException(status_code=excp_err.status_code, detail=str(excp_err.detail))
        except Exception as e:
            logger.error(f"Unexpected error (anonymous): {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="An internal error occurred during anonymous chat.")
    conversation = None
    target_conversation_id = message.conversation_id
    if target_conversation_id:
        conversation_doc = await conversations_collection.find_one({"id": target_conversation_id, "user_id": message.user_id})
        if conversation_doc:
            # Load existing conversation
            conversation = Conversation(**conversation_doc)
            target_conversation_id = conversation.id # Ensure we use the validated ID
        else:
            # If conversation_id provided but not found/owned, treat as starting new
            target_conversation_id = None
    
    if not conversation:
        new_conv_id = str(uuid.uuid4())
        conversation = Conversation(
            id=new_conv_id,
            user_id=message.user_id,
            title=message.message[:30] + "..." if len(message.message) > 30 else message.message,
            messages=[],
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        target_conversation_id = new_conv_id
    
    user_message_id, assistant_message_id = str(uuid.uuid4()), str(uuid.uuid4())
    user_message_item = MessageItem(
        role="user",
        content=message.message,
        timestamp=datetime.now(),
        id=user_message_id
    )
    
    try:
        # Generate response using the specified provider and model
        response_text = await generate_response(message=message.message, provider=message.provider, model_id=message.model_id)
        
    except HTTPException as excp_err:
        # Log the error
        logger.error(f"Error calling AI API: {str(excp_err)}")
        # Return a user-friendly error message
        return {"response": f"Sorry, I encountered an error when you requested: {str(excp_err)}"}
    except Exception as e:
        # Log the error
        logger.error(f"Unexpected error: {e}", exc_info=True)
        # Return a user-friendly error message
        return {"response": "Sorry, I encountered an unexpected error. Developer Team has been informed."}
    
    assistant_message_item = MessageItem(
        role="assistant",
        content=response_text,
        timestamp=datetime.now(),
        id=assistant_message_id
    )
    
    conversation.messages.append(user_message_item)
    conversation.messages.append(assistant_message_item)
    conversation.updated_at = datetime.now()
    await conversations_collection.replace_one(
        {"id": conversation.id},
        conversation.model_dump(mode="json"),
        upsert=True
    )
    
    logger.info(f"Chat message processed successfully. User: {message.user_id}, Conv: {conversation.id}")

    return ChatResponse(
        response=response_text,
        conversation_id=conversation.id,
        user_message_id=user_message_id,
        assistant_message_id=assistant_message_id
    )

@app.post("/users", response_model=User)
async def create_user(user: UserCreate):
    """Create a new user or update if exists"""
    # Check if user exists
    existing = await users_collection.find_one({"id": user.id})
    user_data = user.model_dump() # Use model_dump for Pydantic v2+
    now = datetime.now()
    if existing:
        user_data["updated_at"] = now
        await users_collection.update_one({"id": user.id}, {"$set": user_data})
    else:
        user_data["created_at"] = now
        user_data["updated_at"] = now
        await users_collection.insert_one(user_data)
    result = await users_collection.find_one({"id": user.id})
    if not result:
         raise HTTPException(status_code=404, detail="User upsert failed") # Should not happen
    # Need to handle potential _id field if it exists and isn't part of the Pydantic model
    result.pop('_id', None)
    return User(**result)


@app.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    """Get user by ID"""
    user = await users_collection.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.pop('_id', None)
    return User(**user)


@app.get("/conversations", response_model=List[ConversationMetadata])
async def get_user_conversations_metadata(user_id: str):
    """
    Get metadata (excluding messages) for all conversations owned by a user,
    sorted by last updated time.
    """
    # get user_id from an authenticated  token - future

    # Check if user exists (optional, but good practice)
    user_exists = await users_collection.count_documents({"id": user_id})
    if not user_exists:
        # revealing 404 user not found maybe is giving security info
        return []

    # Define the projection to exclude messages
    projection = {"messages": 0, "_id": 0} # Exclude MongoDB default _id too

    conversations_cursor = conversations_collection.find(
        {"user_id": user_id},
        projection=projection
    ).sort("updated_at", -1)

    conversations_metadata = await conversations_cursor.to_list(length=None)

    # Pydantic validation before returning
    return [ConversationMetadata(**conv) for conv in conversations_metadata]

@app.get("/conversations/{conversation_id}", response_model=Conversation)
async def get_full_conversation(conversation_id: str, user_id: str): # Pass user_id for ownership check
     """
     Get the full content (including messages) for a specific conversation,
     checking for user ownership.
     """
     # Again, user_id should ideally come from auth token
     conversation_doc = await conversations_collection.find_one({"id": conversation_id})

     if not conversation_doc:
         raise HTTPException(status_code=404, detail="Conversation not found")

     # --- Ownership Check ---
     if conversation_doc.get("user_id") != user_id:
          raise HTTPException(status_code=403, detail="User does not have permission to access this conversation")
          # Or return 404 for obscurity
     conversation_doc.pop('_id', None)

     return Conversation(**conversation_doc)

@app.post("/conversations/{conversation_id}/branch", response_model=Conversation, status_code=201)
async def branch_conversation(conversation_id: str, branch_request: BranchRequest):
    """
    Creates a new conversation branch from a specific message in the parent conversation.
    """
    # Again, user_id ideally from auth context
    parent_user_id = branch_request.user_id

    # 1. Fetch Parent Conversation (Full Document)
    parent_doc = await conversations_collection.find_one({"id": conversation_id})
    if not parent_doc:
        raise HTTPException(status_code=404, detail="Parent conversation not found")

    # 2. Check Ownership
    if parent_doc.get("user_id") != parent_user_id:
        raise HTTPException(status_code=403, detail="User does not have permission to branch this conversation")

    parent_conversation = Conversation(**parent_doc) # Validate parent data

    # 3. Find Branch Point Message Index
    branch_message_id = branch_request.message_id
    branch_index = -1
    for i, msg in enumerate(parent_conversation.messages):
        if msg.id == branch_message_id:
            branch_index = i
            break

    if branch_index == -1:
        raise HTTPException(status_code=404, detail=f"Message ID '{branch_message_id}' not found in parent conversation '{conversation_id}'")

    # 4. Create New Branch Conversation Data
    new_branch_id = str(uuid.uuid4())
    
    # Copy messages up to and including the branch point message
    branch_messages = parent_conversation.messages[:branch_index + 1]

    branch_title = f"Branch from '{parent_conversation.title[:20]}...' @ msg {branch_index + 1}" # Example title

    new_branch_conversation = Conversation(
        id=new_branch_id,
        user_id=parent_user_id, # Branch owned by the same user
        title=branch_title,
        messages=branch_messages,
        created_at=datetime.now(),
        updated_at=datetime.now(), # Same as created_at initially
        parent_conversation_id=conversation_id, # Link to parent
        branch_point_message_id=branch_message_id # Link to specific message
    )

    # 5. Insert New Branch into DB
    await conversations_collection.insert_one(new_branch_conversation.model_dump(mode='json'))

    # 6. Return the full new branch conversation object
    return new_branch_conversation

@app.get("/debug/all-conversations")
async def get_all_conversations():
    """Debug endpoint: Get all conversations in the database"""
    conversations = await conversations_collection.find().to_list(length=100)
    # Convert MongoDB ObjectId to string to make it JSON serializable
    for conv in conversations:
        if "_id" in conv:
            conv["_id"] = str(conv["_id"])
    return conversations


@app.get("/debug/all-users")
async def get_all_users():
    """Debug endpoint: Get all users in the database"""
    users = await users_collection.find().to_list(length=100)
    # Convert MongoDB ObjectId to string to make it JSON serializable
    for user in users:
        if "_id" in user:
            user["_id"] = str(user["_id"])
    return users


@app.get("/debug/logs")
async def get_logs(lines: int = 100):
    """Debug endpoint: Get the most recent log entries"""
    log_path = "logs/threadflow.log"
    try:
        with open(log_path, "r") as f:
            # Get last N lines from log file
            log_lines = f.readlines()
            return {"logs": log_lines[-lines:]}
    except FileNotFoundError:
        logger.error(f"Log file not found at {log_path}")
        return {"error": "Log file not found"}
    except Exception as e:
        logger.error(f"Error reading log file: {e}", exc_info=True)
        return {"error": f"Error reading log file: {str(e)}"}

