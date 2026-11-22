from django.urls import path
from apps.inventory.views import (
    VariantStockDetailView,
    CreateStockReservationView,
    ReleaseStockReservationView,
    ConfirmStockReservationView,
)

urlpatterns = [
    # Public inventory check
    path('api/v1/inventory/<int:variant_id>/', VariantStockDetailView.as_view(), name='variant-stock-detail'),

    # Internal service-to-service reservation workflow
    path('internal/inventory/reservations/', CreateStockReservationView.as_view(), name='internal-create-reservation'),
    path('internal/inventory/reservations/<uuid:reservation_id>/release/', ReleaseStockReservationView.as_view(), name='internal-release-reservation'),
    path('internal/inventory/reservations/<uuid:reservation_id>/confirm/', ConfirmStockReservationView.as_view(), name='internal-confirm-reservation'),
]
