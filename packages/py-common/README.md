# @ec/py-common

Shared Python package for EC e-commerce microservices.

## Modules

- `py_common.auth`: JWT token generation, verification, and decoding.
- `py_common.khqr`: EMVCo compliant Dynamic NBC Bakong KHQR generator, CRC-16 calculation, and bank mapping.
- `py_common.permissions`: Inter-service secret authentication (`IsInternalService`).
- `py_common.responses`: Standardized DRF JSON responses (`api_success`, `api_error`).
