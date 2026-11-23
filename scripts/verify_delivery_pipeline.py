import requests

GATEWAY = "http://localhost/api/v1"
INTERNAL_KEY = "ec-internal-shared-secret-key-2026"

def run_test():
    print("=================================================================")
    print("=== STARTING FULL DELIVERY & MAP PIPELINE VERIFICATION SUITE ===")
    print("=================================================================")

    # 1. Login
    print("\n--- 1. Authenticating User ---")
    login_res = requests.post(
        f"{GATEWAY}/auth/login/",
        json={"email": "sophea.chan@gmail.com", "password": "Password123!"},
        timeout=5,
    )
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["tokens"]["access"]
    user = login_res.json()["user"]
    print(f"Authenticated as {user['username']} ({user['email']})")

    # 2. Get Product Variant for Checkout
    print("\n--- 2. Fetching Catalog Variant ---")
    cat_res = requests.get(f"{GATEWAY}/catalog/products/", timeout=5)
    assert cat_res.status_code == 200
    products = cat_res.json()["results"]
    assert len(products) > 0
    p = products[0]
    detail_res = requests.get(f"{GATEWAY}/catalog/products/{p['id']}/", timeout=5)
    assert detail_res.status_code == 200
    variant = detail_res.json()["variants"][0]
    print(f"Selected Product: {p['title']} (SKU: {variant['sku']}) - ${variant['price']} USD")

    # 3. Checkout Order (Phnom Penh Express with Chamkarmon District)
    print("\n--- 3. Checking out Order with Phnom Penh Express ---")
    checkout_payload = {
        "name": "Sophea Chan",
        "email": user["email"],
        "phone": "012889900",
        "city_province": "Phnom Penh",
        "khan_district": "Chamkarmon",
        "sangkat_commune": "Boeung Keng Kang I",
        "street_address": "House #42, Street 310",
        "shipping_method": "phnom_penh_express",
        "payment_method": "KHQR",
        "items": [
            {
                "variant_id": variant["id"],
                "quantity": 1,
                "unit_price": float(variant["price"]),
                "product_title": p["title"],
                "sku": variant["sku"],
                "size": variant.get("size", "M"),
                "color": variant.get("color", "Black"),
            }
        ],
    }
    order_res = requests.post(
        f"{GATEWAY}/orders/checkout/",
        json=checkout_payload,
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert order_res.status_code == 201, f"Checkout failed: {order_res.text}"
    order = order_res.json()["order"]
    order_number = order["order_number"]
    guest_token = order.get("guest_access_token")
    print(f"Order Created: {order_number} (Total: ${order['total_usd']} USD)")
    assert order["payment_status"] == "UNPAID"
    assert order["status"] == "PENDING"

    # 4. Initiate Payment
    print("\n--- 4. Initiating KHQR Payment ---")
    pay_payload = {
        "order_id": order["id"],
        "order_number": order_number,
        "payment_method": "KHQR",
        "amount_usd": str(order["total_usd"]),
        "amount_khr": order["total_khr"],
    }
    pay_res = requests.post(f"{GATEWAY}/payments/", json=pay_payload, timeout=5)
    assert pay_res.status_code == 201, f"Payment creation failed: {pay_res.text}"
    payment = pay_res.json()
    print(f"Payment Created: ID={payment['id']}, KHQR MD5={payment['khqr_md5']}")

    # 5. Verify Payment & Trigger Auto-Fulfillment
    print("\n--- 5. Verifying KHQR Payment & Triggering Auto-Fulfillment ---")
    verify_res = requests.post(
        f"{GATEWAY}/payments/{payment['id']}/verify/",
        json={"status": "PAID"},
        timeout=5,
    )
    assert verify_res.status_code == 200, f"Payment verification failed: {verify_res.text}"
    print("Payment Verified successfully.")

    # 6. Verify Order Status & Tracking Number Auto-Provisioning
    print("\n--- 6. Verifying Order Service Auto-Fulfillment ---")
    updated_order_res = requests.get(
        f"{GATEWAY}/orders/{order_number}/",
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    assert updated_order_res.status_code == 200
    updated_order = updated_order_res.json()
    assert updated_order["payment_status"] == "PAID"
    assert updated_order["status"] == "PROCESSING"
    tracking_number = updated_order.get("tracking_number")
    assert tracking_number and tracking_number.startswith("KH-"), f"Invalid tracking number: {tracking_number}"
    print(f"Order Auto-Fulfillment Complete: Tracking Code = {tracking_number}")

    # 7. Query Public Delivery Tracking & Verify Map Coordinates
    print("\n--- 7. Querying Public Delivery Tracking Endpoint ---")
    track_res = requests.get(
        f"{GATEWAY}/orders/tracking/{tracking_number}/",
        timeout=5,
    )
    assert track_res.status_code == 200, f"Tracking endpoint failed: {track_res.text}"
    shipment = track_res.json()
    print(f"Shipment Status: {shipment['status']}")
    print(f"Courier: {shipment['courier_name']}, Driver: {shipment['driver_name']} ({shipment['driver_phone']})")
    print(f"Origin Coordinates (Hub): [{shipment['origin_lat']}, {shipment['origin_lng']}]")
    print(f"Destination Coordinates: [{shipment['dest_lat']}, {shipment['dest_lng']}]")
    
    assert shipment["status"] == "PACKED"
    assert float(shipment["origin_lat"]) == 11.5761
    assert float(shipment["origin_lng"]) == 104.8988
    # Chamkarmon coordinates
    assert float(shipment["dest_lat"]) == 11.5422
    assert float(shipment["dest_lng"]) == 104.9282
    assert len(shipment["timeline"]) >= 2
    print(f"Milestones Verified: {[ev['status'] for ev in shipment['timeline']]}")

    # 8. Test Mobile Rider Live GPS Location Streaming
    print("\n--- 8. Simulating Delivery Rider Live GPS Telemetry ---")
    rider_lat = 11.562000
    rider_lng = 104.915000
    loc_res = requests.patch(
        f"{GATEWAY}/orders/tracking/{tracking_number}/location/",
        json={
            "latitude": rider_lat,
            "longitude": rider_lng,
            "heading": 135.0,
            "speed": 28.5,
        },
        timeout=5,
    )
    assert loc_res.status_code == 200, f"Rider location update failed: {loc_res.text}"
    updated_shipment = loc_res.json()
    assert updated_shipment["status"] == "OUT_FOR_DELIVERY"
    assert float(updated_shipment["current_lat"]) == rider_lat
    assert float(updated_shipment["current_lng"]) == rider_lng
    assert updated_shipment["speed"] == 28.5
    print(f"Rider GPS Streamed: Current Pos=[{rider_lat}, {rider_lng}], Status={updated_shipment['status']}")

    # Check that order status also reflected SHIPPED / Out for Delivery
    chk_order = requests.get(
        f"{GATEWAY}/orders/{order_number}/",
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    ).json()
    assert chk_order["status"] == "SHIPPED"
    print("Order status automatically synchronized to 'SHIPPED'")

    # 9. Test Provincial Geocoding (Virak Buntham Logistics - Siem Reap)
    print("\n--- 9. Testing Provincial Order Geocoding (Siem Reap) ---")
    p2 = products[1] if len(products) > 1 else products[0]
    p2_detail = requests.get(f"{GATEWAY}/catalog/products/{p2['id']}/", timeout=5).json()
    variant_2 = p2_detail["variants"][0]

    prov_res = requests.post(
        f"{GATEWAY}/orders/checkout/",
        json={
            "name": "Bopha Rath",
            "email": "bopha@siemreap.com",
            "phone": "098112233",
            "city_province": "Siem Reap",
            "street_address": "Street 08, Wat Bo Village",
            "shipping_method": "provincial",
            "payment_method": "KHQR",
            "items": [
                {
                    "variant_id": variant_2["id"],
                    "quantity": 1,
                    "unit_price": float(variant_2["price"]),
                    "product_title": p2["title"],
                    "sku": variant_2["sku"],
                }
            ],
        },
        timeout=5,
    )
    assert prov_res.status_code == 201, f"Prov checkout failed: {prov_res.text}"
    prov_order = prov_res.json()["order"]
    prov_pay_res = requests.post(
        f"{GATEWAY}/payments/",
        json={
            "order_id": prov_order["id"],
            "order_number": prov_order["order_number"],
            "payment_method": "KHQR",
            "amount_usd": str(prov_order["total_usd"]),
            "amount_khr": prov_order["total_khr"],
        },
        timeout=5,
    )
    assert prov_pay_res.status_code == 201
    prov_pay = prov_pay_res.json()
    requests.post(
        f"{GATEWAY}/payments/{prov_pay['id']}/verify/",
        json={"status": "PAID"},
        timeout=5,
    )
    prov_track = requests.get(
        f"{GATEWAY}/orders/{prov_order['order_number']}/",
        headers={"X-Order-Token": prov_order["guest_access_token"]},
        timeout=5,
    ).json()
    prov_shipment = requests.get(
        f"{GATEWAY}/orders/tracking/{prov_track['tracking_number']}/",
        timeout=5,
    ).json()

    print(f"Provincial Shipment: {prov_shipment['tracking_number']}")
    print(f"Courier: {prov_shipment['courier_name']}")
    print(f"Siem Reap Coordinates: [{prov_shipment['dest_lat']}, {prov_shipment['dest_lng']}]")
    assert "Virak Buntham" in prov_shipment["courier_name"]
    assert float(prov_shipment["dest_lat"]) == 13.3633
    assert float(prov_shipment["dest_lng"]) == 103.8564
    print("Provincial Geocoding & Logistics Routing verified.")

    print("\n=================================================================")
    print(">>> FULL DELIVERY PIPELINE VERIFICATION: 100% SUCCESSFUL <<<")
    print("=================================================================")

if __name__ == "__main__":
    run_test()
