import uuid
import jwt
from django.conf import settings
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.cart.models import Cart, CartItem
from apps.cart.serializers import (
    CartSerializer,
    CartItemAddSerializer,
    CartItemUpdateSerializer,
    CartItemSerializer,
)

def get_current_user_id(request):
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        secrets_to_try = [
            getattr(settings, 'JWT_SECRET_KEY', None),
            'shared-jwt-secret-key-change-in-production',
            getattr(settings, 'SECRET_KEY', None),
        ]
        for secret in filter(None, secrets_to_try):
            try:
                payload = jwt.decode(token, secret, algorithms=['HS256'])
                return payload.get('user_id')
            except jwt.PyJWTError:
                continue
    return None

def get_or_create_cart(request) -> Cart:
    user_id = get_current_user_id(request)
    session_key = request.headers.get('X-Session-Key') or request.COOKIES.get('session_key') or request.query_params.get('session_key')

    if user_id:
        cart = Cart.objects.filter(user_id=user_id, is_active=True).first()
        if not cart:
            cart = Cart.objects.create(user_id=user_id)
        return cart

    if not session_key:
        session_key = str(uuid.uuid4())

    cart = Cart.objects.filter(session_key=session_key, is_active=True).first()
    if not cart:
        cart = Cart.objects.create(session_key=session_key)
    return cart

class CartDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        cart = get_or_create_cart(request)
        serializer = CartSerializer(cart)
        return Response(serializer.data, status=status.HTTP_200_OK)

class CartItemAddView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = CartItemAddSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        cart = get_or_create_cart(request)
        variant_id = data['variant_id']
        quantity = data['quantity']

        item, created = CartItem.objects.get_or_create(
            cart=cart,
            variant_id=variant_id,
            defaults={
                'quantity': quantity,
                'product_title': data.get('product_title', ''),
                'sku': data.get('sku', ''),
                'size': data.get('size', ''),
                'color': data.get('color', ''),
                'unit_price': data.get('unit_price', 0),
                'is_selected': data.get('is_selected', True),
            }
        )
        if not created:
            item.quantity += quantity
            item.save(update_fields=['quantity', 'updated_at'])

        cart.refresh_from_db()
        return Response(CartSerializer(cart).data, status=status.HTTP_201_CREATED)

class CartItemDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def patch(self, request, item_id):
        cart = get_or_create_cart(request)
        try:
            item = CartItem.objects.get(id=item_id, cart=cart)
        except CartItem.DoesNotExist:
            return Response({"error": "Cart item not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = CartItemUpdateSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        cart.refresh_from_db()
        return Response(CartSerializer(cart).data, status=status.HTTP_200_OK)

    def delete(self, request, item_id):
        cart = get_or_create_cart(request)
        try:
            item = CartItem.objects.get(id=item_id, cart=cart)
            item.delete()
        except CartItem.DoesNotExist:
            return Response({"error": "Cart item not found."}, status=status.HTTP_404_NOT_FOUND)

        cart.refresh_from_db()
        return Response(CartSerializer(cart).data, status=status.HTTP_200_OK)
