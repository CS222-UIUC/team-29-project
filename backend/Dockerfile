FROM python:3.10-slim

WORKDIR /app

# Install Poetry
RUN pip install poetry

# Copy poetry configuration
COPY pyproject.toml poetry.lock* ./

# Configure poetry to not use a virtual environment
RUN poetry config virtualenvs.create false

# Install dependencies based on environment
ARG ENVIRONMENT=development
RUN if [ "$ENVIRONMENT" = "production" ] ; then poetry install --no-dev --no-root ; else poetry install --no-root ; fi

# Copy project files
COPY . .

# Choose whether to use --reload based on environment
CMD if [ "$ENVIRONMENT" = "production" ] ; then \
        uvicorn app.main:app --host 0.0.0.0 --port 8080 ; \
    else \
        uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload ; \
    fi