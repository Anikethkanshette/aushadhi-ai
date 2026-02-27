import os
import time
import json
from enum import Enum
from typing import Dict, Any, Optional

# Simple in-memory ledger
class TransactionState(Enum):
    PENDING = "PENDING"
    COMMITTED = "COMMITTED"
    ROLLED_BACK = "ROLLED_BACK"

class Ledger:
    def __init__(self, log_file: str = "data/action_log.json"):
        self.log_file = log_file
        self._ensure_log_exists()
        self.transactions = {}

    def _ensure_log_exists(self):
        os.makedirs(os.path.dirname(self.log_file), exist_ok=True)
        if not os.path.exists(self.log_file):
            with open(self.log_file, "w") as f:
                json.dump([], f)

    def _append_log(self, entry: dict):
        try:
            with open(self.log_file, "r+") as f:
                data = json.load(f)
                data.append(entry)
                f.seek(0)
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Ledger error writing log: {e}")

    def begin_transaction(self, tx_id: str, action: str, details: dict):
        self.transactions[tx_id] = {
            "state": TransactionState.PENDING,
            "action": action,
            "details": details,
            "timestamp": time.time(),
            "compensating_actions": []
        }
        self._append_log({"tx_id": tx_id, "event": "BEGIN", "action": action, "timestamp": time.time()})

    def add_compensating_action(self, tx_id: str, action_fn, *args, **kwargs):
        """Registers a function to be called if the transaction is rolled back."""
        if tx_id in self.transactions:
            self.transactions[tx_id]["compensating_actions"].append((action_fn, args, kwargs))

    def commit(self, tx_id: str):
        if tx_id in self.transactions:
            self.transactions[tx_id]["state"] = TransactionState.COMMITTED
            # Clear compensating actions as they are no longer needed
            self.transactions[tx_id]["compensating_actions"] = []
            self._append_log({"tx_id": tx_id, "event": "COMMIT", "timestamp": time.time()})
            return True
        return False

    def rollback(self, tx_id: str):
        if tx_id in self.transactions:
            tx = self.transactions[tx_id]
            if tx["state"] == TransactionState.PENDING:
                # Execute compensating actions
                for action_fn, args, kwargs in tx["compensating_actions"]:
                    try:
                        action_fn(*args, **kwargs)
                    except Exception as e:
                        print(f"Rollback failed for {action_fn.__name__}: {e}")
                
                tx["state"] = TransactionState.ROLLED_BACK
                self._append_log({"tx_id": tx_id, "event": "ROLLBACK", "timestamp": time.time()})
                return True
        return False

ledger_db = Ledger()
