from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from apps.inventory.models import StockReservation, StockMovement
from apps.catalog.models import ProductVariant

class Command(BaseCommand):
    help = "Releases expired pending stock reservations back into available inventory."

    def handle(self, *args, **options):
        now = timezone.now()
        expired = StockReservation.objects.filter(
            status='PENDING',
            expires_at__lt=now
        )
        total = expired.count()
        if total == 0:
            self.stdout.write(self.style.SUCCESS("No expired stock reservations to reap."))
            return

        reaped_count = 0
        for reservation in expired:
            with transaction.atomic():
                for item in reservation.items.select_related('variant').all():
                    variant = ProductVariant.objects.select_for_update().get(id=item.variant_id)
                    variant.stock += item.quantity
                    variant.save(update_fields=['stock', 'updated_at'])

                    StockMovement.objects.create(
                        variant=variant,
                        quantity_change=item.quantity,
                        movement_type='RELEASE',
                        reference_id=str(reservation.id),
                        balance_after=variant.stock,
                        notes=f"Auto-released expired reservation {reservation.id}"
                    )
                reservation.status = 'EXPIRED'
                reservation.save(update_fields=['status', 'updated_at'])
                reaped_count += 1

        self.stdout.write(
            self.style.SUCCESS(f"Successfully reaped and restored stock for {reaped_count} expired reservation(s).")
        )
