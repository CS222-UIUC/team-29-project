"""
This module provides utility for the backend
This encases the main function for the backend
"""

import asyncio
import os

import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Load environment variables
load_dotenv()

# Get API key from environment variable
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print(
        "Warning: GEMINI_API_KEY not found in environment variables. API calls will fail."
    )

# Configure the Gemini API
genai.configure(api_key=GEMINI_API_KEY)

# Initialize the model
model = genai.GenerativeModel("gemini-1.5-pro")

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


@app.get("/")
async def root():
    """Returns a message referencing the API"""
    return {"message": "Welcome to ThreadFlow API"}


@app.get("/health")
async def health_check():
    """Returns a message referencing the health of the API"""
    return {"status": "healthy"}


@app.post("/chat")
async def chat(message: ChatMessage):
    """Asynchronous method for the chat interface"""
    try:
        # Check if API key is configured
        if not GEMINI_API_KEY:
            return {
                "response": """API key not configured.
                 Please set GEMINI_API_KEY in your environment variables."""
            }
        # Wrap the synchronous API call in an executor to prevent blocking
        # The Google GenerativeAI library is synchronous, so we need to run it in a thread pool
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None, lambda: model.generate_content(message.message)
        )
        # Extract the text from the response
        response_text = response.text
        return {"response": response_text}
    except HTTPException as excp_err:
        # Log the error
        print(f"Error calling Gemini API: {str(excp_err)}")
        # Return a user-friendly error message
        return {
            "response": f"""Sorry, I encountered an error while
              processing your request: {str(excp_err)}"""
        }
