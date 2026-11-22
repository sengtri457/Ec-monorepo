import urllib.request
import json

def test_api():
    print("=== Testing Catalog through API Gateway ===")
    req = urllib.request.Request('http://localhost/api/v1/catalog/products/')
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print(f"Total Products: {data.get('count')}")
        first_summary = data['results'][0]
        print(f"Sample Product Summary: ID={first_summary['id']}, Title={first_summary['title']}, Price=${first_summary['price']}")

    # Get product detail
    detail_req = urllib.request.Request(f"http://localhost/api/v1/catalog/products/{first_summary['slug']}/")
    with urllib.request.urlopen(detail_req) as resp:
        detail_data = json.loads(resp.read().decode('utf-8'))
        variants = detail_data.get('variants', [])
        print(f"Product Detail: {detail_data['title']} | Variants count: {len(variants)}")
        first_variant = variants[0] if variants else None
        if first_variant:
            print(f"Sample Variant: ID={first_variant['id']}, SKU={first_variant['sku']}, Stock={first_variant['stock']}")

    import time
    ts = int(time.time())
    print("\n=== Testing User Registration and Login ===")
    reg_req = urllib.request.Request(
        'http://localhost/api/v1/auth/register/',
        data=json.dumps({
            'username': f'john_{ts}',
            'email': f'john_{ts}@example.com',
            'password': 'SecurePassword123!',
            'first_name': 'John',
            'last_name': 'Doe'
        }).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(reg_req) as resp:
        reg_data = json.loads(resp.read().decode('utf-8'))
        access_token = reg_data['tokens']['access']
        user_id = reg_data['user']['id']
        print(f"Registered User ID: {user_id}")
        print(f"Access Token: {access_token[:25]}...")

    print("\n=== Testing User Profile via JWT ===")
    profile_req = urllib.request.Request(
        'http://localhost/api/v1/users/me/',
        headers={'Authorization': f'Bearer {access_token}'}
    )
    with urllib.request.urlopen(profile_req) as resp:
        profile_data = json.loads(resp.read().decode('utf-8'))
        print(f"Profile fetched successfully: {profile_data['username']} ({profile_data['email']})")

    print("\n=== Testing Customer Address Creation ===")
    addr_req = urllib.request.Request(
        'http://localhost/api/v1/addresses/',
        data=json.dumps({
            'full_name': 'John Doe',
            'phone': '+85512345678',
            'city_province': 'Phnom Penh',
            'street_address': 'House #12, Street 310, BKK1',
            'is_default': True
        }).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {access_token}'
        },
        method='POST'
    )
    with urllib.request.urlopen(addr_req) as resp:
        addr_data = json.loads(resp.read().decode('utf-8'))
        print(f"Address created: ID={addr_data['id']}, {addr_data['street_address']}, {addr_data['city_province']}")

    print("\n=== Testing Cart and Checkout via Gateway ===")
    if first_variant:
        cart_req = urllib.request.Request(
            'http://localhost/api/v1/cart/items/',
            data=json.dumps({
                'variant_id': first_variant['id'],
                'quantity': 2,
                'product_title': detail_data['title'],
                'sku': first_variant['sku'],
                'size': first_variant['size'],
                'color': first_variant.get('color', ''),
                'unit_price': str(first_variant['price'])
            }).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {access_token}'
            },
            method='POST'
        )
        with urllib.request.urlopen(cart_req) as resp:
            cart_resp = json.loads(resp.read().decode('utf-8'))
            print(f"Added item to cart. Total Cart Items: {cart_resp['total_items']}, Subtotal: ${cart_resp['subtotal']}")

        # Checkout
        checkout_req = urllib.request.Request(
            'http://localhost/api/v1/orders/checkout/',
            data=json.dumps({
                'name': 'John Doe',
                'email': f'john_{ts}@example.com',
                'phone': '+85512345678',
                'city_province': 'Phnom Penh',
                'street_address': 'House #12, Street 310, BKK1',
                'shipping_method': 'phnom_penh_express',
                'payment_method': 'KHQR'
            }).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {access_token}'
            },
            method='POST'
        )
        with urllib.request.urlopen(checkout_req) as resp:
            checkout_result = json.loads(resp.read().decode('utf-8'))
            order_data = checkout_result['order']
            print(f"Order Created Successfully!")
            print(f"Order Number: {order_data.get('order_number')}")
            print(f"Order Total: ${order_data.get('total_usd')}")
            print(f"Stock Reservation ID: {order_data.get('stock_reservation_id')}")
            print(f"Order Status: {order_data.get('status')}")

            # Now initiate Payment for this order
            order_id = order_data['id']
            pay_req = urllib.request.Request(
                'http://localhost/api/v1/payments/',
                data=json.dumps({
                    'order_id': order_id,
                    'order_number': order_data.get('order_number', ''),
                    'amount_usd': str(order_data.get('total_usd')),
                    'payment_method': 'KHQR'
                }).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            with urllib.request.urlopen(pay_req) as pay_resp:
                payment_info = json.loads(pay_resp.read().decode('utf-8'))
                payment_id = payment_info['id']
                print(f"\n=== Payment Created ===")
                print(f"Payment ID: {payment_id}")
                print(f"Status: {payment_info['status']}")
                print(f"Bakong KHQR String: {payment_info.get('khqr_payload')[:45]}...")
                print(f"MD5 Hash: {payment_info.get('khqr_md5')}")

            # Verify Payment
            print(f"\n=== Verifying Payment via Gateway ===")
            verify_req = urllib.request.Request(
                f'http://localhost/api/v1/payments/{payment_id}/verify/',
                data=json.dumps({'status': 'SUCCESS'}).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            with urllib.request.urlopen(verify_req) as verify_resp:
                verify_info = json.loads(verify_resp.read().decode('utf-8'))
                print(f"Payment Verification Response: {verify_info.get('message')}")
                print(f"New Payment Status: {verify_info['payment']['status']}")

            # Check Order Status in Order Service
            print(f"\n=== Checking Final Order Status ===")
            order_number = order_data['order_number']
            order_status_req = urllib.request.Request(
                f'http://localhost/api/v1/orders/{order_number}/',
                headers={'Authorization': f'Bearer {access_token}'}
            )
            with urllib.request.urlopen(order_status_req) as os_resp:
                final_order = json.loads(os_resp.read().decode('utf-8'))
                print(f"Final Order Status: {final_order.get('status')}")
                print(f"Final Payment Status: {final_order.get('payment_status')}")

            # Check Notification in Notification Service
            print(f"\n=== Checking Notification Dispatch ===")
            notif_req = urllib.request.Request(f'http://localhost/api/v1/notifications/?order_id={order_id}')
            with urllib.request.urlopen(notif_req) as notif_resp:
                notif_response = json.loads(notif_resp.read().decode('utf-8'))
                notif_items = notif_response if isinstance(notif_response, list) else notif_response.get('results', [])
                print(f"Notifications found for Order: {len(notif_items)}")
                for n in notif_items:
                    print(f"Notification: Channel={n['channel']}, Recipient={n['recipient']}, Status={n['status']}")
                    print(f"Subject: {n['subject']}")

    print("\nALL LIVE INTEGRATION TESTS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    test_api()
