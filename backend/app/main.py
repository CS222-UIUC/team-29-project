"""This module provides utility for the backend
This encases the main function for the backend
"""

import uuid
from datetime import datetime

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

from app.config import DEFAULT_MODEL_ID, DEFAULT_MODEL_PROVIDER
from app.logging import logger
from app.models import Conversation, MessageItem, User, conversations_collection, generate_response, get_available_models
from app.security import get_current_user

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
    """This class provides utility for the chatbot message
    Input: BaseModel - AI model to be used for the interface
    """

    message: str
    provider: str = DEFAULT_MODEL_PROVIDER
    model_id: str = DEFAULT_MODEL_ID
    conversation_id: str | None = None


class ChatResponse(BaseModel):
    """Response model for chat API requests"""

    response: str
    conversation_id: str
    user_message_id: str
    assistant_message_id: str


class UserCreate(BaseModel):
    """User creation model for API requests"""

    id: str
    email: EmailStr | None = None
    name: str | None = None
    image: str | None = None


class ConversationCreate(BaseModel):
    """Conversation creation model"""

    title: str
    initial_message: str | None = None


class ConversationMetadata(BaseModel):
    """Metadata model for conversation summaries"""

    id: str
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    parent_conversation_id: str | None = None
    branch_point_message_id: str | None = None


class BranchRequest(BaseModel):
    """Request model for creating conversation branches"""

    message_id: str


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
async def chat(message: ChatMessage, current_user: User = Depends(get_current_user)):
    """Asynchronous method for the chat interface"""
    conversation = None
    target_conversation_id = message.conversation_id
    if target_conversation_id:
        conversation_doc = await conversations_collection.find_one({"id": target_conversation_id, "user_id": current_user.id})
        if conversation_doc:
            # Load existing conversation
            conversation = Conversation(**conversation_doc)
            target_conversation_id = conversation.id  # Ensure we use the validated ID
        else:
            # If conversation_id provided but not found/owned, treat as starting new
            target_conversation_id = None
    if not conversation:
        new_conv_id = str(uuid.uuid4())
        conversation = Conversation(
            id=new_conv_id,
            user_id=current_user.id,
            title=message.message[:30] + "..." if len(message.message) > 30 else message.message,
            messages=[],
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        target_conversation_id = new_conv_id

    user_message_id, assistant_message_id = str(uuid.uuid4()), str(uuid.uuid4())
    user_message_item = MessageItem(role="user", content=message.message, timestamp=datetime.now(), id=user_message_id)

    try:
        # Generate response using the specified provider and model
        response_text = await generate_response(message=message.message, provider=message.provider, model_id=message.model_id)

    except HTTPException as excp_err:
        # Log the error
        logger.error("Error calling AI API for user %s: %s", current_user.id, str(excp_err))
        # Return a user-friendly error message
        return {"response": f"Sorry, I encountered an error when you requested: {str(excp_err)}"}
    except Exception as e:
        # Log the error
        logger.error("Unexpected error for user %s: %s", current_user.id, e, exc_info=True)
        # Return a user-friendly error message
        return {"response": "Sorry, I encountered an unexpected error. Developer Team has been informed."}

    assistant_message_item = MessageItem(role="assistant", content=response_text, timestamp=datetime.now(), id=assistant_message_id)

    conversation.messages.append(user_message_item)
    conversation.messages.append(assistant_message_item)
    conversation.updated_at = datetime.now()
    await conversations_collection.replace_one({"id": conversation.id}, conversation.model_dump(mode="json"), upsert=True)

    logger.info("Chat message processed successfully. User: %s, Conv: %s", current_user.id, conversation.id)

    return ChatResponse(
        response=response_text, conversation_id=conversation.id, user_message_id=user_message_id, assistant_message_id=assistant_message_id
    )


@app.get("/users/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get the current authenticated user's profile"""
    return current_user


@app.get("/conversations", response_model=list[ConversationMetadata])
async def get_user_conversations_metadata(current_user: User = Depends(get_current_user)):
    """Get metadata (excluding messages) for all conversations owned by a user,
    sorted by last updated time.
    """
    # Define the projection to exclude messages
    projection = {"messages": 0, "_id": 0}  # Exclude MongoDB default _id too

    # Fix for async nature of find()
    find_cursor = conversations_collection.find({"user_id": current_user.id}, projection=projection)

    # Sort the cursor (this also returns a cursor)
    conversations_cursor = find_cursor.sort("updated_at", -1)
    # Convert to list
    conversations_metadata = await conversations_cursor.to_list(length=None)

    # Pydantic validation before returning
    return [ConversationMetadata(**conv) for conv in conversations_metadata]


@app.get("/conversations/{conversation_id}", response_model=Conversation)
async def get_full_conversation(conversation_id: str, current_user: User = Depends(get_current_user)):
    """Get the full content (including messages) for a specific conversation,
    checking for user ownership.
    """
    conversation_doc = await conversations_collection.find_one({"id": conversation_id})

    if not conversation_doc:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # --- Ownership Check ---
    if conversation_doc.get("user_id") != current_user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")
        # Using 404 for obscurity instead of 403
    conversation_doc.pop("_id", None)

    return Conversation(**conversation_doc)


@app.post("/conversations/{conversation_id}/branch", response_model=Conversation, status_code=201)
async def branch_conversation(conversation_id: str, branch_request: BranchRequest, current_user: User = Depends(get_current_user)):
    """Creates a new conversation branch from a specific message in the parent conversation."""
    # 1. Fetch Parent Conversation (Full Document)
    parent_doc = await conversations_collection.find_one({"id": conversation_id})
    if not parent_doc:
        raise HTTPException(status_code=404, detail="Parent conversation not found")

    # 2. Check Ownership
    if parent_doc.get("user_id") != current_user.id:
        raise HTTPException(status_code=404, detail="Parent conversation not found")

    parent_conversation = Conversation(**parent_doc)  # Validate parent data

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
    branch_messages = parent_conversation.messages[: branch_index + 1]

    branch_title = f"Branch from '{parent_conversation.title[:20]}...' @ msg {branch_index + 1}"  # Example title

    new_branch_conversation = Conversation(
        id=new_branch_id,
        user_id=current_user.id,  # Branch owned by the same user
        title=branch_title,
        messages=branch_messages,
        created_at=datetime.now(),
        updated_at=datetime.now(),  # Same as created_at initially
        parent_conversation_id=conversation_id,  # Link to parent
        branch_point_message_id=branch_message_id,  # Link to specific message
    )

    # 5. Insert New Branch into DB
    await conversations_collection.insert_one(new_branch_conversation.model_dump(mode="json"))

    logger.info("User %s created branch %s from conversation %s", current_user.id, new_branch_id, conversation_id)

    # 6. Return the full new branch conversation object
    return new_branch_conversation
