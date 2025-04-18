"""Models module for handling interactions with different AI services"""

import asyncio
import uuid
from datetime import datetime

import anthropic
import google.generativeai as genai
import motor.motor_asyncio
import openai
from fastapi import HTTPException
from pydantic import BaseModel, Field

from app.config import (  # noqa: E501
    ANTHROPIC_API_KEY,
    DEFAULT_MODEL_ID,
    DEFAULT_MODEL_PROVIDER,
    GEMINI_API_KEY,
    MODEL_CONFIGS,
    MONGODB_URI,
    OPENAI_API_KEY,
)

# Configure API clients
genai.configure(api_key=GEMINI_API_KEY)

# MongoDB client
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URI)
db = client.threadflow
users_collection = db.users
conversations_collection = db.conversations

# Model provider clients
_ANTHROPIC_CLIENT = None
_OPENAI_CLIENT = None

# Message format within conversation.messages (for reference)
# {
#    "id": str,  # Unique UUID for the message
#    "role": str,  # "user" or "assistant"
#    "content": str,  # Message content
#    "timestamp": datetime  # When the message was created
# }



class MessageItem(BaseModel):
    """Model for individual messages in conversations"""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: str
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)

# User models
class User(BaseModel):
    """User model for storing user information"""

    id: str
    name: str | None = None
    email: str | None = None
    image: str | None = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class Conversation(BaseModel):
    """Conversation model for storing chat history"""

    id: str
    user_id: str
    title: str

    messages: list[MessageItem] = []
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    parent_conversation_id: str | None = None
    branch_point_message_id: str | None = None



def get_anthropic_client():
    """Get or create Anthropic client"""
    global _ANTHROPIC_CLIENT  # noqa: PLW0603
    if _ANTHROPIC_CLIENT is None and ANTHROPIC_API_KEY:
        _ANTHROPIC_CLIENT = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    return _ANTHROPIC_CLIENT


def get_openai_client():
    """Get or create OpenAI client"""
    global _OPENAI_CLIENT  # noqa: PLW0603
    if _OPENAI_CLIENT is None and OPENAI_API_KEY:
        _OPENAI_CLIENT = openai.OpenAI(api_key=OPENAI_API_KEY)
    return _OPENAI_CLIENT


async def generate_response(message: str, provider: str = DEFAULT_MODEL_PROVIDER, model_id: str = DEFAULT_MODEL_ID) -> str:
    """Generate a response using the specified model provider and model ID"""
    try:
        # Map of providers to their API keys
        provider_keys = {"google": GEMINI_API_KEY, "anthropic": ANTHROPIC_API_KEY, "openai": OPENAI_API_KEY}

        # Map of providers to their generator functions
        provider_functions = {"google": _gen_w_gemini, "anthropic": _gen_w_anthropic, "openai": _gen_w_openai}

        # Validate provider exists
        if provider not in MODEL_CONFIGS:
            raise HTTPException(status_code=400, detail=f"Invalid provider: {provider}")

        # Validate model exists for provider
        valid_models = [model["id"] for model in MODEL_CONFIGS[provider]]
        if model_id not in valid_models:
            raise HTTPException(status_code=400, detail=f"Invalid model ID for provider {provider}: {model_id}")

        # Check if any API keys are configured
        if not any(provider_keys.values()):
            return "No API key found. Set 1 API key in your environment variables or .env file."

        # Check if this provider's API key is configured
        if not provider_keys.get(provider):
            return f"{provider.capitalize()} API key not found. Set {provider.upper()}_API_KEY."

        # Generate the response
        return await provider_functions[provider](message, model_id)

    except Exception as e:  # noqa: E722, BLE001, N818
        raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")  # noqa: B904


async def _gen_w_gemini(message: str, model_id: str) -> str:
    """Generate a response using Google's Gemini models"""
    try:
        if not GEMINI_API_KEY:
            return "Gemini API key not found. Set GEMINI_API_KEY in your environment variables."

        # Create model instance
        model = genai.GenerativeModel(model_id)

        # Run in executor to prevent blocking
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, lambda: model.generate_content(message))

        return response.text
    except Exception as e:  # noqa: E722, BLE001, N818
        raise HTTPException(status_code=500, detail=f"Error with Gemini API: {str(e)}")  # noqa: B904


async def _gen_w_anthropic(message: str, model_id: str) -> str:
    """Generate a response using Anthropic's Claude models"""
    try:
        anthropic_client = get_anthropic_client()
        if not anthropic_client:
            return "Anthropic API key not found. Set ANTHROPIC_API_KEY in your env variables"

        # Run in executor to prevent blocking
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: anthropic_client.messages.create(model=model_id, max_tokens=1024, messages=[{"role": "user", "content": message}]),  # noqa: E501
        )

        return response.content[0].text
    except Exception as e:  # noqa: E722, BLE001, N818
        raise HTTPException(status_code=500, detail=f"Error with Anthropic API: {str(e)}")  # noqa: B904


async def _gen_w_openai(message: str, model_id: str) -> str:
    """Generate a response using OpenAI's GPT models"""
    try:
        openai_client = get_openai_client()
        if not openai_client:
            return "OpenAI API key not found. Set OPENAI_API_KEY in your environment variables."

        # Run in executor to prevent blocking
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: openai_client.chat.completions.create(model=model_id, messages=[{"role": "user", "content": message}], max_tokens=1024),  # noqa: E501
        )

        return response.choices[0].message.content
    except Exception as e:  # noqa: E722, BLE001, N818
        raise HTTPException(status_code=500, detail=f"Error with OpenAI API: {str(e)}")  # noqa: B904


def get_available_models() -> dict:
    """Get all available models with their configuration and availability status"""
    available_models = {
        "google": {"available": bool(GEMINI_API_KEY), "models": MODEL_CONFIGS["google"]},
        "anthropic": {"available": bool(ANTHROPIC_API_KEY), "models": MODEL_CONFIGS["anthropic"]},
        "openai": {"available": bool(OPENAI_API_KEY), "models": MODEL_CONFIGS["openai"]},
    }

    return available_models
