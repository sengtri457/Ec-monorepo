from django.urls import path
from apps.accounts.views import (
    RegisterView,
    LoginView,
    AdminLoginView,
    GoogleAuthView,
    RefreshTokenView,
    CurrentUserView,
    UserDetailView,
    AddressListCreateView,
    AddressDetailView,
    HealthCheckView,
)

urlpatterns = [
    # Health check
    path('health/', HealthCheckView.as_view(), name='health-check'),

    # Auth routes
    path('api/v1/auth/register/', RegisterView.as_view(), name='auth-register'),
    path('api/v1/auth/login/', LoginView.as_view(), name='auth-login'),
    path('api/v1/auth/admin/login/', AdminLoginView.as_view(), name='auth-admin-login'),
    path('api/v1/auth/google/', GoogleAuthView.as_view(), name='auth-google'),
    path('api/v1/auth/refresh/', RefreshTokenView.as_view(), name='auth-refresh'),

    # Users
    path('api/v1/users/me/', CurrentUserView.as_view(), name='user-me'),
    path('api/v1/users/<int:id>/', UserDetailView.as_view(), name='user-detail'),

    # Addresses
    path('api/v1/addresses/', AddressListCreateView.as_view(), name='address-list-create'),
    path('api/v1/addresses/<int:pk>/', AddressDetailView.as_view(), name='address-detail'),
]
