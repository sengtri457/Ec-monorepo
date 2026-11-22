#!/usr/bin/env python3
"""
Seed Products Script
Inserts/Updates all 26 catalog products, categories, 107 variants,
and stock movements into PostgreSQL product_db inside Docker.
"""
import subprocess
import sys

def main():
    print("=" * 60)
    print("SEEDING PRODUCTS INTO POSTGRESQL (product_db)")
    print("=" * 60)

    cmd = ["docker", "exec", "ec-product-service", "python", "manage.py", "seed_products"]
    print(f"Running command: {' '.join(cmd)}")
    result = subprocess.run(cmd)

    if result.returncode == 0:
        print("\n[SUCCESS] Product database seeded successfully!")
        print("You can verify products live at: http://localhost/api/v1/catalog/products/")
        print("Or view the catalog in your browser at: http://localhost:3000/catalog")
    else:
        print(f"\n[ERROR] Seeding failed with exit code {result.returncode}")
        sys.exit(result.returncode)

if __name__ == "__main__":
    main()
