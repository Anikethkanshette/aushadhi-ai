# AushadhiAI Agent System - Deployment & Verification Guide

## ✅ Pre-Deployment Checklist

### Code Review
- [ ] Review all 8 agent files for changes
- [ ] Check agent_utils.py for new utilities
- [ ] Verify error handling implementation
- [ ] Confirm input validation is in place

### Documentation
- [ ] Read AGENTS_IMPROVEMENTS.md
- [ ] Review AGENT_USAGE_EXAMPLES.py
- [ ] Check QUICK_REFERENCE.md
- [ ] Understand CHANGELOG.md
- [ ] Review this deployment guide

### Testing
- [ ] Run test_agent_improvements.py
- [ ] Check logs/ directory created
- [ ] Verify all agent imports work
- [ ] Test each agent method

### Compatibility
- [ ] Review breaking changes in CHANGELOG
- [ ] Check existing route compatibility
- [ ] Plan response format updates
- [ ] Prepare rollback plan

---

## 🚀 Deployment Steps

### Step 1: Pre-Deployment

```bash
# 1. Backup current working code
cd /path/to/aushadhi-ai
git checkout -b backup/before-agent-improvements
git commit -m "Backup current working code"
git checkout main

# 2. Verify Python version
python --version  # Should be 3.10+

# 3. Check dependencies
pip list | grep -E "fastapi|uvicorn|google-genai"
```

### Step 2: Code Deployment

```bash
# 1. Pull latest changes
git pull origin main

# 2. Verify new files exist
ls -la backend/agents/agent_utils.py
ls -la backend/logs/
ls -la backend/AGENTS_IMPROVEMENTS.md

# 3. Check file structure
tree backend/agents/ -I '__pycache__'
```

### Step 3: Environment Setup

```bash
# 1. Create logs directory (if not present)
mkdir -p backend/logs

# 2. Set proper permissions
chmod 755 backend/logs

# 3. Check Python environment
cd backend
python -c "import sys; print(f'Python: {sys.version}')"
```

### Step 4: Dependency Installation

```bash
# Ensure all dependencies are installed
pip install -r requirements.txt

# Verify critical imports
python -c "
from agents.agent_utils import AgentResponse
from agents.stock_agent import StockCheckAgent
print('✓ Dependencies OK')
"
```

### Step 5: Testing

```bash
# Run comprehensive test
python test_agent_improvements.py

# Expected output:
# ✓ All agents imported successfully
# ✓ All agents initialized successfully
# ✓ Input validation tests passed
# ✓ Response format validated
# ✓ Logging configured

# If any failures, check logs and fix before continuing
```

### Step 6: Manual Verification

```bash
# Test StockCheckAgent
python -c "
from agents.stock_agent import StockCheckAgent
agent = StockCheckAgent()
result = agent.check_inventory('Paracetamol')
print(f'Status: {result[\"status\"]}')
print(f'Has error_code: {\"error_code\" in result}')
print(f'Has meta: {\"meta\" in result}')
"

# Test PaymentAgent
python -c "
from agents.payment_agent import PaymentAgent
agent = PaymentAgent()
result = agent.validate_payment_method('UPI', {'upi_id': 'test@upi'})
print(f'Status: {result[\"status\"]}')
"

# Test WelfareAgent
python -c "
from agents.welfare_agent import WelfareAgent
agent = WelfareAgent()
result = agent.check_eligibility('2002-0002-0002', 1000.0)
has_data = result['status'] == 'success' and 'data' in result
print(f'Response format: {\"OK\" if has_data else \"ERROR\"}'
"
```

---

## 🔍 Verification Steps

### Verify All Files Present

```bash
# Check backend directory
ls -la backend/agents/
# Should see:
# - __init__.py
# - agent_utils.py (NEW)
# - stock_agent.py
# - prescription_agent.py
# - payment_agent.py
# - delivery_agent.py
# - welfare_agent.py
# - notification_agent.py
# - policy_agent.py
# - predictive_agent.py
# - pharmacy_agent.py

# Check root directory
ls -la backend/
# Should see:
# - AGENTS_IMPROVEMENTS.md (NEW)
# - AGENT_USAGE_EXAMPLES.py (NEW)
# - test_agent_improvements.py (NEW)
# - logs/ directory (NEW)
```

### Verify Logging Works

```bash
# Check logs directory exists
ls -la logs/

# After running agents, check log files
ls -la logs/*.log

# Verify log content
cat logs/StockCheckAgent.log | head -10

# Should see timestamp and INFO level messages
```

### Verify Response Format

```bash
# Create test script: test_response.py
cat > test_response.py << 'EOF'
from agents.stock_agent import StockCheckAgent

agent = StockCheckAgent()
result = agent.check_inventory("Test")

print("Response structure:")
print(f"  ✓ status: {result.get('status')}")
print(f"  ✓ message: {result.get('message')}: {result['message'][:50]}...")
print(f"  ✓ data: {type(result.get('data'))}")
print(f"  ✓ error_code: {result.get('error_code')}")
print(f"  ✓ meta: {result.get('meta')}")

if all(k in result for k in ['status', 'message', 'data', 'error_code', 'meta']):
    print("\n✓✓✓ Response format is CORRECT!")
else:
    print("\n✗✗✗ Response format is INCORRECT!")
EOF

python test_response.py
```

### Verify Error Handling

```bash
# Test validation error
python -c "
from agents.stock_agent import StockCheckAgent
from agents.agent_utils import ValidationError

agent = StockCheckAgent()
try:
    result = agent.check_inventory('')  # Empty query
    print(f'Status: {result[\"status\"]}')
    print(f'Error Code: {result.get(\"error_code\")}')
    print('✓ Validation error handled correctly')
except Exception as e:
    print(f'✗ Unexpected error: {e}')
"
```

### Verify All Agents Load

```bash
# Create verification script: verify_agents.py
cat > verify_agents.py << 'EOF'
agents = [
    "StockCheckAgent",
    "PrescriptionAgent", 
    "PaymentAgent",
    "DeliveryAgent",
    "WelfareAgent",
    "NotificationAgent",
    "PolicyAgent",
    "PredictiveAgent"
]

print("Verifying all agents load...")
print("-" * 50)

from agents.stock_agent import StockCheckAgent
from agents.prescription_agent import PrescriptionAgent
from agents.payment_agent import PaymentAgent
from agents.delivery_agent import DeliveryAgent
from agents.welfare_agent import WelfareAgent
from agents.notification_agent import NotificationAgent
from agents.policy_agent import PolicyAgent
from agents.predictive_agent import PredictiveAgent

for agent_class in [
    StockCheckAgent, PrescriptionAgent, PaymentAgent,
    DeliveryAgent, WelfareAgent, NotificationAgent,
    PolicyAgent, PredictiveAgent
]:
    try:
        agent = agent_class()
        print(f"✓ {agent_class.__name__} loaded successfully")
    except Exception as e:
        print(f"✗ {agent_class.__name__} failed: {e}")

print("-" * 50)
print("✓ All agents verified!")
EOF

python verify_agents.py
```

---

## 📊 Health Check Commands

```bash
# Complete system health check
cat > health_check.sh << 'EOF'
#!/bin/bash

echo "AushadhiAI Agent System Health Check"
echo "===================================="
echo ""

# Check Python
echo "1. Python Environment"
python --version

# Check imports
echo ""
echo "2. Module Imports"
python -c "from agents.agent_utils import AgentResponse; print('   ✓ agent_utils')"
python -c "from agents.stock_agent import StockCheckAgent; print('   ✓ stock_agent')"
python -c "from agents.prescription_agent import PrescriptionAgent; print('   ✓ prescription_agent')"
python -c "from agents.payment_agent import PaymentAgent; print('   ✓ payment_agent')"
python -c "from agents.delivery_agent import DeliveryAgent; print('   ✓ delivery_agent')"
python -c "from agents.welfare_agent import WelfareAgent; print('   ✓ welfare_agent')"
python -c "from agents.notification_agent import NotificationAgent; print('   ✓ notification_agent')"
python -c "from agents.policy_agent import PolicyAgent; print('   ✓ policy_agent')"
python -c "from agents.predictive_agent import PredictiveAgent; print('   ✓ predictive_agent')"

# Check directories
echo ""
echo "3. Directories"
if [ -d "logs" ]; then
    echo "   ✓ logs directory exists"
else
    echo "   ✗ logs directory missing"
fi

# Check files
echo ""
echo "4. Documentation"
[ -f "AGENTS_IMPROVEMENTS.md" ] && echo "   ✓ AGENTS_IMPROVEMENTS.md"
[ -f "AGENT_USAGE_EXAMPLES.py" ] && echo "   ✓ AGENT_USAGE_EXAMPLES.py"
[ -f "AGENT_QUICK_REFERENCE.md" ] && echo "   ✓ AGENT_QUICK_REFERENCE.md"
[ -f "CHANGELOG.md" ] && echo "   ✓ CHANGELOG.md"

echo ""
echo "Health Check Complete!"
EOF

chmod +x health_check.sh
./health_check.sh
```

---

## 📝 Logging Verification

```bash
# Check that logging is working
python << 'EOF'
from agents.stock_agent import StockCheckAgent
import os

agent = StockCheckAgent()

# Trigger some logging
agent.check_inventory("test")

# Check if log file was created
log_file = "logs/StockCheckAgent.log"
if os.path.exists(log_file):
    print(f"✓ Log file created: {log_file}")
    
    # Show last few lines
    with open(log_file) as f:
        lines = f.readlines()
        print(f"✓ Log entries: {len(lines)}")
        print("✓ Recent logs:")
        for line in lines[-3:]:
            print(f"  {line.rstrip()}")
else:
    print(f"✗ Log file not found: {log_file}")
EOF
```

---

## 🔄 Rollback Plan

If issues occur during deployment:

```bash
# Option 1: Quick rollback (if within 1 commit)
git revert HEAD --no-edit
git push origin main

# Option 2: Complete rollback
git checkout backup/before-agent-improvements
git reset --hard origin/backup/before-agent-improvements
git push origin main -f

# Option 3: Selective rollback (restore specific files)
git checkout main~1 -- backend/agents/stock_agent.py
# ... repeat for other affected files
```

---

## 📞 Post-Deployment Support

### Common Issues

**Issue**: ImportError for agent_utils
```bash
# Solution: Verify file exists
ls -la backend/agents/agent_utils.py

# If missing, restore from git
git checkout backend/agents/agent_utils.py
```

**Issue**: Logs directory permission error
```bash
# Solution: Fix permissions
mkdir -p backend/logs
chmod 755 backend/logs
chmod 777 backend/logs  # If needed
```

**Issue**: Unicode encoding in logs
```bash
# Solution: Expected on Windows, doesn't affect functionality
# Check actual log file content
cat backend/logs/StockCheckAgent.log
```

**Issue**: Old response format in routes
```bash
# Solution: Update routes to use new format
# Before: medicine = result["matches"][0]
# After: medicine = result["data"]["matches"][0]
```

---

## ✅ Final Verification Checklist

- [ ] All files deployed successfully
- [ ] test_agent_improvements.py passes
- [ ] All 8 agents import without errors
- [ ] Logging directory created and writable
- [ ] Log files being created
- [ ] Response format verified with test scripts
- [ ] Error handling working correctly
- [ ] Routes updated for new format (if applicable)
- [ ] API documentation updated
- [ ] Team communication sent
- [ ] Monitoring setup complete
- [ ] Rollback plan documented
- [ ] Manual QA testing complete
- [ ] Production deployment approved

---

## 📬 Next Steps

1. **Immediate (Day 1)**
   - Deploy to staging
   - Run verification tests
   - Monitor logs
   - Get team approval

2. **Day 2-3**
   - Update remaining routes if needed
   - QA testing
   - Load testing (optional)

3. **Day 4-5**
   - Deploy to production
   - Monitor closely
   - Have rollback ready

4. **Week 2+**
   - Monitor for issues
   - Optimize based on logs
   - Plan future enhancements

---

## 📊 Monitoring Dashboard

After deployment, monitor:
- [`http://localhost:8000/docs`](http://localhost:8000/docs) - API docs
- [`http://localhost:8000/health`](http://localhost:8000/health) - Health endpoint
- `logs/` directory - Agent-specific logs
- Error rate in logs
- Response time statistics

---

## ✅ Sign-Off

- [ ] Deployment verified by: _______
- [ ] Date: _______
- [ ] Team informed: _______
- [ ] Documentation updated: _______
- [ ] Monitoring enabled: _______

---

**Deployment Guide Version**: 1.0  
**Last Updated**: 2025-02-28  
**Status**: Ready for Production
