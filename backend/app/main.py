"""
This module provides utility for the backend
This encases the main function for the backend
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
    """
    This class provides utility for the chatbot message
    Input: BaseModel - AI model to be used for the interface
    """

    message: str
    provider: str = DEFAULT_MODEL_PROVIDER
    model_id: str = DEFAULT_MODEL_ID


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
        return {"response": f"Sorry, I encountered an error while processing your request: {str(excp_err)}"}
