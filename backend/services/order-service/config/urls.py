"""
Order Service URL Configuration
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('apps.orders.urls')),
    path('', include('apps.cart.urls')),
]
