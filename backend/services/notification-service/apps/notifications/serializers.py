from rest_framework import serializers
from apps.notifications.models import Notification

class NotificationInputSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(required=False, allow_null=True, default=None)
    order_id = serializers.UUIDField(required=False, allow_null=True, default=None)
    channel = serializers.ChoiceField(choices=Notification.CHANNEL_CHOICES, default='TELEGRAM')
    recipient = serializers.CharField(max_length=255)
    subject = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    message = serializers.CharField()

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id',
            'user_id',
            'order_id',
            'channel',
            'recipient',
            'subject',
            'message',
            'status',
            'error_message',
            'retry_count',
            'sent_at',
            'created_at',
        ]
