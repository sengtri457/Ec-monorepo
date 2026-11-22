from django.urls import path
from apps.accounts.views import (
    RegisterView,
    LoginView,
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
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/google/', GoogleAuthView.as_view(), name='auth-google'),
    path('auth/refresh/', RefreshTokenView.as_view(), name='auth-refresh'),

    # Users
    path('users/me/', CurrentUserView.as_view(), name='user-me'),
    path('users/<int:id>/', UserDetailView.as_view(), name='user-detail'),

    # Addresses
    path('addresses/', AddressListCreateView.as_view(), name='address-list-create'),
    path('addresses/<int:pk>/', AddressDetailView.as_view(), name='address-detail'),
]
