# ThreadFlow API Security Testing Strategy

This document outlines the testing strategy for JWT-based authentication and authorization in the ThreadFlow application.

## Backend Tests

### Unit Tests (test_security.py)

1. **JWT Token Validation Tests**
   - Valid token processing
   - Token payload extraction
   - Missing token handling
   - Invalid token format handling
   - Expired token handling
   - Tampered token validation

2. **User Management Tests**
   - New user creation from valid token
   - Existing user profile updates
   - User lookup and authentication

3. **Protected Endpoint Tests**
   - Verify authentication dependency is applied
   - Test access to protected resources
   - Verify user identity is correctly used

### API Tests (test_api.py)

1. **Public Endpoint Tests**
   - Root endpoint
   - Health check
   - Models listing

2. **Protected Endpoint Tests with Mocked Authentication**
   - Chat functionality with authentication
   - Conversation retrieval with user context
   - Branching conversations with user ownership
   - User profile retrieval

### Integration Tests (test_integration.py)

1. **Public vs Protected Endpoint Tests**
   - Verify public endpoints are accessible without authentication
   - Verify protected endpoints reject unauthenticated requests

2. **Authentication Tests**
   - Valid token acceptance
   - Invalid/expired token rejection
   - Proper token format validation

3. **User Flow Tests**
   - Lazy user creation
   - Authentication persistence
   - Resource ownership validation

## Frontend Tests

### API Client Tests (apiClient.test.ts)

1. **Token Handling Tests**
   - JWT token extraction from session
   - Authorization header formation
   - API requests with and without tokens

2. **Request Formation Tests**
   - Header merging
   - URL handling
   - Error handling

### Authentication Flow Tests (AuthFlow.test.tsx)

1. **Session State Tests**
   - Authenticated state UI rendering
   - Unauthenticated state UI rendering
   - Loading state handling

2. **API Integration Tests**
   - Session token usage in API calls
   - Authentication error handling

### JWT Implementation Tests (ChatJWT.test.tsx)

1. **API Request Tests**
   - Verify user_id is not sent in request body
   - Verify user_id is not sent in query parameters
   - Verify JWT token is sent in Authorization header

2. **Response Handling Tests**
   - Process authorized responses
   - Handle unauthorized errors

## Test Coverage

The tests cover:

1. **Authentication**
   - Token validation
   - User identity verification
   - Session management

2. **Authorization**
   - Resource ownership verification
   - Access control enforcement
   - Permission handling

3. **Error Handling**
   - Authentication failures
   - Authorization failures
   - Token expiration/invalidation

4. **User Experience**
   - Authentication state UI
   - Error state UI
   - Loading state handling

## Running Tests

### Backend Tests

```bash
# Run all tests
cd backend
pytest

# Run specific test modules
pytest app/test_security.py
pytest app/test_api.py
pytest app/test_integration.py
```

### Frontend Tests

```bash
# Run all tests
cd frontend
npm test

# Run specific test files
npm test -- apiClient.test.ts
npm test -- AuthFlow.test.tsx
npm test -- ChatJWT.test.tsx
```

## CI Integration

These tests should be incorporated into CI pipelines to ensure security measures remain intact through development:

1. Run backend tests before deployment
2. Run frontend tests before build
3. Fail deployment/build if any security tests fail