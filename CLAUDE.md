# ThreadFlow Development Guide

## Build Commands
- **Frontend**: `npm run dev` (with turbopack), `npm run build`, `npm run start`
- **Backend**: `poetry run uvicorn app.main:app --reload`
- **Docker**: `DOCKER_BUILDKIT=1 docker-compose up --build`

## Lint Commands
- **Frontend**: `npm run lint`
- **Backend**: `black .`, `isort .`, `flake8 .`, `pylint app`

## Test Commands
- **All tests**: `cd backend && pytest`
- **Single test**: `cd backend && pytest app/test_api.py::test_function_name`

## Code Style
- **Frontend**: TypeScript with strict mode, Next.js App Router, Tailwind CSS
- **Backend**: Python 3.10, FastAPI, Pydantic, MongoDB with Motor
- **TypeScript**: Use type annotations for all functions and variables
- **Python**: Follow Black formatting (line length 150), import sorting with isort
- **Error handling**: Use try/catch with specific error types in TypeScript, try/except in Python
- **Documentation**: Use JSDoc for TypeScript, docstrings for Python
- **Naming**: camelCase for TypeScript variables/functions, PascalCase for components/classes, snake_case for Python

## Architecture
- Frontend: Next.js 15.2.0 with React 19
- Backend: FastAPI with MongoDB
- Local development via Docker containers