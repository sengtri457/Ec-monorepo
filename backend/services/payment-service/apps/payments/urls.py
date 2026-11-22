from django.urls import path
from apps.payments.views import (
    PaymentCreateView,
    PaymentDetailView,
    PaymentOrderByUUIDView,
    PaymentVerifyView,
    PaymentCallbackView,
    KHQRGenerateView,
    HealthCheckView,
)

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('api/v1/payments/', PaymentCreateView.as_view(), name='payment-create'),
    path('api/v1/payments/<uuid:id>/', PaymentDetailView.as_view(), name='payment-detail'),
    path('api/v1/payments/<uuid:id>/status/', PaymentDetailView.as_view(), name='payment-status'),
    path('api/v1/payments/<uuid:id>/verify/', PaymentVerifyView.as_view(), name='payment-verify'),
    path('api/v1/payments/order/<uuid:order_id>/', PaymentOrderByUUIDView.as_view(), name='payment-order'),
    path('api/v1/payments/khqr/generate/', KHQRGenerateView.as_view(), name='khqr-generate'),

    # Internal webhook / callback
    path('internal/payments/callback/', PaymentCallbackView.as_view(), name='internal-payment-callback'),
]
