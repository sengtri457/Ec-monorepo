import datetime
import jwt
from typing import Dict, Any, Optional

def generate_jwt_tokens(user_id: Any, email: str, username: str, secret_key: str, expiration_hours: int = 24) -> Dict[str, str]:
    now = datetime.datetime.now(datetime.timezone.utc)
    access_payload = {
        'user_id': user_id,
        'email': email,
        'username': username,
        'token_type': 'access',
        'iat': now,
        'exp': now + datetime.timedelta(hours=expiration_hours),
    }
    refresh_payload = {
        'user_id': user_id,
        'token_type': 'refresh',
        'iat': now,
        'exp': now + datetime.timedelta(days=7),
    }
    access_token = jwt.encode(access_payload, secret_key, algorithm='HS256')
    refresh_token = jwt.encode(refresh_payload, secret_key, algorithm='HS256')
    return {
        'access': access_token,
        'refresh': refresh_token,
    }

def decode_jwt_token(token: str, secret_key: str, expected_type: str = 'access') -> Dict[str, Any]:
    payload = jwt.decode(token, secret_key, algorithms=['HS256'])
    token_type = payload.get('token_type')
    if token_type and token_type != expected_type:
        raise ValueError(f"Invalid token type: expected {expected_type}, received {token_type}")
    return payload
