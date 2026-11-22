from django.urls import path
from apps.orders.views import (
    ShippingMethodListView,
    CheckoutView,
    OrderListView,
    OrderDetailView,
    InternalOrderStatusUpdateView,
    HealthCheckView,
)

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('api/v1/orders/shipping-methods/', ShippingMethodListView.as_view(), name='shipping-methods'),
    path('api/v1/orders/checkout/', CheckoutView.as_view(), name='order-checkout'),
    path('api/v1/orders/', OrderListView.as_view(), name='order-list'),
    path('api/v1/orders/<str:order_number>/', OrderDetailView.as_view(), name='order-detail'),

    # Internal service route
    path('internal/orders/<uuid:order_id>/status/', InternalOrderStatusUpdateView.as_view(), name='internal-order-status-update'),
]
