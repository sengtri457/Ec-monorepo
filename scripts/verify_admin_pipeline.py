import sys
import requests

GATEWAY = "http://localhost/api/v1"

def run_verification():
    print("=" * 70)
    print("=== STARTING END-TO-END ADMIN CONTROL PIPELINE VERIFICATION ===")
    print("=" * 70)

    # -------------------------------------------------------------
    # STEP 1: Admin Authentication & RBAC
    # -------------------------------------------------------------
    print("\n[Step 1] Verifying Admin Authentication & RBAC...")

    # 1A: Staff Login
    admin_login_res = requests.post(
        f"{GATEWAY}/auth/admin/login/",
        json={"email": "admin@clothes.ec", "password": "AdminPassword123!"},
        timeout=10,
    )
    assert admin_login_res.status_code == 200, f"Admin login failed: {admin_login_res.text}"
    admin_data = admin_login_res.json()
    admin_token = admin_data["tokens"]["access"]
    admin_user = admin_data["user"]
    assert admin_user["is_staff"] is True, "User is_staff should be True"
    print(f"  [PASS] Logged in as administrator: {admin_user['email']} (Staff: True, Superuser: {admin_user.get('is_superuser')})")

    auth_headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json",
    }

    # 1B: Non-Staff Rejection
    non_staff_login_res = requests.post(
        f"{GATEWAY}/auth/admin/login/",
        json={"email": "sophea.chan@gmail.com", "password": "Password123!"},
        timeout=10,
    )
    assert non_staff_login_res.status_code == 403, (
        f"Non-staff user should be rejected with 403, got {non_staff_login_res.status_code}"
    )
    print(f"  [PASS] Non-staff user correctly blocked with HTTP 403: {non_staff_login_res.json()['error']['message']}")

    # -------------------------------------------------------------
    # STEP 2: Dashboard Telemetry & KPI Aggregates
    # -------------------------------------------------------------
    print("\n[Step 2] Verifying Dashboard Telemetry & KPI Aggregates...")
    stats_res = requests.get(f"{GATEWAY}/orders/admin/stats/", headers=auth_headers, timeout=10)
    assert stats_res.status_code == 200, f"Stats endpoint failed: {stats_res.text}"
    stats = stats_res.json()
    assert "total_revenue" in stats, "total_revenue missing"
    assert "total_orders" in stats, "total_orders missing"
    assert "pending_fulfillment_count" in stats, "pending_fulfillment_count missing"
    assert "recent_orders" in stats, "recent_orders missing"
    print(f"  [PASS] Dashboard Stats: ${stats['total_revenue']} Gross Revenue, {stats['total_orders']} Total Orders, {stats['pending_fulfillment_count']} Pending Fulfillment")

    # -------------------------------------------------------------
    # STEP 3: Stock & Inventory Management & Audit Ledger
    # -------------------------------------------------------------
    print("\n[Step 3] Verifying Stock Inventory & Movement Ledger...")
    inv_res = requests.get(f"{GATEWAY}/inventory/admin/?limit=5", headers=auth_headers, timeout=10)
    assert inv_res.status_code == 200, f"Inventory list failed: {inv_res.text}"
    inv_data = inv_res.json()
    assert inv_data["count"] > 0, "No inventory variants found"
    target_item = inv_data["results"][0]
    initial_stock = target_item["stock"]
    variant_id = target_item["id"]
    sku = target_item["sku"]
    print(f"  [INFO] Target Variant: SKU {sku} (ID: {variant_id}), Current Stock: {initial_stock}")

    # Adjust Stock (+15 units)
    adjust_payload = {
        "variant_id": variant_id,
        "quantity_change": 15,
        "movement_type": "RESTOCK",
        "notes": "E2E automated verification restock shipment",
    }
    adjust_res = requests.post(
        f"{GATEWAY}/inventory/admin/adjust/",
        json=adjust_payload,
        headers=auth_headers,
        timeout=10,
    )
    assert adjust_res.status_code == 200, f"Stock adjustment failed: {adjust_res.text}"
    new_balance = adjust_res.json()["balance_after"]
    assert new_balance == initial_stock + 15, f"Expected {initial_stock + 15}, got {new_balance}"
    print(f"  [PASS] Stock adjusted from {initial_stock} -> {new_balance} units (+15 RESTOCK)")

    # Verify audit movement was logged
    mov_res = requests.get(
        f"{GATEWAY}/inventory/admin/movements/?sku={sku}&limit=1",
        headers=auth_headers,
        timeout=10,
    )
    assert mov_res.status_code == 200
    movements = mov_res.json()["results"]
    assert len(movements) > 0, "Expected at least 1 movement for adjusted SKU"
    latest_mov = movements[0]
    assert latest_mov["quantity_change"] == 15
    assert latest_mov["movement_type"] == "RESTOCK"
    print(f"  [PASS] Movement ledger entry confirmed: {latest_mov['movement_type']} +{latest_mov['quantity_change']} -> Balance {latest_mov['balance_after']}")

    # -------------------------------------------------------------
    # STEP 4: Product Catalog CRUD & Variant Matrix
    # -------------------------------------------------------------
    print("\n[Step 4] Verifying Product Catalog CRUD & Variant Matrix...")
    # Fetch a valid category
    cat_res = requests.get(f"{GATEWAY}/catalog/categories/", timeout=10)
    assert cat_res.status_code == 200
    categories = cat_res.json()["results"] if "results" in cat_res.json() else cat_res.json()
    category_id = categories[0]["id"] if categories else 1

    # Create Product
    product_payload = {
        "title": "E2E Automated Verification Premium Parka",
        "description": "Weatherproof outerwear designed for testing administrative catalog flows.",
        "base_price": 149.50,
        "category_id": category_id,
        "department": "unisex",
        "audience": "adult",
        "subcategory": "outerwear",
        "fabric": "Gore-Tex Shell / Goose Down",
        "is_active": True,
        "is_featured": True,
        "variants": [
            {
                "sku": "E2E-PARKA-BLK-M",
                "size": "M",
                "color": "Black",
                "color_hex": "#000000",
                "stock": 40,
                "is_default": True,
                "is_active": True,
            },
            {
                "sku": "E2E-PARKA-BLK-L",
                "size": "L",
                "color": "Black",
                "color_hex": "#000000",
                "stock": 35,
                "is_default": False,
                "is_active": True,
            },
        ],
        "images": [
            {
                "image_url": "https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&w=800&q=80",
                "alt_text": "Parka Primary",
                "is_primary": True,
                "sort_order": 0,
            }
        ],
    }

    create_prod_res = requests.post(
        f"{GATEWAY}/catalog/admin/products/",
        json=product_payload,
        headers=auth_headers,
        timeout=10,
    )
    assert create_prod_res.status_code == 201, f"Product creation failed: {create_prod_res.text}"
    created_prod = create_prod_res.json()
    created_id = created_prod["id"]
    print(f"  [PASS] Created Product ID {created_id}: '{created_prod['title']}' (Slug: {created_prod['slug']}, Variants: {len(created_prod['variants'])})")

    # Update Product Status (Toggle active)
    patch_res = requests.patch(
        f"{GATEWAY}/catalog/admin/products/{created_id}/",
        json={"is_active": False},
        headers=auth_headers,
        timeout=10,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["is_active"] is False
    print(f"  [PASS] Toggled active status of Product #{created_id} to Inactive")

    # Delete Test Product
    del_res = requests.delete(
        f"{GATEWAY}/catalog/admin/products/{created_id}/",
        headers=auth_headers,
        timeout=10,
    )
    assert del_res.status_code == 204, f"Delete failed: {del_res.status_code}"
    print(f"  [PASS] Cleaned up test product #{created_id} with HTTP 204 No Content")

    # -------------------------------------------------------------
    # STEP 5: Orders Queue & Status Workflow Progression
    # -------------------------------------------------------------
    print("\n[Step 5] Verifying Orders Queue & Status Workflow...")
    orders_res = requests.get(f"{GATEWAY}/orders/admin/?limit=5", headers=auth_headers, timeout=10)
    assert orders_res.status_code == 200, f"Orders queue fetch failed: {orders_res.text}"
    orders_data = orders_res.json()
    assert orders_data["count"] > 0, "No orders available in test environment"
    sample_order = orders_data["results"][0]
    order_num = sample_order["order_number"]

    # Fetch Order Detail
    detail_res = requests.get(
        f"{GATEWAY}/orders/admin/{order_num}/",
        headers=auth_headers,
        timeout=10,
    )
    assert detail_res.status_code == 200, f"Order detail fetch failed: {detail_res.text}"
    order_detail = detail_res.json()
    assert len(order_detail["items"]) > 0, "Order should have at least 1 item"
    print(f"  [PASS] Retrieved Order #{order_num}: Customer {order_detail['customer_name']}, Destination: {order_detail['city_province']}, Total: ${order_detail['total_usd']}")

    # Progress Status
    current_status = order_detail["status"]
    next_status = "CONFIRMED" if current_status == "PENDING" else "PROCESSING"
    status_update_res = requests.patch(
        f"{GATEWAY}/orders/admin/{order_num}/status/",
        json={"status": next_status, "notes": "E2E automated verification status advance"},
        headers=auth_headers,
        timeout=10,
    )
    assert status_update_res.status_code == 200, f"Status update failed: {status_update_res.text}"
    updated_detail = status_update_res.json()
    assert updated_detail["status"] == next_status
    assert len(updated_detail["status_history"]) > 0
    print(f"  [PASS] Advanced order status from {current_status} -> {next_status} (Audit log verified)")

    print("\n" + "=" * 70)
    print("ALL 5 END-TO-END ADMIN CONTROLLER SUITES PASSED SUCCESSFULLY! (100%)")
    print("=" * 70)

if __name__ == "__main__":
    try:
        run_verification()
    except Exception as e:
        print(f"\n[FATAL ERROR] {e}", file=sys.stderr)
        sys.exit(1)
