# ThreadFlow Backend

## 🌟 Overview
The brain behind ThreadFlow - a powerful API built with FastAPI and MongoDB that connects you to the best AI models.

## ✨ What it does
- **Chat with any AI model** through a unified API:
  - Google's Gemini (2.5 Pro Experimental, 2.0 Flash, 2.0 Flash Lite, 1.5 Pro)
  - Anthropic's Claude (3.7 Sonnet, 3.5 Sonnet v2, 3.5 Haiku)
  - OpenAI's GPT-4o
- **Model discovery** to find available models
- **Health monitoring** to make sure everything's running
- **Detailed logging** to help troubleshoot issues:
  - Console output so you can see what's happening
  - Log rotation to keep things tidy
  - Multiple log levels for different needs
  - Structured logs with timestamps and context

## 🏗️ Technical Architecture

ThreadFlow's backend is built with scalability, security, and developer experience in mind:

### Core Components
- **FastAPI Framework**: High-performance async API with automatic OpenAPI documentation
- **MongoDB Database**: Flexible document storage for conversations and user data
- **Pydantic Models**: Strict type validation for all data models
- **JWT Authentication**: Secure token-based authentication system

### Key Technical Features
- **AI Provider Abstraction**: Unified interface to multiple AI model providers
- **Comprehensive Logging**: Structured logging with rotation and multiple output destinations
- **Environment-based Configuration**: Different settings for development and production
- **Containerized Deployment**: Docker-ready for consistent environments

## 🚀 Installation and Setup

### Prerequisites
- Python 3.10+
- Poetry (dependency management)
- MongoDB (or Docker for containerized setup)

### Environment variables
Create a `.env` file with your API keys:
```bash
# Database connection
MONGODB_URI=mongodb://mongo:27017/threadflow

# Security
JWT_SECRET=your_secret_key_here

# At least one model key is needed
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### Running with Docker
The easiest way to run everything:
```bash
DOCKER_BUILDKIT=1 docker-compose up --build
```

### Local development
If you prefer working directly on your machine:
```bash
cd backend
poetry install
poetry run uvicorn app.main:app --reload
```

## 🛣️ API endpoints

- `GET /` - Welcome page
- `GET /health` - Check if the service is running
- `GET /models` - See which AI models are available
- `POST /chat` - Send a message to an AI model
- `GET /debug/logs` - View recent logs (development only)

## 📊 Logging system

Our logging system helps you see what's happening:

- **Log levels**: DEBUG, INFO, WARNING, ERROR, CRITICAL
- **Log format**: timestamp, source, level, file:line, message
- **Log location**: `logs/threadflow.log`
- **Log rotation**: 10MB files with 5 backups
- **Console**: INFO level and above
- **File**: DEBUG level and above

To check logs during development:
- Look at your terminal for INFO and above
- Open `logs/threadflow.log` for everything
- Visit `GET /debug/logs?lines=100` in your browser

## 🧪 Testing

We have comprehensive tests to ensure API reliability:

- **Unit Tests**: Testing individual functions and classes
- **API Tests**: Testing endpoints with test client
- **Integration Tests**: Testing with dependencies
- **Security Tests**: Verifying authentication and authorization

Run tests with:
```bash
poetry run pytest
```

## 🔒 Security Features

- JWT token authentication with expiration
- Password hashing with bcrypt
- Rate limiting on sensitive endpoints
- Input validation with Pydantic
- Secure handling of API keys
