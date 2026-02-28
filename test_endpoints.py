#!/usr/bin/env python3
"""Test script for AushadhiAI backend endpoints"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_patient_login():
    """Test patient login endpoint"""
    print("\n1️⃣ Testing Patient Login...")
    url = f"{BASE_URL}/patients/login"
    payload = {
        "abha_id": "1234-5678-9012",
        "password": "rajesh123"
    }
    try:
        resp = requests.post(url, json=payload, timeout=5)
        print(f"   Status Code: {resp.status_code}")
        data = resp.json()
        print(f"   Response Status: {data.get('status')}")
        if data.get('data') and data['data'].get('patient'):
            print(f"   Patient Name: {data['data']['patient'].get('name')}")
            print("   ✓ SUCCESS")
            return True
    except Exception as e:
        print(f"   ✗ ERROR: {e}")
    return False

def test_pharmacist_login():
    """Test pharmacist login endpoint"""
    print("\n2️⃣ Testing Pharmacist Login...")
    url = f"{BASE_URL}/pharmacist/login"
    payload = {
        "username": "admin",
        "password": "admin"
    }
    try:
        resp = requests.post(url, json=payload, timeout=5)
        print(f"   Status Code: {resp.status_code}")
        data = resp.json()
        print(f"   Response Status: {data.get('status')}")
        if data.get('data') and data['data'].get('access_token'):
            print(f"   Token: {data['data']['access_token'][:15]}...")
            print("   ✓ SUCCESS")
            return True
    except Exception as e:
        print(f"   ✗ ERROR: {e}")
    return False

def test_medicines_list():
    """Test medicines list endpoint"""
    print("\n3️⃣ Testing Medicines List...")
    url = f"{BASE_URL}/medicines/"
    try:
        resp = requests.get(url, timeout=5)
        print(f"   Status Code: {resp.status_code}")
        data = resp.json()
        print(f"   Response Status: {data.get('status')}")
        if data.get('data'):
            total = data['data'].get('total', 0)
            print(f"   Total Medicines: {total}")
            if total > 0:
                first_med = data['data']['medicines'][0]
                print(f"   Sample: {first_med.get('name')} - ₹{first_med.get('price')}")
            print("   ✓ SUCCESS")
            return True
    except Exception as e:
        print(f"   ✗ ERROR: {e}")
    return False

def test_pharmacist_stats():
    """Test pharmacist stats endpoint"""
    print("\n4️⃣ Testing Pharmacist Stats...")
    url = f"{BASE_URL}/pharmacist/stats"
    try:
        resp = requests.get(url, timeout=5)
        print(f"   Status Code: {resp.status_code}")
        data = resp.json()
        print(f"   Response Status: {data.get('status')}")
        if data.get('data'):
            stats = data['data']
            print(f"   Total Orders: {stats.get('total_orders')}")
            print(f"   Total Medicines: {stats.get('total_medicines')}")
            print("   ✓ SUCCESS")
            return True
    except Exception as e:
        print(f"   ✗ ERROR: {e}")
    return False

def test_order_creation():
    """Test order creation endpoint"""
    print("\n5️⃣ Testing Order Creation...")
    url = f"{BASE_URL}/orders/"
    payload = {
        "patient_id": "P001",
        "patient_name": "Rajesh Kumar",
        "abha_id": "1234-5678-9012",
        "medicine_id": "16066",
        "medicine_name": "Panthenol Spray",
        "quantity": 5,
        "dosage_frequency": "Once daily",
        "has_prescription": False
    }
    try:
        resp = requests.post(url, json=payload, timeout=5)
        print(f"   Status Code: {resp.status_code}")
        data = resp.json()
        print(f"   Response Status: {data.get('status')}")
        if data.get('data') and data['data'].get('order'):
            order = data['data']['order']
            print(f"   Order ID: {order.get('order_id')}")
            print(f"   Total Amount: ₹{order.get('total_amount')}")
            print("   ✓ SUCCESS")
            return True
    except Exception as e:
        print(f"   ✗ ERROR: {e}")
    return False

if __name__ == "__main__":
    print("=" * 60)
    print("🧪 AUSHADHI-AI BACKEND INTEGRATION TEST")
    print("=" * 60)
    
    results = []
    results.append(("Patient Login", test_patient_login()))
    results.append(("Pharmacist Login", test_pharmacist_login()))
    results.append(("Medicines List", test_medicines_list()))
    results.append(("Pharmacist Stats", test_pharmacist_stats()))
    results.append(("Order Creation", test_order_creation()))
    
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS")
    print("=" * 60)
    
    for test_name, success in results:
        status = "✓ PASS" if success else "✗ FAIL"
        print(f"{status} - {test_name}")
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    print(f"\n{passed}/{total} tests passed")
    
    if passed == total:
        print("\n✅ ALL TESTS PASSED - SYSTEM FULLY OPERATIONAL!")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
