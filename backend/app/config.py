import os

from google.cloud import secretmanager


def get_secret(secret_id, default_value=""):
    """Get a secret from Secret Manager or use default/env value"""
    # Check if we're running on Cloud Run
    if os.environ.get("K_SERVICE"):
        try:
            project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "threadflow-app")
            client = secretmanager.SecretManagerServiceClient()
            name = f"projects/{project_id}/secrets/{secret_id}/versions/latest"
            response = client.access_secret_version(request={"name": name})
            return response.payload.data.decode("UTF-8")
        except Exception as e:
            print(f"Error accessing secret {secret_id}: {e}")
            # Fall back to environment variable
            return os.environ.get(secret_id.replace("-", "_").upper(), default_value)
    else:
        # In development, use environment variables
        return os.environ.get(secret_id.replace("-", "_").upper(), default_value)


# Application settings
MONGODB_URI = get_secret("mongodb-uri", "mongodb://mongo:27017/threadflow")
JWT_SECRET = get_secret("jwt-secret", "dev_secret_key")
