import os
import jwt
from django.conf import settings
from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied, AuthenticationFailed

class IsAdminOrStaffUser(BasePermission):
    """
    Allows access only to authenticated staff or superuser accounts,
    verified via Authorization Bearer JWT, internal service key, or authenticated Django user.
    """
    def has_permission(self, request, view):
        # 1. Django user object (e.g. test client force_authenticate or active staff user)
        user = getattr(request, 'user', None)
        if user and getattr(user, 'is_authenticated', False) and (getattr(user, 'is_staff', False) or getattr(user, 'is_superuser', False)):
            return True

        # 2. Check internal service key
        internal_key = os.environ.get(
            'INTERNAL_SERVICE_KEY',
            getattr(settings, 'INTERNAL_SERVICE_KEY', 'ec-internal-shared-secret-key-2026')
        )
        if request.headers.get('X-Internal-Service-Key') == internal_key:
            return True

        # 3. Decode Authorization: Bearer <token>
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            raise PermissionDenied("Authentication credentials were not provided.")

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            raise PermissionDenied("Invalid Authorization header format. Expected 'Bearer <token>'.")

        token = parts[1]
        secret = os.environ.get('JWT_SECRET_KEY', getattr(settings, 'JWT_SECRET_KEY', settings.SECRET_KEY))
        try:
            payload = jwt.decode(token, secret, algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed("Authentication token has expired.")
        except jwt.PyJWTError as e:
            raise AuthenticationFailed(f"Invalid authentication token: {str(e)}")

        is_staff = payload.get('is_staff', False)
        is_superuser = payload.get('is_superuser', False)

        if not (is_staff or is_superuser):
            raise PermissionDenied("Access restricted. Administrator privileges required.")

        request.admin_user_id = payload.get('user_id')
        request.admin_email = payload.get('email')
        return True
