from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.catalog.views import CategoryListView, ProductViewSet, AdminProductViewSet

router = DefaultRouter()
router.register(r'admin/products', AdminProductViewSet, basename='admin-products')
router.register(r'products', ProductViewSet, basename='products')

urlpatterns = [
    path('categories/', CategoryListView.as_view(), name='category-list'),
    path('', include(router.urls)),
]
