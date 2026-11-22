import subprocess
import sys
from pathlib import Path

SERVICES = [
    "user-service",
    "product-service",
    "order-service",
    "payment-service",
    "notification-service",
]

def main():
    root_dir = Path(__file__).resolve().parent.parent
    services_dir = root_dir / "backend" / "services"
    all_passed = True

    print("=" * 60)
    print("RUNNING UNIT TESTS ACROSS ALL 5 MICROSERVICES")
    print("=" * 60)

    for service in SERVICES:
        svc_path = services_dir / service
        print(f"\n---> Testing {service} ({svc_path})...")
        cmd = [sys.executable, "-m", "pytest", "-v"]
        result = subprocess.run(cmd, cwd=str(svc_path))
        if result.returncode != 0:
            print(f"[FAIL] {service} tests failed with exit code {result.returncode}")
            all_passed = False
        else:
            print(f"[PASS] {service} tests passed successfully!")

    print("\n" + "=" * 60)
    if all_passed:
        print("ALL MICROSERVICE TEST SUITES PASSED! (100%)")
        sys.exit(0)
    else:
        print("SOME TESTS FAILED! PLEASE REVIEW OUTPUT ABOVE.")
        sys.exit(1)

if __name__ == "__main__":
    main()
