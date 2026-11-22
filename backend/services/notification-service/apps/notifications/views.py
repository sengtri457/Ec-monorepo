from django.utils import timezone
from django.db import connection
from rest_framework import status, permissions, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.notifications.models import Notification
from apps.notifications.serializers import (
    NotificationInputSerializer,
    NotificationSerializer,
)

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
            "service": "notification-service",
            "status": "healthy" if db_status == "healthy" else "degraded",
            "database": db_status,
            "timestamp": timezone.now().isoformat()
        }, status=status.HTTP_200_OK if db_status == "healthy" else status.HTTP_503_SERVICE_UNAVAILABLE)

from apps.core.permissions import IsInternalService

class CreateNotificationView(APIView):
    permission_classes = [IsInternalService]

    def post(self, request):
        serializer = NotificationInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        notification = Notification.objects.create(
            user_id=data.get('user_id'),
            order_id=data.get('order_id'),
            channel=data.get('channel', 'TELEGRAM'),
            recipient=data['recipient'],
            subject=data.get('subject', ''),
            message=data['message'],
            status='PENDING'
        )

        # Dispatch notification (simulated / pluggable provider)
        try:
            # Here we could call Telegram API or send mail
            notification.status = 'SENT'
            notification.sent_at = timezone.now()
            notification.save(update_fields=['status', 'sent_at'])
        except Exception as e:
            notification.status = 'FAILED'
            notification.error_message = str(e)
            notification.save(update_fields=['status', 'error_message'])

        return Response(NotificationSerializer(notification).data, status=status.HTTP_201_CREATED)

class NotificationListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        qs = Notification.objects.all()
        user_id = self.request.query_params.get('user_id')
        if user_id:
            qs = qs.filter(user_id=user_id)
        order_id = self.request.query_params.get('order_id')
        if order_id:
            qs = qs.filter(order_id=order_id)
        return qs

class NotificationDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    lookup_field = 'id'
