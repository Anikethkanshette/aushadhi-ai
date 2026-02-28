#!/usr/bin/env python3
"""Debug medicines loading"""

import sys
import os
import traceback

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.chdir(os.path.join(os.path.dirname(__file__), 'backend'))

try:
    print("Loading medicines from database...")
    from database import load_medicines
    medicines = load_medicines()
    print(f"✓ Loaded {len(medicines)} medicines")
    
    if medicines:
        first = medicines[0]
        print(f"\nFirst medicine:")
        for key, val in first.items():
            print(f"  {key}: {val}")
    
    # Find a real medicine ID
    if medicines:
        real_id = medicines[0].get('id')
        print(f"\nReal medicine ID to use: {real_id}")
        
except Exception as e:
    print(f"✗ Error:")
    traceback.print_exc()
