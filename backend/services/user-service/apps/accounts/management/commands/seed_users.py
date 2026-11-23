from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.accounts.models import CustomerAddress

User = get_user_model()

DEMO_ACCOUNTS = [
    {
        "email": "admin@clothes.ec",
        "username": "admin",
        "first_name": "System",
        "last_name": "Admin",
        "phone": "012000111",
        "telegram": "@clothes_admin",
        "password": "AdminPassword123!",
        "is_staff": True,
        "is_superuser": True,
        "address": {
            "city_province": "Phnom Penh",
            "khan_district": "Daun Penh",
            "sangkat_commune": "Phsar Thmey I",
            "street_address": "Central Office, Norodom Blvd",
            "landmark": "Near Central Market",
        }
    },
    {
        "email": "sophea.chan@gmail.com",
        "username": "sophea_chan",
        "first_name": "Sophea",
        "last_name": "Chan",
        "phone": "012889977",
        "telegram": "@sopheachan",
        "password": "Password123!",
        "address": {
            "city_province": "Phnom Penh",
            "khan_district": "Chamkarmon",
            "sangkat_commune": "Boeung Keng Kang 1 (BKK1)",
            "street_address": "House #42, Street 310",
            "landmark": "Near Brown Coffee BKK57",
        }
    },
    {
        "email": "vireak.roth@outlook.com",
        "username": "vireak_roth",
        "first_name": "Vireak",
        "last_name": "Roth",
        "phone": "098554433",
        "telegram": "@vireak_sr",
        "password": "Password123!",
        "address": {
            "city_province": "Siem Reap",
            "khan_district": "Krong Siem Reap",
            "sangkat_commune": "Sala Kamreuk",
            "street_address": "St. 07, Wat Bo Village",
            "landmark": "Behind Wat Bo Temple",
        }
    }
]

class Command(BaseCommand):
    help = "Seeds standard demo user accounts and default addresses."

    def handle(self, *args, **options):
        self.stdout.write("Seeding demo accounts into user_db...")
        for data in DEMO_ACCOUNTS:
            addr_data = data.pop("address")
            password = data.pop("password")
            user, created = User.objects.get_or_create(
                email=data["email"],
                defaults={
                    "username": data["username"],
                    "first_name": data["first_name"],
                    "last_name": data["last_name"],
                    "phone": data["phone"],
                    "telegram": data["telegram"],
                }
            )
            is_staff = data.get("is_staff", False)
            is_superuser = data.get("is_superuser", False)
            user.is_staff = is_staff
            user.is_superuser = is_superuser
            user.set_password(password)
            user.save()

            CustomerAddress.objects.update_or_create(
                user=user,
                is_default=True,
                defaults={
                    "full_name": f"{user.first_name} {user.last_name}",
                    "phone": user.phone,
                    "telegram": user.telegram,
                    "city_province": addr_data["city_province"],
                    "khan_district": addr_data["khan_district"],
                    "sangkat_commune": addr_data["sangkat_commune"],
                    "street_address": addr_data["street_address"],
                    "landmark": addr_data["landmark"],
                }
            )
            action = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(f"{action} demo user: {user.email}"))
        self.stdout.write(self.style.SUCCESS("Demo users successfully seeded!"))
