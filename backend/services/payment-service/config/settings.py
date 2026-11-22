"""
Django settings for Payment Service.
"""
import os
from pathlib import Path
from decimal import Decimal

BASE_DIR = Path(__file__).resolve().parent.parent

try:
    from dotenv import load_dotenv
    for env_candidate in [
        BASE_DIR / '.env',
        BASE_DIR / '.env.local',
        BASE_DIR.parent / '.env',
        BASE_DIR.parent.parent / '.env',
    ]:
        if env_candidate.exists():
            load_dotenv(env_candidate, override=True)
            break
except Exception:
    pass

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'payment-service-insecure-secret-key-change-in-prod')
DEBUG = os.environ.get('DJANGO_DEBUG', 'True').lower() in ('true', '1', 'yes')

ALLOWED_HOSTS = [h.strip() for h in os.environ.get('DJANGO_ALLOWED_HOSTS', '*').split(',') if h.strip()]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party
    'corsheaders',
    'rest_framework',

    # Local Domain Apps
    'apps.core.apps.CoreConfig',
    'apps.payments.apps.PaymentsConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database Configuration (payment_db)
DB_ENGINE = os.environ.get('DB_ENGINE', '')
DB_NAME = os.environ.get('DB_NAME', 'payment_db')
DB_USER = os.environ.get('DB_USER', '')
DB_PASSWORD = os.environ.get('DB_PASSWORD', '')
DB_HOST = os.environ.get('DB_HOST', '')
DB_PORT = os.environ.get('DB_PORT', '5432')

if DB_ENGINE == 'django.db.backends.postgresql' or (DB_HOST and DB_USER):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': DB_NAME,
            'USER': DB_USER,
            'PASSWORD': DB_PASSWORD,
            'HOST': DB_HOST,
            'PORT': DB_PORT,
            'ATOMIC_REQUESTS': True,
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db_payment.sqlite3',
            'ATOMIC_REQUESTS': True,
        }
    }

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Phnom_Penh'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# Bakong KHQR Settings
BAKONG_ACCOUNT_ID = os.environ.get('BAKONG_ACCOUNT_ID', 'clothes@abaa')
BAKONG_MERCHANT_NAME = os.environ.get('BAKONG_MERCHANT_NAME', 'Clothes Apparel Co')
BAKONG_MERCHANT_CITY = os.environ.get('BAKONG_MERCHANT_CITY', 'Phnom Penh')
BAKONG_PHONE_NUMBER = os.environ.get('BAKONG_PHONE_NUMBER', '')
BAKONG_API_URL = os.environ.get('BAKONG_API_URL', 'https://api-bakong.nbc.gov.kh/v1/')
BAKONG_API_TOKEN = os.environ.get('BAKONG_API_TOKEN', '')
