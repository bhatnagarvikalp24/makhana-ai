"""
Performance testing script for diet plan and grocery generation
Run this to measure actual response times locally
"""
import time
import requests
import json

API_URL = "http://localhost:8000"

def test_diet_generation():
    """Test diet plan generation performance"""
    print("\n" + "="*60)
    print("TESTING DIET PLAN GENERATION")
    print("="*60)
    
    test_profile = {
        "name": "Test User",
        "phone": f"test_{int(time.time())}",
        "age": 30,
        "gender": "Male",
        "height_cm": 175,
        "weight_kg": 75,
        "goal": "Weight Loss",
        "goal_pace": "balanced",
        "diet_pref": "Vegetarian",
        "region": "North Indian",
        "budget": "Medium",
        "medical_manual": []
    }
    
    start_time = time.time()
    try:
        response = requests.post(
            f"{API_URL}/generate-diet",
            json=test_profile,
            timeout=120
        )
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ SUCCESS: Diet plan generated in {elapsed:.2f} seconds")
            print(f"   Plan ID: {data.get('plan_id')}")
            print(f"   User ID: {data.get('user_id')}")
            return data.get('plan_id')
        else:
            print(f"❌ FAILED: Status {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            return None
    except Exception as e:
        elapsed = time.time() - start_time
        print(f"❌ ERROR after {elapsed:.2f}s: {e}")
        return None

def test_grocery_generation(plan_id):
    """Test grocery list generation performance"""
    if not plan_id:
        print("\n⚠️  Skipping grocery test (no plan ID)")
        return
    
    print("\n" + "="*60)
    print("TESTING GROCERY LIST GENERATION")
    print("="*60)
    
    start_time = time.time()
    try:
        response = requests.post(
            f"{API_URL}/generate-grocery/{plan_id}",
            timeout=120
        )
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            total = data.get('budget_analysis', {}).get('total_estimated', 0)
            print(f"✅ SUCCESS: Grocery list generated in {elapsed:.2f} seconds")
            print(f"   Total estimated: ₹{total}")
            print(f"   Categories: {len(data.get('categories', []))}")
        else:
            print(f"❌ FAILED: Status {response.status_code}")
            print(f"   Response: {response.text[:200]}")
    except Exception as e:
        elapsed = time.time() - start_time
        print(f"❌ ERROR after {elapsed:.2f}s: {e}")

def test_health_check():
    """Test health endpoint speed"""
    print("\n" + "="*60)
    print("TESTING HEALTH ENDPOINT")
    print("="*60)
    
    start_time = time.time()
    try:
        response = requests.get(f"{API_URL}/health", timeout=10)
        elapsed = time.time() - start_time
        print(f"✅ Health check: {elapsed:.3f} seconds")
        print(f"   Status: {response.json()}")
    except Exception as e:
        print(f"❌ ERROR: {e}")

if __name__ == "__main__":
    print("\n🚀 PERFORMANCE TESTING SUITE")
    print("Make sure backend is running: uvicorn main:app --reload")
    
    # Test health first
    test_health_check()
    
    # Test diet generation
    plan_id = test_diet_generation()
    
    # Test grocery generation
    test_grocery_generation(plan_id)
    
    print("\n" + "="*60)
    print("✅ TESTING COMPLETE")
    print("="*60)

