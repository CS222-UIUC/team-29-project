"""
This module provides utility functions for the backend API.

It encapsulates the main functionality for the backend service including
the FastAPI application setup, routes, and chat interface.
"""

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.config import DEFAULT_MODEL_ID, DEFAULT_MODEL_PROVIDER
from app.models import generate_response, get_available_models

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
    """Represents a chat message with model configuration.

    Attributes:
        message: The content of the chat message.
        provider: The AI provider to use (default from config).
        model_id: The specific model ID to use (default from config).
    """

    message: str
    provider: str = DEFAULT_MODEL_PROVIDER
    model_id: str = DEFAULT_MODEL_ID

    @property
    def get_message(self):
        return self.message

    @property
    def get_provider(self):
        return self.provider


@app.get("/")
async def root() -> dict:
    """Return a welcome message for the API.

    Returns:
        A dictionary with a welcome message.
    """
    return {"message": "Welcome to ThreadFlow API"}


@app.get("/health")
async def health_check() -> dict:
    """Check the health status of the API.

    Returns:
        A dictionary indicating the API health status.
    """
    return {"status": "healthy"}


@app.get("/models")
async def models() -> dict:
    """Get available models and their configurations.

    Returns:
        A dictionary of available models and their status.
    """
    return get_available_models()


@app.post("/chat")
async def chat(message: ChatMessage) -> dict:
    """Handle chat requests and generate AI responses.

    Args:
        message: The chat message containing text and model configuration.

    Returns:
        A dictionary containing either the AI response or an error message.

    Raises:
        HTTPException: If there's an error processing the request.
    """
    try:
        # Generate response using the specified provider and model
        response_text = await generate_response(
            message=message.message,
            provider=message.provider,
            model_id=message.model_id
        )
        return {"response": response_text}
    except HTTPException as excp_err:
        # Log the error
        print(f"Error calling AI API: {str(excp_err)}")
        # Return a user-friendly error message
        return {
            "response": (
                "Sorry, I encountered an error while processing your request: "
                f"{str(excp_err)}"
            )
        }
