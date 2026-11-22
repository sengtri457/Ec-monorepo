from django.urls import path
from apps.cart.views import CartDetailView, CartItemAddView, CartItemDetailView

urlpatterns = [
    path('api/v1/cart/', CartDetailView.as_view(), name='cart-detail'),
    path('api/v1/cart/items/', CartItemAddView.as_view(), name='cart-item-add'),
    path('api/v1/cart/items/<int:item_id>/', CartItemDetailView.as_view(), name='cart-item-detail'),
]
