"""
Comprehensive endpoint testing script
Tests all critical backend endpoints
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000"
test_results = []

def test_endpoint(name, method, url, data=None, expected_status=200):
    """Test a single endpoint"""
    try:
        print(f"\n{'='*60}")
        print(f"Testing: {name}")
        print(f"{'='*60}")

        start_time = time.time()

        if method == "GET":
            response = requests.get(url, timeout=120)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=120)
        elif method == "DELETE":
            response = requests.delete(url, timeout=30)

        elapsed_time = time.time() - start_time

        success = response.status_code == expected_status
        status_icon = "✅" if success else "❌"

        print(f"{status_icon} Status: {response.status_code} (expected {expected_status})")
        print(f"⏱️  Time: {elapsed_time:.2f}s")

        if response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, dict):
                    print(f"📦 Response keys: {list(data.keys())}")
            except:
                pass

        test_results.append({
            "name": name,
            "success": success,
            "status_code": response.status_code,
            "time": elapsed_time
        })

        return response

    except Exception as e:
        print(f"❌ ERROR: {e}")
        test_results.append({
            "name": name,
            "success": False,
            "error": str(e)
        })
        return None

print("="*60)
print("🧪 COMPREHENSIVE API TESTING")
print("="*60)

# Test 1: Health Check
test_endpoint(
    "Health Check",
    "GET",
    f"{BASE_URL}/health"
)

# Test 2: Detailed Health
test_endpoint(
    "Detailed Health Check",
    "GET",
    f"{BASE_URL}/health/detailed"
)

# Test 3: Chat Endpoint
test_endpoint(
    "AI Chat - Simple Query",
    "POST",
    f"{BASE_URL}/chat",
    data={
        "session_id": "test_session",
        "message": "Hello",
        "context": {}
    }
)

# Test 4: Chat History
test_endpoint(
    "Chat History Retrieval",
    "GET",
    f"{BASE_URL}/chat/history/test_session"
)

# Test 5: Clear Chat
test_endpoint(
    "Clear Chat History",
    "DELETE",
    f"{BASE_URL}/chat/history/test_session"
)

# Print Summary
print("\n" + "="*60)
print("📊 TEST SUMMARY")
print("="*60)

passed = sum(1 for r in test_results if r.get("success", False))
total = len(test_results)

print(f"\n✅ Passed: {passed}/{total}")
print(f"❌ Failed: {total - passed}/{total}")

if passed == total:
    print("\n🎉 ALL TESTS PASSED!")
else:
    print("\n⚠️  SOME TESTS FAILED")
    print("\nFailed tests:")
    for result in test_results:
        if not result.get("success", False):
            print(f"  - {result['name']}")
            if "error" in result:
                print(f"    Error: {result['error']}")

print("\n" + "="*60)
