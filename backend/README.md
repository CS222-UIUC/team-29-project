# ThreadFlow Backend

## Overview
The backend API for ThreadFlow chat application built with FastAPI and MongoDB.

## Features
- Chat API endpoint for interacting with multiple LLM providers:
  - Google's Gemini (2.5 Pro Experimental, 2.0 Flash, 2.0 Flash Lite, 1.5 Pro) models
  - Anthropic's Claude models (Claude 3.7 Sonnet, Claude 3.5 Sonnet v2, Claude 3.5 Haiku)
  - OpenAI's GPT-4o model
- Model selection API endpoint
- Health check endpoint
- Comprehensive logging system:
  - Console output for real-time monitoring
  - Log file rotation to prevent excessive file sizes
  - Multiple log levels (DEBUG, INFO, WARNING, ERROR)
  - Structured log format with timestamps and source information

## Setup

### Environment Variables
Copy the `.env.example` file to `.env` and add your API keys:
```bash
# Database
MONGODB_URI=mongodb://mongo:27017/threadflow

# Model API Keys - Add at least one to enable chat functionality
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### Running with Docker
The preferred way to run the backend is with Docker Compose from the project root:
```bash
DOCKER_BUILDKIT=1 docker-compose up --build
```

### Local Development
For local development without Docker:
```bash
cd backend
poetry install
poetry run uvicorn app.main:app --reload
```

## API Endpoints

- `GET /` - Root endpoint
- `GET /health` - Health check
- `GET /models` - Get available AI models
- `POST /chat` - Send a chat message to an AI model
- `GET /debug/logs` - Get recent log entries (development only)

## Logging

The application uses a structured logging system with the following features:

- Log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
- Log format: timestamp, logger name, level, file:line, message
- Log location: `logs/threadflow.log`
- Log rotation: 10MB file size with 5 backup files
- Console output: INFO level and above
- File output: DEBUG level and above

To view logs in development:
- Check the console output for INFO level and above
- Examine the log file at `logs/threadflow.log`
- Use the debug endpoint: `GET /debug/logs?lines=100`
