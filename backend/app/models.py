"""
Models module for handling interactions with different AI services
"""

import asyncio
from typing import Dict

import anthropic
import google.generativeai as genai
import openai
from fastapi import HTTPException

from app.config import (
    ANTHROPIC_API_KEY,
    DEFAULT_MODEL_ID,
    DEFAULT_MODEL_PROVIDER,
    GEMINI_API_KEY,
    MODEL_CONFIGS,
    OPENAI_API_KEY,
)

# Configure API clients
genai.configure(api_key=GEMINI_API_KEY)

# Model provider clients
_anthropic_client = None
_openai_client = None


def get_anthropic_client():
    """Get or create Anthropic client"""
    global _anthropic_client
    if _anthropic_client is None and ANTHROPIC_API_KEY:
        _anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    return _anthropic_client


def get_openai_client():
    """Get or create OpenAI client"""
    global _openai_client
    if _openai_client is None and OPENAI_API_KEY:
        _openai_client = openai.OpenAI(api_key=OPENAI_API_KEY)
    return _openai_client


async def generate_response(message: str, provider: str = DEFAULT_MODEL_PROVIDER, model_id: str = DEFAULT_MODEL_ID) -> str:
    """Generate a response using the specified model provider and model ID"""
    try:
        # Map of providers to their API keys
        provider_keys = {"google": GEMINI_API_KEY, "anthropic": ANTHROPIC_API_KEY, "openai": OPENAI_API_KEY}

        # Map of providers to their generator functions
        provider_functions = {"google": _generate_with_gemini, "anthropic": _generate_with_anthropic, "openai": _generate_with_openai}

        # Validate provider exists
        if provider not in MODEL_CONFIGS:
            raise HTTPException(status_code=400, detail=f"Invalid provider: {provider}")

        # Validate model exists for provider
        valid_models = [model["id"] for model in MODEL_CONFIGS[provider]]
        if model_id not in valid_models:
            raise HTTPException(status_code=400, detail=f"Invalid model ID for provider {provider}: {model_id}")

        # Check if any API keys are configured
        if not any(provider_keys.values()):
            return "No API keys are configured. Please set at least one API key in your environment variables or .env file."

        # Check if this provider's API key is configured
        if not provider_keys.get(provider):
            return f"{provider.capitalize()} API key is not configured. Please set {provider.upper()}_API_KEY."

        # Generate the response
        return await provider_functions[provider](message, model_id)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")


async def _generate_with_gemini(message: str, model_id: str) -> str:
    """Generate a response using Google's Gemini models"""
    try:
        if not GEMINI_API_KEY:
            return "Gemini API key not configured. Please set GEMINI_API_KEY in your environment variables."

        # Create model instance
        model = genai.GenerativeModel(model_id)

        # Run in executor to prevent blocking
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, lambda: model.generate_content(message))

        return response.text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error with Gemini API: {str(e)}")


async def _generate_with_anthropic(message: str, model_id: str) -> str:
    """Generate a response using Anthropic's Claude models"""
    try:
        client = get_anthropic_client()
        if not client:
            return "Anthropic API key not configured. Please set ANTHROPIC_API_KEY in your environment variables."

        # Run in executor to prevent blocking
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None, lambda: client.messages.create(model=model_id, max_tokens=1024, messages=[{"role": "user", "content": message}])
        )

        return response.content[0].text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error with Anthropic API: {str(e)}")


async def _generate_with_openai(message: str, model_id: str) -> str:
    """Generate a response using OpenAI's GPT models"""
    try:
        client = get_openai_client()
        if not client:
            return "OpenAI API key not configured. Please set OPENAI_API_KEY in your environment variables."

        # Run in executor to prevent blocking
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None, lambda: client.chat.completions.create(model=model_id, messages=[{"role": "user", "content": message}], max_tokens=1024)
        )

        return response.choices[0].message.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error with OpenAI API: {str(e)}")


def get_available_models() -> Dict:
    """Get all available models with their configuration and availability status"""
    available_models = {
        "google": {"available": bool(GEMINI_API_KEY), "models": MODEL_CONFIGS["google"]},
        "anthropic": {"available": bool(ANTHROPIC_API_KEY), "models": MODEL_CONFIGS["anthropic"]},
        "openai": {"available": bool(OPENAI_API_KEY), "models": MODEL_CONFIGS["openai"]},
    }

    return available_models
