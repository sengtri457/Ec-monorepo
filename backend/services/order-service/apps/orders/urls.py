from django.urls import path
from apps.orders.views import (
    ShippingMethodListView,
    CheckoutView,
    OrderListView,
    OrderDetailView,
    InternalOrderStatusUpdateView,
    HealthCheckView,
    PublicDeliveryTrackingView,
    OrderDetailDeliveryView,
    RiderLocationUpdateView,
    InternalShipmentStatusUpdateView,
)

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('api/v1/orders/shipping-methods/', ShippingMethodListView.as_view(), name='shipping-methods'),
    path('api/v1/orders/checkout/', CheckoutView.as_view(), name='order-checkout'),
    path('api/v1/orders/', OrderListView.as_view(), name='order-list'),
    path('api/v1/orders/tracking/<str:tracking_number>/', PublicDeliveryTrackingView.as_view(), name='public-delivery-tracking'),
    path('api/v1/orders/tracking/<str:tracking_number>/location/', RiderLocationUpdateView.as_view(), name='rider-location-update'),
    path('api/v1/orders/<str:order_number>/', OrderDetailView.as_view(), name='order-detail'),
    path('api/v1/orders/<str:order_number>/delivery/', OrderDetailDeliveryView.as_view(), name='order-detail-delivery'),

    # Internal service routes
    path('internal/orders/<uuid:order_id>/status/', InternalOrderStatusUpdateView.as_view(), name='internal-order-status-update'),
    path('internal/orders/shipments/<str:tracking_number>/status/', InternalShipmentStatusUpdateView.as_view(), name='internal-shipment-status-update'),
]
