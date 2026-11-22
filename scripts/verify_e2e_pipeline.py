import requests

GATEWAY = 'http://localhost/api/v1'

def run_test():
    print('=== 1. TEST LOGIN ===')
    login_res = requests.post(f'{GATEWAY}/auth/login/', json={
        'email': 'sophea.chan@gmail.com',
        'password': 'Password123!'
    })
    assert login_res.status_code == 200, f'Login failed: {login_res.text}'
    login_data = login_res.json()
    token = login_data['tokens']['access']
    user = login_data['user']
    name = user.get("username") or user.get("email")
    print(f'Logged in as {name} (ID: {user["id"]})')

    print('\n=== 2. TEST CATALOG & DETAIL ===')
    cat_res = requests.get(f'{GATEWAY}/catalog/products/')
    assert cat_res.status_code == 200
    products = cat_res.json()['results']
    assert len(products) > 0
    product_1 = products[0]
    print(f'Found {len(products)} products. First product: {product_1["title"]} (ID: {product_1["id"]})')

    detail_res = requests.get(f'{GATEWAY}/catalog/products/{product_1["id"]}/')
    assert detail_res.status_code == 200
    detail = detail_res.json()
    variant = detail['variants'][0]
    print(f'Selected Variant: SKU={variant["sku"]}, Size={variant["size"]}, Price=${variant["price"]}')

    print('\n=== 3. TEST ORDER CHECKOUT ===')
    checkout_payload = {
        'name': user.get('username') or 'Sophea Chan',
        'email': user['email'],
        'phone': user['phone'],
        'city_province': 'Phnom Penh',
        'street_address': 'House #42, Street 310',
        'shipping_method': 'phnom_penh_express',
        'payment_method': 'KHQR',
        'items': [{
            'variant_id': variant['id'],
            'quantity': 1,
            'unit_price': float(variant['price']),
            'product_title': product_1['title'],
            'sku': variant['sku'],
            'size': variant['size'],
            'color': variant.get('color', '')
        }]
    }
    order_res = requests.post(
        f'{GATEWAY}/orders/checkout/',
        json=checkout_payload,
        headers={'Authorization': f'Bearer {token}'}
    )
    assert order_res.status_code == 201, f'Order failed: {order_res.text}'
    order = order_res.json()['order']
    print(f'Order Created: {order["order_number"]}, Subtotal=${order["subtotal"]}, Shipping=${order["shipping_cost"]}, Tax=${order["tax"]}, Total=${order["total_usd"]}, Status={order["status"]}, PaymentStatus={order["payment_status"]}')
    expected_tax = round(float(variant['price']) * 0.10, 2)
    assert float(order['tax']) == expected_tax, f'Expected {expected_tax} tax, got {order["tax"]}'
    assert float(order['subtotal']) == float(variant['price']), f'Expected subtotal {variant["price"]}, got {order["subtotal"]}'
    assert order['user_id'] == user['id'], f'Expected user_id {user["id"]}, got {order["user_id"]}'

    print('\n=== 4. TEST PAYMENT INITIATION ===')
    pay_payload = {
        'order_id': order['id'],
        'order_number': order['order_number'],
        'payment_method': 'KHQR',
        'amount_usd': str(order['total_usd']),
        'amount_khr': order['total_khr']
    }
    pay_res = requests.post(f'{GATEWAY}/payments/', json=pay_payload)
    assert pay_res.status_code == 201, f'Payment create failed: {pay_res.text}'
    payment = pay_res.json()
    print(f'Payment Created: ID={payment["id"]}, Status={payment["status"]}, KHQR MD5={payment["khqr_md5"]}')

    print('\n=== 5. TEST PAYMENT VERIFY & AUTO TRANSITIONS ===')
    verify_res = requests.post(f'{GATEWAY}/payments/{payment["id"]}/verify/', json={'status': 'PAID'})
    assert verify_res.status_code == 200, f'Payment verify failed: {verify_res.text}'
    print('Payment Verified successfully!')

    print('\n=== 6. VERIFY FINAL ORDER RECEIPT & DATABASE STATES ===')
    final_order_res = requests.get(f'{GATEWAY}/orders/{order["order_number"]}/', headers={'Authorization': f'Bearer {token}'})
    assert final_order_res.status_code == 200
    final_order = final_order_res.json()
    print(f'Final Order Status: {final_order["status"]}, Payment Status: {final_order["payment_status"]}')
    assert final_order['payment_status'] == 'PAID'
    assert final_order['status'] == 'PROCESSING'

    print('\n=== 7. TEST PROVINCIAL SHIPPING & EXPRESS RATES ===')
    prov_res = requests.post(f'{GATEWAY}/orders/checkout/', json={
        'name': 'Vireak Roth',
        'email': 'vireak.roth@outlook.com',
        'phone': '098554433',
        'city_province': 'Siem Reap',
        'street_address': 'St. 07, Wat Bo Village',
        'shipping_method': 'provincial',
        'payment_method': 'KHQR',
        'items': [{
            'variant_id': 2,
            'quantity': 1,
            'unit_price': 42.00,
            'product_title': 'Oversized Linen Shirt',
            'sku': 'CLO-0001-M',
            'size': 'M',
            'color': 'Washed Blue'
        }]
    })
    assert prov_res.status_code == 201
    prov_order = prov_res.json()['order']
    print(f'Provincial Order: {prov_order["order_number"]}, Subtotal=${prov_order["subtotal"]}, Shipping=${prov_order["shipping_cost"]}, Total=${prov_order["total_usd"]}')
    assert float(prov_order['shipping_cost']) == 3.00, f'Expected 3.00 shipping, got {prov_order["shipping_cost"]}'
    assert float(prov_order['total_usd']) == 49.20, f'Expected 49.20 total, got {prov_order["total_usd"]}'

    print('\n>>> FULL PIPELINE END-TO-END VERIFICATION: 100% SUCCESSFUL <<<')

if __name__ == '__main__':
    run_test()
