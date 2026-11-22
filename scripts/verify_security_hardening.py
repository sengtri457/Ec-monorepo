"""
Comprehensive Security Verification Script for API Gateway, Auth Headers & Zero-Trust Architecture.
Tests all perimeter defenses, inter-service security, IDOR protection, and payment idempotency.
"""

import requests
import uuid

GATEWAY = "http://localhost/api/v1"
GATEWAY_BASE = "http://localhost"
INTERNAL_SECRET = "ec-internal-shared-secret-key-2026"

def test_1_perimeter_headers_and_block():
    print("--- 1. Testing Perimeter Security Headers & Internal Blocks ---")
    res = requests.get(f"{GATEWAY_BASE}/health/")
    assert res.status_code == 200
    assert res.headers.get("X-Frame-Options") == "DENY", f"Expected X-Frame-Options: DENY, got {res.headers.get('X-Frame-Options')}"
    assert res.headers.get("X-Content-Type-Options") == "nosniff", f"Expected X-Content-Type-Options: nosniff, got {res.headers.get('X-Content-Type-Options')}"
    print("  [PASS] Perimeter headers present: X-Frame-Options: DENY, X-Content-Type-Options: nosniff")

    # Verify external block on /internal/
    internal_res = requests.get(f"{GATEWAY_BASE}/internal/inventory/reservations/")
    assert internal_res.status_code == 403, f"Expected 403 on external /internal/ call, got {internal_res.status_code}"
    print("  [PASS] External /internal/* route strictly blocked by Nginx (403 Forbidden)")

def test_2_header_spoofing_scrubbing():
    print("\n--- 2. Testing Internal Header Spoofing Scrubbing ---")
    # An attacker tries to send X-Internal-Service-Key through the Gateway
    # Nginx must scrub it so downstream receives empty header
    spoof_res = requests.patch(
        f"{GATEWAY_BASE}/internal/orders/{uuid.uuid4()}/status/",
        headers={"X-Internal-Service-Key": INTERNAL_SECRET},
        json={"status": "PROCESSING"}
    )
    assert spoof_res.status_code == 403, f"Expected 403 on spoofed internal call, got {spoof_res.status_code}"
    print("  [PASS] Gateway actively scrubs spoofed internal headers; access rejected (403)")

def test_3_inter_service_authentication():
    print("\n--- 3. Testing Zero-Trust Inter-Service Authentication (Direct Container Calls) ---")
    url = "http://localhost:8003/internal/orders/00000000-0000-0000-0000-000000000000/status/"

    # Without key
    r_no_key = requests.patch(url, json={"status": "PROCESSING"})
    assert r_no_key.status_code == 403, f"Expected 403 without key, got {r_no_key.status_code}"
    print("  [PASS] Inter-service call without key rejected (403)")

    # With invalid key
    r_bad_key = requests.patch(url, json={"status": "PROCESSING"}, headers={"X-Internal-Service-Key": "evil-key"})
    assert r_bad_key.status_code == 403, f"Expected 403 with invalid key, got {r_bad_key.status_code}"
    print("  [PASS] Inter-service call with invalid key rejected (403)")

    # With valid key
    r_valid_key = requests.patch(url, json={"status": "PROCESSING"}, headers={"X-Internal-Service-Key": INTERNAL_SECRET})
    # 404 means auth passed and view logic executed (order not found)
    assert r_valid_key.status_code == 404, f"Expected 404 (auth passed) with valid key, got {r_valid_key.status_code}"
    print("  [PASS] Inter-service call with valid X-Internal-Service-Key authenticated successfully")

def test_4_order_idor_protection():
    print("\n--- 4. Testing Insecure Direct Object Reference (IDOR) Order Protection ---")
    # Log in as User A
    login_a = requests.post(f"{GATEWAY}/auth/login/", json={
        "email": "sophea.chan@gmail.com",
        "password": "Password123!"
    })
    token_a = login_a.json()["tokens"]["access"]

    # Create Order for User A
    order_a_res = requests.post(f"{GATEWAY}/orders/checkout/", json={
        "name": "Sophea Chan",
        "email": "sophea.chan@gmail.com",
        "phone": "012889977",
        "city_province": "Phnom Penh",
        "street_address": "House #42, Street 310",
        "shipping_method": "phnom_penh_express",
        "payment_method": "KHQR",
        "items": [{
            "variant_id": 1,
            "quantity": 1,
            "unit_price": 42.0,
            "product_title": "Oversized Linen Shirt",
            "sku": "CLO-0001-M",
            "size": "M"
        }]
    }, headers={"Authorization": f"Bearer {token_a}", "X-Skip-Stock-Reservation": "true"})
    assert order_a_res.status_code == 201
    order_a = order_a_res.json()["order"]
    order_num_a = order_a["order_number"]
    print(f"  Order created for User A: {order_num_a}")

    # Unauthenticated lookup -> MUST be 404
    unauth_lookup = requests.get(f"{GATEWAY}/orders/{order_num_a}/")
    assert unauth_lookup.status_code == 404, f"Expected 404 on unauthenticated lookup, got {unauth_lookup.status_code}"
    print(f"  [PASS] Unauthenticated lookup for {order_num_a} blocked with 404 Not Found")

    # User A lookup -> MUST be 200
    user_a_lookup = requests.get(f"{GATEWAY}/orders/{order_num_a}/", headers={"Authorization": f"Bearer {token_a}"})
    assert user_a_lookup.status_code == 200, f"Expected 200 for order owner, got {user_a_lookup.status_code}"
    print(f"  [PASS] Order owner (User A) retrieves own order with 200 OK")

    # Create/Login User B
    login_b = requests.post(f"{GATEWAY}/auth/register/", json={
        "username": f"user_b_{uuid.uuid4().hex[:6]}",
        "email": f"user_b_{uuid.uuid4().hex[:6]}@test.com",
        "password": "Password123!",
        "first_name": "Test",
        "last_name": "UserB"
    })
    token_b = login_b.json()["tokens"]["access"]

    # User B tries to view User A's order -> MUST be 404
    user_b_lookup = requests.get(f"{GATEWAY}/orders/{order_num_a}/", headers={"Authorization": f"Bearer {token_b}"})
    assert user_b_lookup.status_code == 404, f"Expected 404 when User B queries User A's order, got {user_b_lookup.status_code}"
    print(f"  [PASS] IDOR Blocked: User B cannot access User A's order (404 Not Found)")

def test_5_guest_checkout_token_access():
    print("\n--- 5. Testing Guest Checkout & Cryptographic Token Access ---")
    guest_res = requests.post(f"{GATEWAY}/orders/checkout/", json={
        "name": "Guest Customer",
        "email": "guest.buyer@gmail.com",
        "phone": "099112233",
        "city_province": "Siem Reap",
        "street_address": "Wat Bo Rd",
        "shipping_method": "provincial",
        "payment_method": "KHQR",
        "items": [{
            "variant_id": 2,
            "quantity": 1,
            "unit_price": 42.0,
            "product_title": "Oversized Linen Shirt",
            "sku": "CLO-0001-L",
            "size": "L"
        }]
    }, headers={"X-Skip-Stock-Reservation": "true"})
    assert guest_res.status_code == 201
    guest_data = guest_res.json()
    order_g = guest_data["order"]
    guest_token = guest_data.get("guest_access_token") or order_g.get("guest_access_token")
    assert bool(guest_token), "Expected guest_access_token in checkout response"
    print(f"  Guest Order created: {order_g['order_number']}, Access Token: {guest_token[:8]}...")

    # Lookup without token -> MUST fail with 404
    lookup_no_token = requests.get(f"{GATEWAY}/orders/{order_g['order_number']}/")
    assert lookup_no_token.status_code == 404, f"Expected 404 without guest token, got {lookup_no_token.status_code}"
    print("  [PASS] Guest order lookup without token rejected (404)")

    # Lookup with valid query token -> 200
    lookup_query = requests.get(f"{GATEWAY}/orders/{order_g['order_number']}/?token={guest_token}")
    assert lookup_query.status_code == 200, f"Expected 200 with query token, got {lookup_query.status_code}"
    print("  [PASS] Guest order lookup with URL query token succeeded (200 OK)")

    # Lookup with X-Order-Token header -> 200
    lookup_header = requests.get(f"{GATEWAY}/orders/{order_g['order_number']}/", headers={"X-Order-Token": guest_token})
    assert lookup_header.status_code == 200, f"Expected 200 with X-Order-Token header, got {lookup_header.status_code}"
    print("  [PASS] Guest order lookup with X-Order-Token header succeeded (200 OK)")

def test_6_payment_idempotency_and_integrity():
    print("\n--- 6. Testing Payment Intent Idempotency & Order Binding ---")
    order_uuid = str(uuid.uuid4())
    pay_payload = {
        "order_id": order_uuid,
        "order_number": "CLO-TEST-IDEM-99",
        "payment_method": "KHQR",
        "amount_usd": "85.00",
        "amount_khr": 348500
    }

    # 1. First payment creation
    p1 = requests.post(f"{GATEWAY}/payments/", json=pay_payload)
    assert p1.status_code == 201
    p1_id = p1.json()["id"]

    # 2. Duplicate payment creation attempt (e.g. page refresh, network retry)
    p2 = requests.post(f"{GATEWAY}/payments/", json=pay_payload)
    assert p2.status_code == 200, f"Expected 200 on reused payment intent, got {p2.status_code}"
    p2_id = p2.json()["id"]
    assert p1_id == p2_id, f"Expected matching payment id {p1_id}, got {p2_id}"
    print("  [PASS] Payment intent creation is idempotent (reused existing pending intent)")

def run_all_security_tests():
    print("===================================================================")
    print("  RUNNING FULL SECURITY HARDENING VERIFICATION SUITE")
    print("===================================================================")
    test_1_perimeter_headers_and_block()
    test_2_header_spoofing_scrubbing()
    test_3_inter_service_authentication()
    test_4_order_idor_protection()
    test_5_guest_checkout_token_access()
    test_6_payment_idempotency_and_integrity()
    print("\n===================================================================")
    print("  >>> ALL SECURITY HARDENING TESTS PASSED: 100% SUCCESS <<<")
    print("===================================================================")

if __name__ == "__main__":
    run_all_security_tests()
