#!/usr/bin/env python3
"""
Quick test script to verify agent improvements are working.
Run this to validate the enhanced agent system.
"""

import sys
from pathlib import Path

# Add agents to path
agents_dir = Path(__file__).parent / "agents"
sys.path.insert(0, str(agents_dir.parent))

def test_agent_imports():
    """Test that all agents import successfully."""
    print("=" * 60)
    print("Testing Agent Imports")
    print("=" * 60)
    
    try:
        from agents.agent_utils import (
            AgentResponse, ValidationError, setup_agent_logger
        )
        print("✓ agent_utils imported successfully")
    except ImportError as e:
        print(f"✗ Failed to import agent_utils: {e}")
        return False
    
    agents_to_test = [
        ("StockCheckAgent", "agents.stock_agent"),
        ("PrescriptionAgent", "agents.prescription_agent"),
        ("PaymentAgent", "agents.payment_agent"),
        ("DeliveryAgent", "agents.delivery_agent"),
        ("WelfareAgent", "agents.welfare_agent"),
        ("NotificationAgent", "agents.notification_agent"),
        ("PolicyAgent", "agents.policy_agent"),
        ("PredictiveAgent", "agents.predictive_agent"),
    ]
    
    for agent_name, module_path in agents_to_test:
        try:
            module = __import__(module_path, fromlist=[agent_name])
            agent_class = getattr(module, agent_name)
            print(f"✓ {agent_name} imported successfully")
        except ImportError as e:
            print(f"✗ Failed to import {agent_name}: {e}")
            return False
        except AttributeError as e:
            print(f"✗ {agent_name} class not found: {e}")
            return False
    
    return True


def test_agent_initialization():
    """Test that agents initialize without errors."""
    print("\n" + "=" * 60)
    print("Testing Agent Initialization")
    print("=" * 60)
    
    from agents.stock_agent import StockCheckAgent
    from agents.prescription_agent import PrescriptionAgent
    from agents.payment_agent import PaymentAgent
    from agents.delivery_agent import DeliveryAgent
    from agents.welfare_agent import WelfareAgent
    from agents.notification_agent import NotificationAgent
    from agents.policy_agent import PolicyAgent
    from agents.predictive_agent import PredictiveAgent
    
    agents = [
        ("StockCheckAgent", StockCheckAgent),
        ("PrescriptionAgent", PrescriptionAgent),
        ("PaymentAgent", PaymentAgent),
        ("DeliveryAgent", DeliveryAgent),
        ("WelfareAgent", WelfareAgent),
        ("NotificationAgent", NotificationAgent),
        ("PolicyAgent", PolicyAgent),
        ("PredictiveAgent", PredictiveAgent),
    ]
    
    for name, AgentClass in agents:
        try:
            agent = AgentClass()
            print(f"✓ {name} initialized successfully")
        except Exception as e:
            print(f"✗ Failed to initialize {name}: {e}")
            return False
    
    return True


def test_validation():
    """Test input validation functions."""
    print("\n" + "=" * 60)
    print("Testing Input Validation")
    print("=" * 60)
    
    from agents.agent_utils import (
        validate_string, validate_numeric, validate_choice, ValidationError
    )
    
    # Test string validation
    try:
        result = validate_string("test", "field", min_length=1)
        print(f"✓ String validation passed: '{result}'")
    except ValidationError as e:
        print(f"✗ String validation failed: {e}")
        return False
    
    # Test numeric validation
    try:
        result = validate_numeric(100.5, "amount", min_val=0, max_val=1000)
        print(f"✓ Numeric validation passed: {result}")
    except ValidationError as e:
        print(f"✗ Numeric validation failed: {e}")
        return False
    
    # Test choice validation
    try:
        result = validate_choice("UPI", "method", ["UPI", "CARD"])
        print(f"✓ Choice validation passed: {result}")
    except ValidationError as e:
        print(f"✗ Choice validation failed: {e}")
        return False
    
    return True


def test_response_format():
    """Test standardized response format."""
    print("\n" + "=" * 60)
    print("Testing Response Format")
    print("=" * 60)
    
    from agents.agent_utils import AgentResponse
    
    response = AgentResponse(
        status="success",
        message="Test successful",
        data={"key": "value"},
        error_code=None
    )
    
    response_dict = response.to_dict()
    
    required_fields = ["status", "message", "data", "error_code", "meta"]
    for field in required_fields:
        if field not in response_dict:
            print(f"✗ Missing field in response: {field}")
            return False
    
    print(f"✓ Response format validated")
    print(f"  Status: {response_dict['status']}")
    print(f"  Message: {response_dict['message']}")
    print(f"  Data: {response_dict['data']}")
    print(f"  Meta: {response_dict['meta']}")
    
    return True


def test_logging():
    """Test logging setup."""
    print("\n" + "=" * 60)
    print("Testing Logging")
    print("=" * 60)
    
    from agents.agent_utils import setup_agent_logger
    import logging
    from pathlib import Path
    
    logger = setup_agent_logger("TestAgent")
    
    # Check if logger is set up properly
    if not logger:
        print("✗ Logger initialization failed")
        return False
    
    print(f"✓ Logger initialized: {logger.name}")
    print(f"  Level: {logging.getLevelName(logger.level)}")
    
    # Check if log directory exists
    log_dir = Path(__file__).parent / "logs"
    if not log_dir.exists():
        print(f"⚠ Log directory not found: {log_dir}")
    else:
        print(f"✓ Log directory exists: {log_dir}")
    
    return True


def main():
    """Run all tests."""
    print("\n")
    print("╔════════════════════════════════════════════════════════════╗")
    print("║     AushadhiAI Agent System - Improvement Validation       ║")
    print("╚════════════════════════════════════════════════════════════╝\n")
    
    all_passed = True
    
    # Run tests
    tests = [
        ("Import Test", test_agent_imports),
        ("Initialization Test", test_agent_initialization),
        ("Validation Test", test_validation),
        ("Response Format Test", test_response_format),
        ("Logging Test", test_logging),
    ]
    
    for test_name, test_func in tests:
        try:
            if not test_func():
                all_passed = False
        except Exception as e:
            print(f"\n✗ {test_name} failed with exception: {e}")
            import traceback
            traceback.print_exc()
            all_passed = False
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    
    if all_passed:
        print("✓ All tests PASSED!")
        print("\nAgent improvements are working correctly.")
        print("\nNext steps:")
        print("1. Review AGENTS_IMPROVEMENTS.md for detailed changes")
        print("2. Check AGENT_USAGE_EXAMPLES.py for usage patterns")
        print("3. Review log files in logs/ directory")
        return 0
    else:
        print("✗ Some tests FAILED!")
        print("\nPlease check the errors above and fix the issues.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
