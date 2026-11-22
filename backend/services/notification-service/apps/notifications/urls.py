from django.urls import path
from apps.notifications.views import (
    HealthCheckView,
    CreateNotificationView,
    NotificationListView,
    NotificationDetailView,
)

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('internal/notifications/', CreateNotificationView.as_view(), name='internal-create-notification'),
    path('api/v1/notifications/', NotificationListView.as_view(), name='notification-list'),
    path('api/v1/notifications/<uuid:id>/', NotificationDetailView.as_view(), name='notification-detail'),
]
