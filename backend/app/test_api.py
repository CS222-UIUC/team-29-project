from fastapi.testclient import TestClient
from .main import app

client  = TestClient(app)

#Test API status
def test_root_status():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to ThreadFlow API"}

#Test health
def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

#Baseline test for chatbot
def test_chat_basic():
    response = client.post("/chat", json={"message": "Hi!"})
    assert response.status_code == 200
    assert "response" in response.json() 