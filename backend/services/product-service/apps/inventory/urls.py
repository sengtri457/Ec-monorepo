from django.urls import path
from apps.inventory.views import (
    VariantStockDetailView,
    CreateStockReservationView,
    ReleaseStockReservationView,
    ConfirmStockReservationView,
    AdminInventoryListView,
    AdminStockAdjustmentView,
    AdminStockMovementListView,
)

urlpatterns = [
    # Admin inventory & stock adjustment
    path('api/v1/inventory/admin/', AdminInventoryListView.as_view(), name='admin-inventory-list'),
    path('api/v1/inventory/admin/adjust/', AdminStockAdjustmentView.as_view(), name='admin-stock-adjust-body'),
    path('api/v1/inventory/admin/<int:variant_id>/adjust/', AdminStockAdjustmentView.as_view(), name='admin-stock-adjust'),
    path('api/v1/inventory/admin/movements/', AdminStockMovementListView.as_view(), name='admin-stock-movements'),

    # Public inventory check
    path('api/v1/inventory/<int:variant_id>/', VariantStockDetailView.as_view(), name='variant-stock-detail'),

    # Internal service-to-service reservation workflow
    path('internal/inventory/reservations/', CreateStockReservationView.as_view(), name='internal-create-reservation'),
    path('internal/inventory/reservations/<uuid:reservation_id>/release/', ReleaseStockReservationView.as_view(), name='internal-release-reservation'),
    path('internal/inventory/reservations/<uuid:reservation_id>/confirm/', ConfirmStockReservationView.as_view(), name='internal-confirm-reservation'),
]
