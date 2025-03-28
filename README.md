# ThreadFlow - Multi-Model Chat Application

ThreadFlow is a modern chat application that supports multiple AI models from different providers, giving users choice and flexibility in their AI interactions.

## One-Time Setup

1. **Install prerequisites**
   - Docker & Docker Compose
   - Node.js 20.x
   - Python 3.10
   - Git

2. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/ThreadFlow.git
   cd ThreadFlow
3. Set up environment variables
Create a .env file in the project root:
```bash
# Required
JWT_SECRET=dev_secret_key
MONGODB_URI=mongodb+srv://<db_username>:<db_password>@threadflow.fazim.mongodb.net/?retryWrites=true&w=majority&appName=ThreadFlow

# AI Model API Keys (at least one is needed)
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

> Note: You need at least one valid API key to use the chat functionality. The system will only show models from providers with valid API keys.


## Development Workflow

1. **Start the local environment and build**
   ```bash
   DOCKER_BUILDKIT=1 docker-compose down
   DOCKER_BUILDKIT=1 docker-compose up --build
   ```

2. **Access the applications**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

3. **Supported AI Models**
   - Google's Gemini models (2.5 Pro Experimental, 2.0 Flash, 2.0 Flash Lite, 1.5 Pro)
   - Anthropic's Claude models (Claude 3.7 Sonnet, Claude 3.5 Sonnet v2, Claude 3.5 Haiku)
   - OpenAI's GPT models (GPT-4o)

3. **Making changes**
   - Frontend code is in the `frontend/` directory
   - Backend code is in the `backend/` directory
   - Changes will hot-reload in development

## Branch Strategy

- `main`: Production code, no direct push allowed, only pull requests
- Feature branches: Create from main, name as `feature/your-feature-name`

## CI/CD Information

- GitHub Actions automatically test and build Docker images
- Tests run for both frontend and backend
- Current setup validates code but doesn't deploy yet


## Infrastructure Overview

1. **Google Cloud Project**: `threadflow-app`
   - Enabled APIs: Cloud Run, Cloud Build, Secret Manager (update this along the way)
   - Artifact Registry: `threadflow-repo` in `us-central1`
   - Secrets: `mongodb-uri` and `jwt-secret` (already stored)

2. **GitHub CI/CD**:
   - Docker image build workflow
   - Frontend Node.js testing
   - Backend Python testing

3. **Future Deployment Path**:
   1. Build Docker images (already happens via GitHub Actions)
   2. Push to Google Artifact Registry (later)
   3. Deploy to Cloud Run (later)

## Steps for Development

1. Authenticate to Google Cloud:
   ```bash
   gcloud auth login
   gcloud config set project threadflow-app
   ```