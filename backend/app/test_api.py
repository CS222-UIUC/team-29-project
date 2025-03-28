"""
This module provides testing utility for the backend
Functions:
- test_root_status(): Test API status
- test_health(): Test API health
- test_chat_basic(): Baseline test for chatbot
- test_models_endpoint(): Test models listing endpoint
- test_chat_with_model_params(): Test chat with model parameters
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root_status():
    """Test API status"""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to ThreadFlow API"}


def test_health():
    """Test health"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_chat_basic():
    """Baseline test for chatbot"""
    response = client.post("/chat", json={"message": "Hi!"})
    assert response.status_code == 200
    assert "response" in response.json()


def test_models_endpoint():
    """Test models listing endpoint"""
    response = client.get("/models")
    assert response.status_code == 200
    data = response.json()

    # Check that the response contains the expected provider keys
    assert "google" in data
    assert "anthropic" in data
    assert "openai" in data

    # Check that each provider has the expected structure
    for provider in ["google", "anthropic", "openai"]:
        assert "available" in data[provider]
        assert "models" in data[provider]
        assert isinstance(data[provider]["models"], list)

        # Check model structure for non-empty model lists
        if data[provider]["models"]:
            model = data[provider]["models"][0]
            assert "id" in model
            assert "name" in model
            assert "description" in model


def test_chat_with_model_params():
    """Test chat with model parameters"""
    response = client.post("/chat", json={"message": "Hi!", "provider": "google", "model_id": "gemini-1.5-pro"})
    assert response.status_code == 200
    assert "response" in response.json()
