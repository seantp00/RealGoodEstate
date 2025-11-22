"""
Quick test script to verify the ML backend is working correctly
"""
import requests
import json

BASE_URL = "http://localhost:5000"

def test_health():
    """Test health endpoint"""
    print("\n[TEST 1] Health Check...")
    try:
        response = requests.get(f"{BASE_URL}/api/health")
        if response.status_code == 200:
            print("✓ Server is healthy!")
            print(f"  Response: {response.json()}")
            return True
        else:
            print(f"✗ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Could not connect to server: {e}")
        return False

def test_prediction():
    """Test prediction endpoint"""
    print("\n[TEST 2] ML Prediction...")

    # Sample test data
    test_data = {
        "income": 5000.0,
        "equity": 50000.0,
        "savings": 800.0,
        "target": 350000.0,
        "years": 5,
        "rate": 5.0,
        "marital": "married",
        "kids": 2
    }

    try:
        response = requests.post(
            f"{BASE_URL}/api/predict",
            json=test_data,
            headers={"Content-Type": "application/json"}
        )

        if response.status_code == 200:
            result = response.json()
            print("✓ Prediction successful!")
            print(f"  Current Readiness: {result['readiness']}%")
            print(f"  Success Likelihood: {result['likelihood']}%")
            print(f"  Current Power: €{result['currPower']:,}")
            print(f"  Future Equity: €{result['futureEquity']:,}")
            print(f"  Model: {result['model_info']['readiness_model']}")
            return True
        else:
            print(f"✗ Prediction failed: {response.status_code}")
            print(f"  Response: {response.text}")
            return False
    except Exception as e:
        print(f"✗ Error during prediction: {e}")
        return False

def test_multiple_scenarios():
    """Test multiple scenarios"""
    print("\n[TEST 3] Multiple Scenarios...")

    scenarios = [
        {"name": "Young Starter", "income": 3000, "equity": 10000, "savings": 500, "target": 250000, "years": 3, "rate": 5.0, "marital": "single", "kids": 0},
        {"name": "Growing Family", "income": 6000, "equity": 75000, "savings": 1200, "target": 450000, "years": 7, "rate": 5.0, "marital": "married", "kids": 2},
        {"name": "Established Couple", "income": 8000, "equity": 150000, "savings": 2000, "target": 600000, "years": 10, "rate": 5.0, "marital": "married", "kids": 3},
    ]

    print(f"\n{'Scenario':<20} {'Readiness':<12} {'Likelihood':<12}")
    print("-" * 50)

    for scenario in scenarios:
        try:
            response = requests.post(f"{BASE_URL}/api/predict", json=scenario)
            if response.status_code == 200:
                result = response.json()
                print(f"{scenario['name']:<20} {result['readiness']:>3}%{'':<8} {result['likelihood']:>3}%")
            else:
                print(f"{scenario['name']:<20} ERROR")
        except Exception as e:
            print(f"{scenario['name']:<20} ERROR: {e}")

    return True

if __name__ == "__main__":
    print("="*60)
    print("Real Good Estate - ML Backend Test Suite")
    print("="*60)

    # Check if server is running
    if not test_health():
        print("\n⚠️  Server is not running!")
        print("\nTo start the server:")
        print("  1. Open a new terminal")
        print("  2. Navigate to the backend folder")
        print("  3. Run: python server.py")
        print("\nOr double-click: start_server.bat")
        exit(1)

    # Run prediction tests
    test_prediction()
    test_multiple_scenarios()

    print("\n" + "="*60)
    print("All tests completed!")
    print("="*60)

