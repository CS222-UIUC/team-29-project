"""Production-safe tests for the ThreadFlow API.
These tests are safe to run in production as they do not modify data.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app

# Mark all tests in this module as prod-safe
pytestmark = pytest.mark.prod_safe

# Create test client
client = TestClient(app)


def test_health_check():
    """Test the health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_root_endpoint():
    """Test the root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()


def test_models_endpoint():
    """Test that models endpoint returns data in the correct format"""
    response = client.get("/models")
    assert response.status_code == 200
    data = response.json()

    # Check structure without validating actual model availability
    assert "google" in data
    assert "anthropic" in data
    assert "openai" in data

    # Check structure of a provider
    for provider in ["google", "anthropic", "openai"]:
        assert "available" in data[provider]
        assert "models" in data[provider]
