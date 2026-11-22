import datetime
import jwt
from django.conf import settings
from rest_framework import authentication, exceptions
from apps.accounts.models import User

def generate_tokens_for_user(user):
    secret = getattr(settings, 'JWT_SECRET_KEY', settings.SECRET_KEY)
    now = datetime.datetime.now(datetime.timezone.utc)
    access_payload = {
        'user_id': user.id,
        'email': user.email,
        'username': user.username,
        'token_type': 'access',
        'iat': now,
        'exp': now + datetime.timedelta(hours=getattr(settings, 'JWT_EXPIRATION_HOURS', 24)),
    }
    refresh_payload = {
        'user_id': user.id,
        'token_type': 'refresh',
        'iat': now,
        'exp': now + datetime.timedelta(days=7),
    }
    access_token = jwt.encode(access_payload, secret, algorithm='HS256')
    refresh_token = jwt.encode(refresh_payload, secret, algorithm='HS256')
    return {
        'access': access_token,
        'refresh': refresh_token,
    }

def decode_token(token, token_type='access'):
    secret = getattr(settings, 'JWT_SECRET_KEY', settings.SECRET_KEY)
    try:
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        if payload.get('token_type') != token_type:
            raise exceptions.AuthenticationFailed(f"Invalid token type: expected {token_type}")
        return payload
    except jwt.ExpiredSignatureError:
        raise exceptions.AuthenticationFailed("Token has expired")
    except jwt.PyJWTError as e:
        raise exceptions.AuthenticationFailed(f"Invalid token: {str(e)}")

class JWTAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return None
        token = parts[1]
        payload = decode_token(token, token_type='access')
        user_id = payload.get('user_id')
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            raise exceptions.AuthenticationFailed("User not found")
        if not user.is_active:
            raise exceptions.AuthenticationFailed("User is inactive")
        return (user, token)
