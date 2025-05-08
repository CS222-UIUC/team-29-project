# ThreadFlow

ThreadFlow is a friendly chat application that connects you with the best AI models from Google, Anthropic, and OpenAI - all in one place. Switch between models seamlessly to find the perfect AI for your needs.

![ThreadFlow](https://via.placeholder.com/800x400?text=ThreadFlow+Screenshot)

## 📝 Project Introduction

ThreadFlow is a unified chat interface for interacting with multiple AI models. Our project addresses the challenge of having to switch between different applications to access various AI models by bringing them all into one streamlined platform.

With ThreadFlow, users can:
- Seamlessly switch between models from Google, Anthropic, and OpenAI
- Maintain conversation history across model switches
- Experience a clean, intuitive interface designed for productive AI interactions

Our goal was to create a practical, user-friendly application that demonstrates effective API integration, secure authentication, and modern web development practices.

## ✨ What can ThreadFlow do?

- **Talk to multiple AI models** from different companies:
  - Google's Gemini (2.5 Pro Experimental, 2.0 Flash, 2.0 Flash Lite, 1.5 Pro)
  - Anthropic's Claude (3.7 Sonnet, 3.5 Sonnet v2, 3.5 Haiku)
  - OpenAI's GPT-4o
- **Smart interface** that only shows models you have access to
- **Modern design** built with Next.js 15 and React 19
- **Secure conversations** with proper authentication
- **Reliable storage** using MongoDB

## 🏗️ Technical Architecture

ThreadFlow uses a modern full-stack architecture:

### Frontend (Next.js + React)
- **Framework**: Next.js 15 with React 19 for a responsive single-page application
- **Authentication**: NextAuth.js with JWT for secure user sessions
- **Styling**: Tailwind CSS for a clean, consistent UI
- **State Management**: React Context API for application state
- **Testing**: Jest and React Testing Library for component and integration tests

### Backend (FastAPI + MongoDB)
- **API Framework**: FastAPI for high-performance endpoints with automatic documentation
- **Database**: MongoDB for flexible document storage of conversations and user data
- **Authentication**: JWT-based token system with secure password hashing
- **AI Integration**: Unified API clients for Google, Anthropic, and OpenAI services
- **Logging**: Comprehensive logging system with rotation and different log levels

### DevOps
- **Containerization**: Docker and Docker Compose for consistent environments
- **CI/CD**: GitHub Actions for automated testing and deployment
- **Cloud Infrastructure**: Google Cloud Run for scalable containerized applications
- **Secrets Management**: Secure handling of API keys and credentials

## 🚀 Installation Guide

### Prerequisites
- Docker & Docker Compose (easiest way to run everything)
- Node.js 20.x (if you want to work on just the frontend)
- Python 3.10 (if you want to work on just the backend)
- Git

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/ThreadFlow.git
cd ThreadFlow
```

### Step 2: Set Up Environment Variables
Create a `.env` file in the root directory:
```
# Required basics
JWT_SECRET=pick_a_random_secret_key
MONGODB_URI=mongodb://mongo:27017/threadflow

# Add at least one AI model key
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```
> 💡 You need at least one valid AI key or the chat won't work!

### Step 3: Start the Application
Using Docker (recommended):
```bash
DOCKER_BUILDKIT=1 docker-compose up --build
```

The application will be available at:
- Web app: http://localhost:3000
- API documentation: http://localhost:8000/docs

### For Frontend-Only Development
```bash
cd frontend
npm install
npm run dev
```

### For Backend-Only Development
```bash
cd backend
poetry install
poetry run uvicorn app.main:app --reload
```

## 👥 Team Members and Contributions

### Vedaant
**Role**: Backend Developer
- Implemented FastAPI endpoints for chat functionality
- Designed and implemented MongoDB schemas
- Created unified AI model integration system
- Set up Docker configuration for backend services

### Aditya
**Role**: Backend Developer
- Developed authentication and security systems
- Created comprehensive logging infrastructure
- Implemented health monitoring endpoints
- Wrote backend tests and documentation

### Shubhankar
**Role**: Frontend Developer
- Built the chat interface components
- Implemented responsive design with Tailwind
- Created frontend authentication flows
- Developed error handling and notifications

### Dhruv
**Role**: Frontend Developer
- Implemented AI model switching functionality
- Created conversation history components
- Built frontend API client services
- Set up frontend testing infrastructure

### Collaborative Work
- GitHub repository setup and organization
- Integration between frontend and backend systems
- Docker Compose configuration
- Documentation and README files

## 📊 Watching what happens

ThreadFlow has a great logging system that helps you see what's going on:

- Real-time console output
- Log files that don't get too big
- Different log levels (DEBUG, INFO, WARNING, ERROR)
- Detailed logs with timestamps

How to check logs:
- Look at the console output
- Check `logs/threadflow.log`
- Visit `GET /debug/logs?lines=100` in development

## 📝 Testing your changes

We have tests to make sure everything works right:

- Backend tests: `backend/app/test_*.py`
- Frontend tests: `frontend/src/__tests__/`

Run them locally:
- Frontend: `cd frontend && npm test`
- Backend: `cd backend && poetry run pytest`

## 🔄 How we manage code

- `main`: Production-ready code (protected - use pull requests only)
- For new features: Create branches named `feature/your-feature-name`

## 📚 Helpful resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [MongoDB Documentation](https://docs.mongodb.com/)

## 🤝 Want to help?

We welcome contributions! Check out our [contributing guidelines](CONTRIBUTING.md).

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
