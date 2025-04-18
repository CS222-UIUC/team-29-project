# ThreadFlow Testing Strategy

This document describes the testing strategy for ThreadFlow, including test categories, organization, and execution environments.

## Test Categories

Our tests are organized into different categories to ensure both comprehensive coverage and efficient pipeline execution:

1. **Unit Tests**: Fast, isolated tests that verify individual components
   - Run during development and all CI/CD pipelines
   - Should complete quickly (< 1 minute)

2. **Security Tests**: Tests that focus on authentication and authorization
   - Run during development, PR validation, and before deployment
   - Example: JWT token validation, protected endpoint access tests

3. **Integration Tests**: Tests that verify interactions between components
   - Run during PR validation and before deployment to staging/production
   - Example: API endpoint tests that require database interaction

4. **Production-Safe Tests**: Lightweight tests that can run against production
   - Run after deployment to verify basic functionality
   - Must not mutate production data or impact performance

## Test Organization

### Backend Tests

Backend tests use pytest markers to organize tests into categories:

```python
import pytest

@pytest.mark.unit
def test_something_unit():
    # Fast unit test

@pytest.mark.security
def test_auth_security():
    # Security-specific test

@pytest.mark.integration
def test_something_integration():
    # Slower integration test

@pytest.mark.prod_safe
def test_something_safe_for_prod():
    # Test safe to run in production
```

Run specific test categories with:

```bash
# Run unit tests only
poetry run pytest -m "unit"

# Run everything except security and integration tests
poetry run pytest -m "not security and not integration"

# Run only production-safe tests
poetry run pytest -m "prod_safe"
```

### Frontend Tests

Frontend tests use naming conventions to organize tests:

- `*.test.tsx` - Standard unit tests
- `*.security.test.tsx` - Security tests
- `*.integration.test.tsx` - Integration tests
- `*.prod.test.tsx` - Production-safe tests

Run specific test categories with:

```bash
# Run standard tests
npm test -- --testPathIgnorePatterns=".security.|.integration.|.prod."

# Run security tests
npm test -- --testMatch="**/*.security.test.[jt]s?(x)"

# Run integration tests
npm test -- --testMatch="**/*.integration.test.[jt]s?(x)"

# Run production-safe tests
npm test -- --testMatch="**/*.prod.test.[jt]s?(x)"
```

## CI/CD Pipeline Integration

Our test strategy is integrated into the CI/CD pipeline as follows:

1. **Development**: Developers run unit and security tests locally
2. **Pull Request**: CI runs unit and security tests
3. **Main Branch**: CI runs all test categories before deployment
4. **Staging Deployment**: Run integration tests against staging
5. **Production Deployment**: Run production-safe tests post-deployment

## Test Environment Variables

To properly run tests, you need the following environment variables:

### Backend
- `JWT_SECRET`: Secret key for JWT token verification
- `OPENAI_API_KEY`: For API integration tests
- `ANTHROPIC_API_KEY`: For API integration tests
- `GEMINI_API_KEY`: For API integration tests

### Frontend
- `NEXTAUTH_SECRET`: For authentication tests
- `GOOGLE_CLIENT_ID`: For OAuth tests
- `GOOGLE_CLIENT_SECRET`: For OAuth tests

For local development, these can be stored in a `.env` file. For CI/CD, they are stored as GitHub secrets.