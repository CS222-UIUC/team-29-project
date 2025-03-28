"""Configuration module for handling secrets and model configurations."""

import os
from typing import Dict, List

from google.cloud import secretmanager


def get_secret(secret_id: str, default_value: str = "") -> str:
    """Get a secret from Secret Manager or use default/env value.

    Args:
        secret_id: The ID of the secret to retrieve.
        default_value: Default value to return if secret not found.

    Returns:
        The secret value from either Secret Manager or environment variables.

    Note:
        In Cloud Run environment, tries Secret Manager first, falls back to env vars.
        In development, uses environment variables directly.
    """
    # Check if we're running on Cloud Run
    if os.environ.get("K_SERVICE"):
        try:
            project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "threadflow-app")
            client = secretmanager.SecretManagerServiceClient()
            name = f"projects/{project_id}/secrets/{secret_id}/versions/latest"
            response = client.access_secret_version(request={"name": name})
            return response.payload.data.decode("UTF-8")
        except Exception as exc:  # pylint: disable=broad-except
            print(f"Error accessing secret {secret_id}: {exc}")
            # Fall back to environment variable
            return os.environ.get(secret_id.replace("-", "_").upper(), default_value)
    # In development, use environment variables
    return os.environ.get(secret_id.replace("-", "_").upper(), default_value)


# Application settings
MONGODB_URI = get_secret("mongodb-uri", "mongodb://mongo:27017/threadflow")
JWT_SECRET = get_secret("jwt-secret", "dev_secret_key")

# API keys for different model providers
GEMINI_API_KEY = get_secret("gemini-api-key", "")
OPENAI_API_KEY = get_secret("openai-api-key", "")
ANTHROPIC_API_KEY = get_secret("anthropic-api-key", "")

# Model configurations
MODEL_CONFIGS: Dict[str, List[Dict[str, str]]] = {
    "google": [
        {
            "id": "gemini-2.5-pro-exp-03-25",
            "name": "Gemini 2.5 Pro Experimental",
            "description": "Latest experimental Gemini model with advanced capabilities",
        },
        {
            "id": "gemini-2.0-flash",
            "name": "Gemini 2.0 Flash",
            "description": "Fast, efficient model with strong performance",
        },
        {
            "id": "gemini-2.0-flash-lite",
            "name": "Gemini 2.0 Flash Lite",
            "description": "Lightweight model optimized for speed and efficiency",
        },
        {
            "id": "gemini-1.5-pro",
            "name": "Gemini 1.5 Pro",
            "description": "Reliable model for complex tasks",
        },
    ],
    "anthropic": [
        {
            "id": "claude-3-7-sonnet-20250219",
            "name": "Claude 3.7 Sonnet",
            "description": "Latest and most capable Claude Sonnet model",
        },
        {
            "id": "claude-3-5-sonnet-20241022",
            "name": "Claude 3.5 Sonnet v2",
            "description": "Balanced performance and cost Sonnet model",
        },
        {
            "id": "claude-3-5-haiku-20241022",
            "name": "Claude 3.5 Haiku",
            "description": "Fast, efficient responses with Haiku model",
        },
    ],
    "openai": [
        {
            "id": "gpt-4o",
            "name": "GPT-4o",
            "description": "OpenAI's latest multimodal model with optimal performance",
        },
    ],
}

# Default model to use if none specified
DEFAULT_MODEL_PROVIDER = "google"
DEFAULT_MODEL_ID = "gemini-2.5-pro-exp-03-25"
