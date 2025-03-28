"""
Models module for handling interactions with different AI services.
"""

import asyncio
from typing import Dict, Optional

import anthropic
import google.generativeai as genai
import openai
from fastapi import HTTPException

from app.config import (ANTHROPIC_API_KEY, DEFAULT_MODEL_ID,
                        DEFAULT_MODEL_PROVIDER, GEMINI_API_KEY, MODEL_CONFIGS,
                        OPENAI_API_KEY)

# Configure API clients
genai.configure(api_key=GEMINI_API_KEY)

# Model provider clients
_ANTHROPIC_CLIENT = None
_OPENAI_CLIENT = None


def get_anthropic_client() -> Optional[anthropic.Anthropic]:
    """Get or create Anthropic client."""
    global _ANTHROPIC_CLIENT  # pylint: disable=global-statement
    if _ANTHROPIC_CLIENT is None and ANTHROPIC_API_KEY:
        _ANTHROPIC_CLIENT = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    return _ANTHROPIC_CLIENT


def get_openai_client() -> Optional[openai.OpenAI]:
    """Get or create OpenAI client."""
    global _OPENAI_CLIENT  # pylint: disable=global-statement
    if _OPENAI_CLIENT is None and OPENAI_API_KEY:
        _OPENAI_CLIENT = openai.OpenAI(api_key=OPENAI_API_KEY)
    return _OPENAI_CLIENT


async def generate_response(
    message: str,
    provider: str = DEFAULT_MODEL_PROVIDER,
    model_id: str = DEFAULT_MODEL_ID,
) -> str:
    """
    Generate a response using the specified model provider and model ID.

    Args:
        message: The input message to generate a response for.
        provider: The AI provider to use (google, anthropic, openai).
        model_id: The specific model ID to use.

    Returns:
        The generated response as a string.

    Raises:
        HTTPException: If there's an error with the request or API call.
    """
    try:
        # Map of providers to their API keys
        provider_keys = {
            "google": GEMINI_API_KEY,
            "anthropic": ANTHROPIC_API_KEY,
            "openai": OPENAI_API_KEY,
        }

        # Map of providers to their generator functions
        provider_functions = {
            "google": _generate_with_gemini,
            "anthropic": _generate_with_anthropic,
            "openai": _generate_with_openai,
        }

        # Validate provider exists
        if provider not in MODEL_CONFIGS:
            raise HTTPException(status_code=400, detail=f"Invalid provider: {provider}")

        # Validate model exists for provider
        valid_models = [model["id"] for model in MODEL_CONFIGS[provider]]
        if model_id not in valid_models:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid model ID for provider {provider}: {model_id}",
            )

        # Check if any API keys are configured
        if not any(provider_keys.values()):
            return (
                "No API keys are configured. "
                "Please set at least one API key in your environment variables or .env file."
            )

        # Check if this provider's API key is configured
        if not provider_keys.get(provider):
            return (
                f"{provider.capitalize()} API key not set. "
                f"Set {provider.upper()}_API_KEY."
            )

        # Generate the response
        return await provider_functions[provider](message, model_id)

    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Error generating response: {str(exc)}"
        ) from exc


async def _generate_with_gemini(message: str, model_id: str) -> str:
    """
    Generate a response using Google's Gemini models.

    Args:
        message: The input message.
        model_id: The model ID to use.

    Returns:
        The generated response.

    Raises:
        HTTPException: If there's an error with the Gemini API.
    """
    try:
        if not GEMINI_API_KEY:
            return (
                "Gemini API key not set. "
                "Please set GEMINI_API_KEY in environment variables"
            )

        # Create model instance
        model = genai.GenerativeModel(model_id)

        # Run in executor to prevent blocking
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None, lambda: model.generate_content(message)
        )

        return response.text
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Error with Gemini API: {str(exc)}"
        ) from exc


async def _generate_with_anthropic(message: str, model_id: str) -> str:
    """
    Generate a response using Anthropic's Claude models.

    Args:
        message: The input message.
        model_id: The model ID to use.

    Returns:
        The generated response.

    Raises:
        HTTPException: If there's an error with the Anthropic API.
    """
    try:
        client = get_anthropic_client()
        if not client:
            return (
                "Claude API key not set. "
                "Please set ANTHROPIC_API_KEY in environment variables"
            )

        # Run in executor to prevent blocking
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: client.messages.create(
                model=model_id,
                max_tokens=1024,
                messages=[{"role": "user", "content": message}],
            ),
        )

        return response.content[0].text
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Error with Anthropic API: {str(exc)}"
        ) from exc


async def _generate_with_openai(message: str, model_id: str) -> str:
    """
    Generate a response using OpenAI's GPT models.

    Args:
        message: The input message.
        model_id: The model ID to use.

    Returns:
        The generated response.

    Raises:
        HTTPException: If there's an error with the OpenAI API.
    """
    try:
        client = get_openai_client()
        if not client:
            return (
                "OpenAI API key not configured. "
                "Please set OPENAI_API_KEY in your environment variables."
            )

        # Run in executor to prevent blocking
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: client.chat.completions.create(
                model=model_id,
                messages=[{"role": "user", "content": message}],
                max_tokens=1024,
            ),
        )

        return response.choices[0].message.content
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Error with OpenAI API: {str(exc)}"
        ) from exc


def get_available_models() -> Dict:
    """
    Get all available models with their configuration and availability status.

    Returns:
        A dictionary containing available models and their status.
    """
    available_models = {
        "google": {
            "available": bool(GEMINI_API_KEY),
            "models": MODEL_CONFIGS["google"],
        },
        "anthropic": {
            "available": bool(ANTHROPIC_API_KEY),
            "models": MODEL_CONFIGS["anthropic"],
        },
        "openai": {
            "available": bool(OPENAI_API_KEY),
            "models": MODEL_CONFIGS["openai"],
        },
    }

    return available_models
