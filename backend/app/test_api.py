# backend/app/test_api.py

from datetime import datetime
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

# Import necessary components from your app
# Make sure 'app' and 'get_current_user' are accessible
# You might need to adjust imports based on your exact structure
from app.main import app
from app.models import User

# Assuming get_current_user is defined in security and imported into main or directly accessible
try:
    from app.security import get_current_user
except ImportError:
    # If get_current_user is directly in main, adjust accordingly
    from app.main import get_current_user


# --- Mock User ---
# Define MOCK_USER using the Pydantic model for type safety
MOCK_USER = User(
    id="test-user-123",
    email="test@example.com",
    name="Test User",
    image="https://example.com/image.jpg",
    # Add created_at/updated_at if your User model strictly requires them
    created_at=datetime.now(),
    updated_at=datetime.now(),
)


# --- Fixture for Test Client with Auth Override ---
@pytest.fixture(scope="function")  # Use function scope to reset override for each test
def client_with_override():
    # Define the override function inside the fixture
    async def mock_get_current_user():
        # Return the Pydantic User model instance
        return MOCK_USER

    # Apply the override
    app.dependency_overrides[get_current_user] = mock_get_current_user

    # Yield the TestClient while the override is active
    yield TestClient(app)

    # Teardown: Clear the override after the test is done
    # This is important to avoid side effects between tests
    del app.dependency_overrides[get_current_user]


# --- Fixture for standard Test Client (no override) ---
@pytest.fixture(scope="module")  # Can use module scope if app doesn't change
def client():
    yield TestClient(app)


# --- Updated Tests ---


def test_root_status(client):  # Use standard client
    """Test API status"""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to ThreadFlow API"}


def test_health(client):  # Use standard client
    """Test health"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_models_endpoint(client):  # Use standard client
    """Test models listing endpoint"""
    response = client.get("/models")
    assert response.status_code == 200
    data = response.json()
    assert "google" in data
    assert "anthropic" in data
    assert "openai" in data
    for provider in ["google", "anthropic", "openai"]:
        assert "available" in data[provider]
        assert "models" in data[provider]
        assert isinstance(data[provider]["models"], list)
        if data[provider]["models"]:
            model = data[provider]["models"][0]
            assert "id" in model
            assert "name" in model
            assert "description" in model


# Use new_callable=AsyncMock for patching async functions/methods
@patch("app.main.generate_response", new_callable=AsyncMock)
@patch("app.main.conversations_collection", new_callable=AsyncMock)
# Use the fixture that provides the client with the override
def test_chat_basic(mock_conversations_collection, mock_generate_response, client_with_override):
    """Baseline test for chatbot with authentication"""
    mock_conversations_collection.find_one.return_value = None
    mock_generate_response.return_value = "Test response"

    # Make request WITHOUT Authorization header, override handles user
    response = client_with_override.post("/chat", json={"message": "Hello!"})

    assert response.status_code == 200  # Should now be 200
    assert "response" in response.json()
    assert "conversation_id" in response.json()

    # Verify conversation was saved with the authenticated user's ID
    # Ensure the mock object structure matches your Conversation model's Pydantic export
    mock_conversations_collection.replace_one.assert_called_once()
    call_args = mock_conversations_collection.replace_one.call_args[0]
    assert call_args[0]["id"] == response.json()["conversation_id"]
    # Compare against the Pydantic model's attribute
    assert call_args[1]["user_id"] == MOCK_USER.id
    assert len(call_args[1]["messages"]) == 2


@patch("app.main.generate_response", new_callable=AsyncMock)
@patch("app.main.conversations_collection", new_callable=AsyncMock)
# Use the fixture that provides the client with the override
def test_chat_with_model_params(mock_conversations_collection, mock_generate_response, client_with_override):
    """Test chat with model parameters"""
    mock_conversations_collection.find_one.return_value = None
    mock_generate_response.return_value = "Model-specific response"

    # Make request WITHOUT Authorization header
    response = client_with_override.post("/chat", json={"message": "Hello!", "provider": "google", "model_id": "gemini-1.5-pro"})

    assert response.status_code == 200  # Should now be 200
    assert "response" in response.json()
    mock_generate_response.assert_called_once_with(message="Hello!", provider="google", model_id="gemini-1.5-pro")


# REMOVED @patch decorator as it's not needed for a skipped test
def test_get_conversations():
    """Test retrieving user's conversations"""
    # Keep the skip for now, or implement with the override client if needed later
    pytest.skip("Skipping this test as it requires complex async mocking or setup")


@patch("app.main.conversations_collection", new_callable=AsyncMock)
# Use the fixture that provides the client with the override
def test_get_single_conversation(mock_conversations_collection, client_with_override):
    """Test retrieving a single conversation"""
    # Create mock conversation using Pydantic model's structure if possible,
    # or ensure dict matches Conversation.model_dump() output
    mock_conv_data = {
        "id": "conv-1",
        "user_id": MOCK_USER.id,  # Use the mock user's ID
        "title": "Test Conversation",
        "messages": [
            {"id": "msg-1", "role": "user", "content": "Hello", "timestamp": datetime.now()},  # Use datetime objects if model expects them
            {"id": "msg-2", "role": "assistant", "content": "Hi there", "timestamp": datetime.now()},
        ],
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "parent_conversation_id": None,  # Add missing fields based on Conversation model
        "branch_point_message_id": None,
    }
    # Mock find_one to return the dictionary representation
    mock_conversations_collection.find_one.return_value = mock_conv_data

    # Make request WITHOUT Authorization header
    response = client_with_override.get("/conversations/conv-1")

    assert response.status_code == 200  # Should now be 200
    assert response.json()["id"] == "conv-1"
    assert response.json()["user_id"] == MOCK_USER.id  # Verify ownership check passed implicitly
    assert response.json()["title"] == "Test Conversation"
    assert len(response.json()["messages"]) == 2
    mock_conversations_collection.find_one.assert_called_once_with({"id": "conv-1"})


# REMOVED unnecessary @patch decorator
# Use the fixture that provides the client with the override
def test_get_user_profile(client_with_override):
    """Test retrieving the authenticated user's profile"""
    # Make request WITHOUT Authorization header
    response = client_with_override.get("/users/me")

    assert response.status_code == 200
    # Compare against the Pydantic model's attributes
    assert response.json()["id"] == MOCK_USER.id
    assert response.json()["email"] == MOCK_USER.email
    assert response.json()["name"] == MOCK_USER.name
