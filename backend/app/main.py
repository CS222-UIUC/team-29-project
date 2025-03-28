from fastapi import FastAPI, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import os
from dotenv import load_dotenv
import asyncio
from datetime import datetime
import uuid
from typing import List, Optional
from .models import Thread, Message

# Load environment variables
load_dotenv()

# Get API key from environment variable
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("Warning: GEMINI_API_KEY not found in environment variables. API calls will fail.")

# Configure the Gemini API
genai.configure(api_key=GEMINI_API_KEY)

# Initialize the model
model = genai.GenerativeModel('gemini-1.5-pro')

app = FastAPI(title="ThreadFlow API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for threads (replace with database in production)
threads = {}

class ChatMessage(BaseModel):
    message: str
    thread_id: Optional[str] = None

@app.get("/")
async def root():
    return {"message": "Welcome to ThreadFlow API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/threads")
async def create_thread():
    thread_id = str(uuid.uuid4())
    thread = Thread(
        id=thread_id,
        messages=[],
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    threads[thread_id] = thread
    return thread

@app.get("/threads/{thread_id}")
async def get_thread(thread_id: str):
    if thread_id not in threads:
        raise HTTPException(status_code=404, detail="Thread not found")
    return threads[thread_id]

@app.post("/threads/{thread_id}/branch")
async def branch_thread(thread_id: str, message_id: str):
    if thread_id not in threads:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    source_thread = threads[thread_id]
    new_thread_id = str(uuid.uuid4())
    
    # Find the index of the message to branch from
    message_index = next((i for i, msg in enumerate(source_thread.messages) if msg.id == message_id), None)
    if message_index is None:
        raise HTTPException(status_code=404, detail="Message not found in thread")
    
    # Create new thread with messages up to the selected message
    new_thread = Thread(
        id=new_thread_id,
        messages=source_thread.messages[:message_index + 1],
        parent_thread_id=thread_id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    threads[new_thread_id] = new_thread
    return new_thread

@app.post("/chat")
async def chat(message: ChatMessage):
    try:
        # Check if API key is configured
        if not GEMINI_API_KEY:
            return {
                "response": "API key not configured. Please set GEMINI_API_KEY in your environment variables."
            }
        
        # Get or create thread
        thread_id = message.thread_id
        if not thread_id or thread_id not in threads:
            thread = await create_thread()
            thread_id = thread.id
        
        thread = threads[thread_id]
        
        # Add user message to thread
        user_message = Message(
            id=str(uuid.uuid4()),
            content=message.message,
            role="user",
            timestamp=datetime.utcnow()
        )
        thread.messages.append(user_message)
        
        # Prepare context from previous messages
        context = "\n".join([f"{msg.role}: {msg.content}" for msg in thread.messages])
        
        # Get response from Gemini
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None, 
            lambda: model.generate_content(context)
        )
        
        # Add assistant response to thread
        assistant_message = Message(
            id=str(uuid.uuid4()),
            content=response.text,
            role="assistant",
            timestamp=datetime.utcnow()
        )
        thread.messages.append(assistant_message)
        thread.updated_at = datetime.utcnow()
        
        return {
            "thread_id": thread_id,
            "message_id": user_message.id,
            "response_id": assistant_message.id,
            "response": response.text
        }
    except Exception as e:
        print(f"Error calling Gemini API: {str(e)}")
        return {
            "response": f"Sorry, I encountered an error while processing your request: {str(e)}"
        }