import os
import requests
from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import connection
from django.utils import timezone
from apps.accounts.models import User, CustomerAddress
from apps.accounts.serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    RefreshTokenSerializer,
    GoogleAuthSerializer,
    UserDetailSerializer,
    CustomerAddressSerializer,
)
from apps.accounts.authentication import generate_tokens_for_user

class HealthCheckView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        db_status = "healthy"
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
        except Exception as e:
            db_status = f"unhealthy: {str(e)}"

        return Response({
            "service": "accounts",
            "status": "healthy" if db_status == "healthy" else "degraded",
            "database": db_status,
            "timestamp": timezone.now().isoformat()
        }, status=status.HTTP_200_OK if db_status == "healthy" else status.HTTP_503_SERVICE_UNAVAILABLE)

class RegisterView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = UserRegistrationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        tokens = generate_tokens_for_user(user)
        user_data = UserDetailSerializer(user).data
        return Response({
            "message": "User registered successfully.",
            "user": user_data,
            "tokens": tokens
        }, status=status.HTTP_201_CREATED)

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        tokens = generate_tokens_for_user(user)
        user_data = UserDetailSerializer(user).data
        return Response({
            "message": "Login successful.",
            "user": user_data,
            "tokens": tokens
        }, status=status.HTTP_200_OK)

class GoogleAuthView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        code = serializer.validated_data.get('code')
        redirect_uri = serializer.validated_data.get('redirect_uri') or 'http://localhost:3000/auth/callback/google'
        id_token_str = serializer.validated_data.get('id_token')
        email = (serializer.validated_data.get('email') or '').strip().lower()
        name = (serializer.validated_data.get('name') or '').strip()

        from django.conf import settings
        client_id = (os.environ.get('GOOGLE_CLIENT_ID') or getattr(settings, 'GOOGLE_CLIENT_ID', '')).strip()
        client_secret = (os.environ.get('GOOGLE_CLIENT_SECRET') or getattr(settings, 'GOOGLE_CLIENT_SECRET', '')).strip()

        # If authorization code is provided, exchange it with Google using client credentials
        if code:
            if not client_id or not client_secret:
                return Response(
                    {"error": "Google OAuth is not properly configured on the server (missing client credentials)."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            try:
                token_resp = requests.post(
                    'https://oauth2.googleapis.com/token',
                    data={
                        'code': code,
                        'client_id': client_id,
                        'client_secret': client_secret,
                        'redirect_uri': redirect_uri,
                        'grant_type': 'authorization_code',
                    },
                    timeout=10
                )
            except Exception as e:
                print(f"[GoogleAuthView] Connection error to Google OAuth: {e}")
                return Response(
                    {"error": f"Failed to contact Google OAuth servers: {str(e)}"},
                    status=status.HTTP_502_BAD_GATEWAY
                )

            if not token_resp.ok:
                err_data = token_resp.json() if "application/json" in token_resp.headers.get("Content-Type", "") else token_resp.text
                err_desc = err_data.get("error_description") or err_data.get("error") if isinstance(err_data, dict) else str(err_data)
                print(f"[GoogleAuthView] Google token exchange rejected ({token_resp.status_code}): {err_data}")
                return Response(
                    {"error": f"Google authorization failed: {err_desc}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            token_data = token_resp.json()
            access_token = token_data.get('access_token')
            if not access_token:
                return Response(
                    {"error": "No access token received from Google."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                userinfo_resp = requests.get(
                    'https://www.googleapis.com/oauth2/v3/userinfo',
                    headers={'Authorization': f'Bearer {access_token}'},
                    timeout=10
                )
            except Exception as e:
                print(f"[GoogleAuthView] Connection error to Google UserInfo: {e}")
                return Response(
                    {"error": f"Failed to fetch user profile from Google: {str(e)}"},
                    status=status.HTTP_502_BAD_GATEWAY
                )

            if not userinfo_resp.ok:
                print(f"[GoogleAuthView] Google userinfo rejected ({userinfo_resp.status_code}): {userinfo_resp.text}")
                return Response(
                    {"error": "Failed to fetch user profile from Google."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            userinfo = userinfo_resp.json()
            email = (userinfo.get('email') or '').strip().lower()
            name = (userinfo.get('name') or f"{userinfo.get('given_name', '')} {userinfo.get('family_name', '')}").strip()

        elif id_token_str:
            try:
                verify_resp = requests.get(
                    f'https://oauth2.googleapis.com/tokeninfo?id_token={id_token_str}',
                    timeout=10
                )
                if verify_resp.ok:
                    info = verify_resp.json()
                    email = (info.get('email') or '').strip().lower()
                    name = (info.get('name') or '').strip()
                else:
                    return Response(
                        {"error": "Invalid Google ID token."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except Exception as e:
                return Response(
                    {"error": f"Failed to verify Google ID token: {str(e)}"},
                    status=status.HTTP_502_BAD_GATEWAY
                )

        if not email:
            return Response(
                {"error": "No verified email address could be retrieved from Google."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not name:
            name = email.split('@')[0]

        name_parts = name.split()
        first_name = name_parts[0] if name_parts else email.split('@')[0]
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

        user = User.objects.filter(email=email).first()
        is_new = False
        if not user:
            username = email.split('@')[0].replace('.', '_').replace('-', '_')
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}_{counter}"
                counter += 1

            user = User.objects.create(
                email=email,
                username=username,
                first_name=first_name,
                last_name=last_name,
                is_active=True
            )
            user.set_unusable_password()
            user.save()
            is_new = True
        else:
            if not user.first_name and first_name:
                user.first_name = first_name
            if not user.last_name and last_name:
                user.last_name = last_name
            user.save()

        tokens = generate_tokens_for_user(user)
        user_data = UserDetailSerializer(user).data
        return Response({
            "message": "Google authentication successful.",
            "is_new": is_new,
            "user": user_data,
            "tokens": tokens
        }, status=status.HTTP_201_CREATED if is_new else status.HTTP_200_OK)

class RefreshTokenView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RefreshTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        tokens = generate_tokens_for_user(user)
        return Response({
            "access": tokens['access']
        }, status=status.HTTP_200_OK)

class CurrentUserView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserDetailSerializer

    def get_object(self):
        return self.request.user

class UserDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    queryset = User.objects.all()
    serializer_class = UserDetailSerializer
    lookup_field = 'id'

class AddressListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CustomerAddressSerializer

    def get_queryset(self):
        return CustomerAddress.objects.filter(user=self.request.user).order_by('-is_default', '-created_at')

class AddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CustomerAddressSerializer

    def get_queryset(self):
        return CustomerAddress.objects.filter(user=self.request.user)
