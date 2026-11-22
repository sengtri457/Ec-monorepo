from django.db import models
from apps.core.models import TimeStampedModel, UUIDModel

class Notification(TimeStampedModel, UUIDModel):
    CHANNEL_CHOICES = (
        ('EMAIL', 'Email'),
        ('TELEGRAM', 'Telegram'),
    )

    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('SENT', 'Sent'),
        ('FAILED', 'Failed'),
    )

    user_id = models.IntegerField(null=True, blank=True, db_index=True)
    order_id = models.UUIDField(null=True, blank=True, db_index=True)
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES, default='TELEGRAM')
    recipient = models.CharField(max_length=255)
    subject = models.CharField(max_length=255, blank=True)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', db_index=True)
    error_message = models.TextField(blank=True)
    retry_count = models.PositiveIntegerField(default=0)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user_id', 'status']),
            models.Index(fields=['order_id']),
        ]

    def __str__(self):
        return f"{self.channel} Notification to {self.recipient} ({self.status})"
