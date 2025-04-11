FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install --no-cache-dir poetry --upgrade

# Copy poetry configuration
COPY pyproject.toml ./

# Configure poetry to not use a virtual environment
RUN poetry config virtualenvs.create false

# Generate a fresh lock file and install dependencies
RUN poetry lock && poetry install --no-interaction --no-ansi --no-root -vvv

# Copy project files
COPY . .

# Create logs directory
RUN mkdir -p /app/logs

# Run the application
CMD uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload