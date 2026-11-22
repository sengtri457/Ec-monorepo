from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='guest_access_token',
            field=models.CharField(blank=True, db_index=True, max_length=64),
        ),
    ]
