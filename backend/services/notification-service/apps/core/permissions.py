import os
from django.conf import settings
from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied

class IsInternalService(BasePermission):
    """
    Restricts access strictly to internal microservices presenting the valid X-Internal-Service-Key.
    """
    def has_permission(self, request, view):
        expected_key = os.environ.get(
            'INTERNAL_SERVICE_KEY',
            getattr(settings, 'INTERNAL_SERVICE_KEY', 'ec-internal-shared-secret-key-2026')
        )
        received_key = request.headers.get('X-Internal-Service-Key')
        if not received_key or received_key != expected_key:
            raise PermissionDenied("Access to internal endpoint requires valid X-Internal-Service-Key.")
        return True
