"""
AushadhiAI Agent System - Usage Guide & Examples

This guide demonstrates how to use the improved agent system
with proper error handling and response parsing.
"""

# ============================================================================
# 1. STOCK CHECK AGENT - Find medicines and check inventory
# ============================================================================

from agents.stock_agent import StockCheckAgent

# Initialize agent (automatically sets up logging)
stock_agent = StockCheckAgent()

# Search for medicines
result = stock_agent.check_inventory("Paracetamol")

if result["status"] == "success":
    print(f"✓ {result['message']}")
    medicines = result["data"]["matches"]
    
    for med in medicines:
        print(f"  {med['name']} - ₹{med['price']} ({med['quantity_available']} units)")

elif result["status"] == "no_results":
    print(f"⚠ {result['message']}")

else:  # error
    print(f"✗ Error: {result['message']}")
    print(f"  Error Code: {result['error_code']}")


# Check specific medicine stock
result = stock_agent.check_specific_item("MED001")

if result["status"] == "success":
    med_data = result["data"]
    print(f"Medicine: {med_data['name']}")
    print(f"Status: {med_data['stock_status'].upper()}")
    print(f"Available: {med_data['quantity_available']} units")


# ============================================================================
# 2. PRESCRIPTION AGENT - Validate prescriptions
# ============================================================================

from agents.prescription_agent import PrescriptionAgent

rx_agent = PrescriptionAgent()

# Check if prescription is required
result = rx_agent.validate_prescription(
    medicine_id="MED001",
    has_prescription=True,
    patient_abha="2002-0002-0002"
)

if result["status"] == "approved":
    print(f"✓ {result['message']}")
    print(f"Can dispense: {result['data']['can_dispense']}")

elif result["status"] == "rejected":
    print(f"✗ Prescription validation failed")
    print(f"Reason: {result['data']['reason']}")
    print(f"Next steps: {', '.join(result['data']['next_steps'])}")


# Check drug interactions
result = rx_agent.check_interaction("MED001", "MED002")

if result["status"] == "success":
    print(f"Interaction found: {result['data']['interaction_found']}")
    if result["data"]["interaction_found"]:
        print(f"Severity: {result['data']['severity']}")


# ============================================================================
# 3. PAYMENT AGENT - Process payments safely
# ============================================================================

from agents.payment_agent import PaymentAgent

payment_agent = PaymentAgent()

# Validate payment method first
result = payment_agent.validate_payment_method(
    "UPI",
    {"upi_id": "patient@upi"}
)

if result["status"] == "success":
    print("✓ Payment method validated")
    
    # Process payment
    result = payment_agent.process_payment(
        patient_id="PAT001",
        amount=500.0,
        method="UPI"
    )
    
    if result["status"] == "success":
        txn_id = result["data"]["transaction_id"]
        print(f"✓ Payment successful")
        print(f"  Transaction ID: {txn_id}")
    else:
        print(f"✗ Payment failed: {result['message']}")
        print(f"  Transaction ID: {result['data']['transaction_id']}")


# Process refund
result = payment_agent.refund_payment(
    transaction_id="TXN_1709100000",
    amount=500.0,
    reason="Customer requested cancellation"
)

if result["status"] == "success":
    refund_id = result["data"]["refund_id"]
    print(f"✓ Refund initiated: {refund_id}")


# ============================================================================
# 4. DELIVERY AGENT - Schedule and track deliveries
# ============================================================================

from agents.delivery_agent import DeliveryAgent

delivery_agent = DeliveryAgent()

# Schedule delivery
result = delivery_agent.schedule_delivery(
    order_id="ORD12345",
    zip_code="560034"  # Bangalore
)

if result["status"] == "success":
    delivery_info = result["data"]
    print(f"✓ Delivery scheduled")
    print(f"  Expected Date: {delivery_info['expected_delivery_date']}")
    print(f"  Tracking ID: {delivery_info['tracking_id']}")
    print(f"  Courier: {delivery_info['courier']}")

elif result["status"] == "error":
    print(f"✗ Cannot deliver to {result['data'].get('zip_code')}")


# Track shipment
result = delivery_agent.track_shipment("AWB1709100000XYZ")

if result["status"] == "success":
    print(f"Status: {result['data']['status']}")
    print(f"Last Update: {result['data']['last_update']}")


# Estimate delivery cost
result = delivery_agent.estimate_delivery_cost("560034", 2.5)

if result["status"] == "success":
    cost_info = result["data"]
    print(f"Base Cost: ₹{cost_info['base_cost']}")
    print(f"Weight Cost: ₹{cost_info['weight_cost']}")
    print(f"Total: ₹{cost_info['total_cost']}")


# ============================================================================
# 5. WELFARE AGENT - Check eligibility for schemes
# ============================================================================

from agents.welfare_agent import WelfareAgent

welfare_agent = WelfareAgent()

# Check eligibility
result = welfare_agent.check_eligibility(
    abha_id="2002-0002-0002",
    order_amount=1000.0
)

if result["status"] == "success":
    eligibility = result["data"]
    
    if eligibility["is_eligible"]:
        print(f"✓ Patient is eligible for:")
        for scheme in eligibility["schemes"]:
            print(f"  - {scheme}")
        
        print(f"\nDiscount: {int(eligibility['discount_percent'] * 100)}%")
        print(f"Saved: ₹{eligibility['discount_amount']}")
        print(f"Final Amount: ₹{eligibility['final_amount']}")
    else:
        print("⚠ No eligibility for welfare schemes")


# Admin: Add ABHA to scheme
result = welfare_agent.add_eligible_abha(
    abha_id="3001-0001-0001",
    scheme="PMJAY"
)

if result["status"] == "success":
    print(f"✓ {result['message']}")


# ============================================================================
# 6. NOTIFICATION AGENT - Generate multi-channel notifications
# ============================================================================

from agents.notification_agent import NotificationAgent

notification_agent = NotificationAgent()

# Generate notification for order placement
result = notification_agent.generate_and_dispatch(
    patient_id="PAT001",
    abha_id="2002-0002-0002",
    patient_name="Rajesh Kumar",
    event_type="order_placed",
    details={
        "medicine_name": "Paracetamol",
        "quantity": 1,
        "amount": 500.0
    }
)

if result["status"] == "success":
    notifications = result["data"]
    
    # Different channels
    print("📲 WhatsApp:")
    print(f"  {notifications['whatsapp']}\n")
    
    print("📞 SMS:")
    print(f"  {notifications['sms']}\n")
    
    print("📧 Email:")
    print(f"  Subject: {notifications['email_subject']}")
    print(f"  Body: {notifications['email_body'][:100]}...\n")
    
    print("📱 In-App:")
    print(f"  {notifications['in_app']}")


# ============================================================================
# 7. POLICY AGENT - Get regulatory information
# ============================================================================

from agents.policy_agent import PolicyAgent

policy_agent = PolicyAgent()

# Get return policy
result = policy_agent.get_return_policy()

if result["status"] == "success":
    policy = result["data"]
    print(f"Policy: {policy['name']}")
    
    for rule in policy["policies"]:
        print(f"\n{rule['category']}")
        print(f"  Return Period: {rule['return_period']}")
        if "conditions" in rule:
            print(f"  Conditions: {', '.join(rule['conditions'])}")


# Get schedule information
result = policy_agent.get_schedule_info("H1")

if result["status"] == "success":
    schedule = result["data"]
    print(f"Schedule: {schedule['name']}")
    print(f"Description: {schedule['description']}")
    print(f"Requirements: {schedule['requirements']}")


# Process policy query (async)
import asyncio

async def get_policy_info():
    result = await policy_agent.process_message(
        "What's the maximum prescription validity in India?"
    )
    print(result["message"])

# asyncio.run(get_policy_info())


# ============================================================================
# 8. PREDICTIVE AGENT - Medication refill predictions
# ============================================================================

from agents.predictive_agent import PredictiveAgent

predictive_agent = PredictiveAgent()

# Get refill alerts
result = predictive_agent.compute_refill_alerts(days_threshold=7)

if result["status"] == "success":
    alerts = result["data"]["alerts"]
    print(f"Total Alerts: {len(alerts)}")
    print(f"Critical: {result['data']['critical_count']}")
    print(f"High: {result['data']['high_count']}")
    
    for alert in alerts[:5]:  # Show first 5
        print(f"\n  {alert['patient_name']}")
        print(f"  Medicine: {alert['medicine_name']}")
        print(f"  Days until refill: {alert['days_until_refill']}")
        print(f"  Urgency: {alert['urgency']}")
        print(f"  Recommendation: {alert['recommendation']}")


# Predict next refill date
result = predictive_agent.predict_next_refill(
    patient_id="PAT001",
    medicine_id="MED001"
)

if result["status"] == "success":
    prediction = result["data"]
    print(f"Predicted Refill: {prediction['predicted_refill_date']}")
    print(f"Confidence: {prediction['confidence']}%")
    print(f"Pattern: {prediction['pattern']}")


# Get medication timeline
result = predictive_agent.get_patient_medication_timeline("PAT001")

if result["status"] == "success":
    timeline = result["data"]
    print(f"Total Orders: {timeline['total_orders']}")
    print(f"Unique Medicines: {timeline['unique_medicines']}")


# ============================================================================
# 9. ERROR HANDLING EXAMPLES
# ============================================================================

# Validation error example
try:
    result = stock_agent.check_inventory("")  # Empty query
except Exception as e:
    print(f"Error caught: {e}")

# Check error codes in response
result = stock_agent.check_specific_item("INVALID_ID")

if result["status"] == "error":
    error_code = result.get("error_code")
    
    if error_code == "NOT_FOUND":
        print("Medicine not found - suggest alternatives")
    elif error_code == "VALIDATION_ERROR":
        print("Check your input format")
    elif error_code == "STOCK_CHECK_ERROR":
        print("System error - retry later")


# ============================================================================
# 10. LOGGING
# ============================================================================

# All agents automatically log to:
# - Console (INFO level and above)
# - File: logs/<AgentName>.log (DEBUG level and above)

# Check logs for debugging:
# tail -f logs/StockCheckAgent.log
# tail -f logs/PaymentAgent.log
# etc.

print("\n✓ Logs available in logs/ directory")
print("  Example: logs/StockCheckAgent.log")


# ============================================================================
# BEST PRACTICES
# ============================================================================

"""
1. Always check response status:
   if result["status"] == "success":
       # Process data
   elif result["status"] == "error":
       # Handle error with error_code guidance
   
2. Use error codes for programmatic handling:
   error_code = result.get("error_code")
   
3. Access structured data:
   medicines = result["data"]["matches"]
   
4. Log important operations:
   Agent automatically logs - check logs/ files
   
5. Validate inputs before calling agents:
   Best to catch issues early
   
6. Handle edge cases:
   - Empty results (no_results status)
   - Missing database records (NOT_FOUND error)
   - Invalid inputs (VALIDATION_ERROR)
   
7. Use timestamps:
   Helpful for debugging and audit trails
   
8. For async operations:
   Use await with async agent methods
   Properly handle asyncio in FastAPI routes
"""
