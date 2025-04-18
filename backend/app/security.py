"""Security utilities for the ThreadFlow backend."""

from datetime import datetime

from fastapi import Header, HTTPException
from jose import JWTError, jwt

from app.config import JWT_SECRET
from app.logging import logger
from app.models import User, users_collection

# JWT configuration constants
ALGORITHM = "HS256"


async def _extract_token(authorization: str) -> str:
    """Extract the token from the authorization header."""
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")
        return token
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header format")


async def _decode_jwt_token(token: str) -> dict:
    """Decode and validate JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: missing user ID")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication token")


async def _update_user_if_needed(user: User, payload: dict) -> User:
    """Update user profile information if needed."""
    update_needed = False
    fields_to_update = {}

    for field, token_field in [("email", "email"), ("name", "name"), ("image", "picture")]:
        token_value = payload.get(token_field)
        if token_value and getattr(user, field) != token_value:
            setattr(user, field, token_value)
            fields_to_update[field] = token_value
            update_needed = True

    if update_needed:
        now = datetime.now()
        user.updated_at = now
        fields_to_update["updated_at"] = now
        await users_collection.update_one({"id": user.id}, {"$set": fields_to_update})
        logger.info(f"Updated user profile information: {user.id}")

    return user


async def get_current_user(authorization: str | None = Header(None)) -> User:
    """Validate JWT token and return the authenticated user.
    If user doesn't exist, create a new user from the token claims.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = await _extract_token(authorization)
    payload = await _decode_jwt_token(token)

    user_id = payload.get("sub")
    user_doc = await users_collection.find_one({"id": user_id})
    now = datetime.now()

    if not user_doc:
        # Create new user with data from token
        logger.info(f"Creating new user from token: {user_id}")
        user_data = {
            "id": user_id,
            "email": payload.get("email"),
            "name": payload.get("name"),
            "image": payload.get("picture"),
            "created_at": now,
            "updated_at": now,
        }
        await users_collection.insert_one(user_data)
        return User(**user_data)

    # Update user if needed
    user = User(**user_doc)
    return await _update_user_if_needed(user, payload)
