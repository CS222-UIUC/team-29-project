"""
This module provides testing utility for the backend
Functions:
- test_root_status(): Test API status
- test_health(): #Test API health
- test_chat_basic(): Baseline test for chatbot
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
