# backend/app/test_integration.py

import asyncio
import pymongo
import pytest
import httpx # Import httpx
from httpx import ASGITransport # Import ASGITransport
from fastapi.testclient import TestClient # Keep for sync tests if needed
from datetime import datetime, timedelta
from jose import jwt
from unittest.mock import patch, AsyncMock, MagicMock

# Import necessary components
from app.main import app # Need the app instance for the transport
from app.config import JWT_SECRET, MONGODB_URI
from app.security import ALGORITHM

# Mark all tests in this module as integration tests
pytestmark = pytest.mark.integration

# --- Synchronous Test Client (Optional, for purely sync endpoints) ---
sync_client = TestClient(app)

# --- Asynchronous Test Client Fixture ---
@pytest.fixture(scope="function")
async def async_client():
    # Create an ASGITransport instance using the FastAPI app
    transport = ASGITransport(app=app)
    # Pass the transport to the AsyncClient
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    # No explicit cleanup needed for the transport here

# --- Synchronous MongoDB Client for Setup/Teardown ---
# Using sync client for test data management is generally simpler and safer
sync_mongo_client = pymongo.MongoClient(MONGODB_URI)
sync_db = sync_mongo_client.threadflow
# Use distinct names to avoid conflicts with potential test variables
users_collection = sync_db.users
conversations_collection = sync_db.conversations

# Define Test Constants
TEST_USER_ID = "integration-test-user"
TEST_USER_EMAIL = "integration@test.com"
TEST_USER_NAME = "Integration Tester"
TEST_USER_IMAGE = "https://example.com/integration.jpg"

# --- Pytest Fixture for Database Setup/Teardown ---
@pytest.fixture(scope="module", autouse=True)
def clean_test_database():
    """Clean up test data before and after all tests in the module."""
    print("\nClearing integration test data before tests...")
    user_filter = {"id": {"$regex": "^integration-test"}}
    conv_filter = {"user_id": {"$regex": "^integration-test"}}
    try:
        # Use synchronous client for fixture operations
        delete_user_result = users_collection.delete_many(user_filter)
        delete_conv_result = conversations_collection.delete_many(conv_filter)
        print(f"Database cleared before tests (Users: {delete_user_result.deleted_count}, Convs: {delete_conv_result.deleted_count}).")
    except Exception as e:
        print(f"Warning: Database cleanup failed before tests: {e}")

    yield # Run tests

    print("\nClearing integration test data after tests...")
    try:
        # Use synchronous client for fixture operations
        delete_user_result = users_collection.delete_many(user_filter)
        delete_conv_result = conversations_collection.delete_many(conv_filter)
        print(f"Database cleared after tests (Users: {delete_user_result.deleted_count}, Convs: {delete_conv_result.deleted_count}).")
    except Exception as e:
        print(f"Warning: Database cleanup failed after tests: {e}")

# --- Helper function to create JWT tokens ---
def create_test_token(user_id=TEST_USER_ID, expires_delta=None, claims=None):
    """Creates a JWT token for testing."""
    to_encode = {
        "sub": user_id,
        "email": TEST_USER_EMAIL,
        "name": TEST_USER_NAME,
        "picture": TEST_USER_IMAGE,
    }
    if claims:
        to_encode.update(claims)
    expire = datetime.utcnow() + (expires_delta if expires_delta else timedelta(minutes=15))
    to_encode["exp"] = expire
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt


# --- Tests ---

# Use sync_client for purely public endpoints that don't touch async DB logic
def test_public_endpoints():
    """Test that public endpoints are accessible without auth."""
    response = sync_client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to ThreadFlow API"}

    response = sync_client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

    response = sync_client.get("/models")
    assert response.status_code == 200
    assert "google" in response.json() # Basic structure check

# Use sync_client as these fail before hitting async DB logic
def test_protected_endpoints_without_auth():
    """Test that protected endpoints require authentication."""
    response = sync_client.get("/users/me")
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"

    response = sync_client.post("/chat", json={"message": "test"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"

    response = sync_client.get("/conversations")
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"

    response = sync_client.get("/conversations/some-id")
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"

    response = sync_client.post("/conversations/some-id/branch", json={"message_id": "msg-id"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"


@pytest.mark.asyncio
async def test_expired_token(async_client: httpx.AsyncClient):
    """Test that an expired token is rejected."""
    token = create_test_token(expires_delta=timedelta(minutes=-5))
    headers = {"Authorization": f"Bearer {token}"}
    response = await async_client.get("/users/me", headers=headers)
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid authentication token"


@pytest.mark.asyncio
async def test_conversation_branching(async_client: httpx.AsyncClient):
    """Test creating a branch from an existing conversation."""
    user_branch_id = f"integration-test-branch-{datetime.now().timestamp()}"

    # Sync setup: Ensure user exists
    user_doc = {
        "id": user_branch_id, "email": TEST_USER_EMAIL, "name": TEST_USER_NAME,
        "image": TEST_USER_IMAGE, "created_at": datetime.now(), "updated_at": datetime.now(),
    }
    users_collection.replace_one({"id": user_branch_id}, user_doc, upsert=True)

    token = create_test_token(user_id=user_branch_id)
    headers = {"Authorization": f"Bearer {token}"}

    # Sync setup: Create a parent conversation directly in DB
    parent_conv_id = f"parent-conv-{user_branch_id}"
    message_to_branch_from_id = "msg-branch-point"
    parent_messages = [
        {"id": "msg-1", "role": "user", "content": "Parent Q1", "timestamp": datetime.now()},
        {"id": message_to_branch_from_id, "role": "assistant", "content": "Parent A1", "timestamp": datetime.now()},
        {"id": "msg-3", "role": "user", "content": "Parent Q2", "timestamp": datetime.now()},
    ]
    parent_conv_doc = {
        "id": parent_conv_id,
        "user_id": user_branch_id,
        "title": "Parent Conversation",
        "messages": parent_messages,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "parent_conversation_id": None,
        "branch_point_message_id": None,
    }
    conversations_collection.insert_one(parent_conv_doc)

    # Make the branch request
    branch_request_payload = {"message_id": message_to_branch_from_id}
    response = await async_client.post(
        f"/conversations/{parent_conv_id}/branch",
        headers=headers,
        json=branch_request_payload
    )

    # Verify successful branch creation
    assert response.status_code == 201, f"Response body: {response.text}"
    branch_data = response.json()
    branch_id = branch_data["id"]
    assert branch_id != parent_conv_id
    assert branch_data["user_id"] == user_branch_id
    assert branch_data["parent_conversation_id"] == parent_conv_id
    assert branch_data["branch_point_message_id"] == message_to_branch_from_id
    assert len(branch_data["messages"]) == 2 # Should contain messages up to the branch point
    assert branch_data["messages"][0]["id"] == "msg-1"
    assert branch_data["messages"][1]["id"] == message_to_branch_from_id

    # Verify branch exists in DB (sync check)
    branch_doc_db = conversations_collection.find_one({"id": branch_id})
    assert branch_doc_db is not None
    assert branch_doc_db["parent_conversation_id"] == parent_conv_id

    # Verify branching from non-existent message fails
    response_bad_msg = await async_client.post(
        f"/conversations/{parent_conv_id}/branch",
        headers=headers,
        json={"message_id": "non-existent-msg-id"}
    )
    assert response_bad_msg.status_code == 404

    # Verify branching from non-existent conversation fails
    response_bad_conv = await async_client.post(
        f"/conversations/non-existent-conv/branch",
        headers=headers,
        json={"message_id": message_to_branch_from_id}
    )
    assert response_bad_conv.status_code == 404 # Should be 404 as parent not found