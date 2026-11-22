from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.orders.models import ShippingMethod

class Command(BaseCommand):
    help = 'Seeds shipping methods for Cambodia delivery.'

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("--- Starting Order Service Shipping Seeding ---")

        shipping_methods = [
            {
                'code': 'phnom_penh_express',
                'name': 'Phnom Penh Express (Same-Day Rider)',
                'rate_usd': Decimal('2.50'),
                'estimated_delivery_days': '2-4 hours',
            },
            {
                'code': 'phnom_penh_standard',
                'name': 'Phnom Penh Standard (Next Day Delivery - Free)',
                'rate_usd': Decimal('0.00'),
                'estimated_delivery_days': '24 hours',
            },
            {
                'code': 'provincial',
                'name': 'Cambodia Provincial Delivery (Virak Buntham / J&T)',
                'rate_usd': Decimal('3.00'),
                'estimated_delivery_days': '1-3 business days',
            },
        ]

        for sm_data in shipping_methods:
            sm, created = ShippingMethod.objects.update_or_create(
                code=sm_data['code'],
                defaults=sm_data
            )
            status = "Created" if created else "Updated"
            self.stdout.write(f"ShippingMethod: {sm.name} [{status}]")

        self.stdout.write(self.style.SUCCESS("Successfully seeded shipping methods!"))
