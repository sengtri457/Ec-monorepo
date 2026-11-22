from rest_framework import serializers
from apps.payments.models import Payment, PaymentTransaction

class CreatePaymentSerializer(serializers.Serializer):
    order_id = serializers.UUIDField()
    order_number = serializers.CharField(required=False, allow_blank=True, default='')
    payment_method = serializers.ChoiceField(choices=Payment.PAYMENT_METHOD_CHOICES, default='KHQR')
    amount_usd = serializers.DecimalField(max_digits=10, decimal_places=2)
    amount_khr = serializers.IntegerField(required=False, default=0)

class PaymentDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'id',
            'order_id',
            'order_number',
            'payment_method',
            'amount_usd',
            'amount_khr',
            'status',
            'transaction_reference',
            'khqr_payload',
            'khqr_md5',
            'paid_at',
            'created_at',
        ]

class PaymentTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentTransaction
        fields = ['id', 'action', 'raw_data', 'created_at']
