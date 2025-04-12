# backend/app/test_integration.py

import pytest
from httpx import AsyncClient # Import AsyncClient
from datetime import datetime, timedelta
import time # For sleep, if needed

# Import necessary components
from app.main import app
from app.models import users_collection, User # Import User model if needed for checks

# Define TEST_USER_ID or use dynamically generated ones
TEST_USER_ID = "integration-test-user"
TEST_USER_EMAIL = "integration@test.com" # Optional: Add email if needed

# --- Helper function to create tokens ---
def create_token(user_id=TEST_USER_ID, expires_delta_minutes=15):
    """Creates a JWT token for testing."""
    expire = datetime.now() + timedelta(minutes=expires_delta_minutes)
    to_encode = {"sub": user_id, "exp": expire}
    encoded_jwt = create_access_token(data=to_encode)
    return encoded_jwt

# --- Pytest Fixture for Async Client ---
# Use autouse=True if you want the DB cleared for every test in this module
# Or create separate fixtures for setup/teardown if needed per test
@pytest.fixture(scope="module", autouse=True)
async def clear_test_database():
    """Fixture to clear relevant test data before and after tests run."""
    # Clear before tests start for the module
    await users_collection.delete_many({"id": {"$regex": "^integration-test-"}})
    yield # Let tests run
    # Clear after tests finish for the module
    await users_collection.delete_many({"id": {"$regex": "^integration-test-"}})


@pytest.mark.integration # Ensure pytest marker is present
@pytest.mark.asyncio # Mark tests needing pytest-asyncio
async def test_public_endpoints():
    """Test that public endpoints are accessible."""
    # Use AsyncClient with the FastAPI app
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/")
        assert response.status_code == 200
        assert response.json() == {"message": "Welcome to ThreadFlow API"}

        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}

        response = await client.get("/models")
        assert response.status_code == 200
        assert "google" in response.json() # Basic check


@pytest.mark.integration
@pytest.mark.asyncio
async def test_protected_endpoints_without_auth():
    """Test that protected endpoints require authentication."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/users/me")
        assert response.status_code == 401 # Expect 401 Unauthorized

        response = await client.post("/chat", json={"message": "test"})
        assert response.status_code == 401

        response = await client.get("/conversations")
        assert response.status_code == 401

        response = await client.get("/conversations/some-id")
        assert response.status_code == 401

        response = await client.post("/conversations/some-id/branch", json={"message_id": "msg-id"})
        assert response.status_code == 401


@pytest.mark.integration
@pytest.mark.asyncio
async def test_protected_endpoints_with_valid_auth():
    """Test that protected endpoints work with valid authentication"""
    token = create_token()
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(app=app, base_url="http://test") as client:
        # User profile - This will also trigger user creation if not exists
        response = await client.get("/users/me", headers=headers)
        # --- Check the result of the /users/me call ---
        assert response.status_code == 200
        user_data = response.json()
        assert user_data["id"] == TEST_USER_ID
        # Add checks for other expected fields if needed

        # Fetch conversations (should be empty initially for this test user)
        response = await client.get("/conversations", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        assert len(response.json()) == 0 # Assuming clear_test_database works

        # Try getting a non-existent conversation
        response = await client.get("/conversations/non-existent-id", headers=headers)
        assert response.status_code == 404 # Should be 404 Not Found

        # Try getting the user profile again
        response = await client.get("/users/me", headers=headers)
        assert response.status_code == 200


@pytest.mark.integration
@pytest.mark.asyncio
async def test_expired_token():
    """Test that an expired token is rejected."""
    token = create_token(expires_delta_minutes=-5) # Expired 5 minutes ago
    headers = {"Authorization": f"Bearer {token}"}
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/users/me", headers=headers)
        assert response.status_code == 401
        assert "expired" in response.json()["detail"].lower() # Check detail


@pytest.mark.integration
@pytest.mark.asyncio
async def test_invalid_token_format():
    """Test that malformed tokens are rejected."""
    headers = {"Authorization": "Bearer invalid-token-format"}
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/users/me", headers=headers)
        assert response.status_code == 401
        # Detail might vary, check for common invalid token messages
        assert "invalid" in response.json()["detail"].lower()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_user_lazy_creation():
    """Test that a user record is created when a valid token is presented"""
    # Create a token with a unique user ID that shouldn't exist yet
    unique_id = f"integration-test-{datetime.now().timestamp()}"
    token = create_token(user_id=unique_id)
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(app=app, base_url="http://test") as client:
        # 1. Verify user does NOT exist initially
        user_before = await users_collection.find_one({"id": unique_id})
        assert user_before is None

        # 2. Request the user profile (should create the user via get_current_user)
        response = await client.get("/users/me", headers=headers)
        assert response.status_code == 200
        assert response.json()["id"] == unique_id

        # 3. Verify user DOES exist in the database now
        user_after = await users_collection.find_one({"id": unique_id})
        assert user_after is not None
        assert user_after["id"] == unique_id