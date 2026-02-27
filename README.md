# AushadhiAI 🏥

> **Voice-Enabled Agentic AI Pharmacist** — AI-powered pharmacy assistant with ABHA login, voice interaction, real pharmaceutical product data, and simulated order processing.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React+Vite-61DAFB)](https://react.dev)
[![Gemini](https://img.shields.io/badge/AI-Google_Gemini-FF6B35)](https://aistudio.google.com/)
[![Langfuse](https://img.shields.io/badge/Observability-Langfuse-purple)](https://langfuse.com)

---

## Features

| Feature | Description |
|---|---|
| 🆔 ABHA Login | Simulated ABDM-compatible identity (12-digit ABHA ID) |
| 👨‍⚕️ Pharmacist Portal | Admin dashboard with secure login, inventory management, and real-time order fulfilling |
| 🎙️ Voice Chat | Web Speech API – speak in English or Hindi |
| 🔊 Text-to-Speech | AI responds in voice using Speech Synthesis |
| 🤖 Agentic Router | Main AI routes queries to specialized `PolicyAgent` or `PharmacyAgent` |
| 📢 Notification Agent | AI automatically drafts context-aware WhatsApp/SMS/Email copy upon order fulfillment |
| 🔔 In-App Alerts | Real-time notification bell in Patient Dashboard |
| 💊 Medicine Search | 49 real pharmaceutical products with stock, pricing & Rx flags |
| 📋 Prescription Validation | Detects prescription-required drugs (Ramipril, Minoxidil, etc.) |
| 🛒 Order Flow | Simulated orders with payment + notifications |
| 📊 Welfare Eligibility | PMJAY scheme detection and discounts |
| 🔁 Predictive Refill AI | Agentic AI calculates consumption from history to predict exactly when you will run out of chronic meds |
| 📸 AI Prescription OCR | Gemini Vision automatically extracts handwritten medicines and dosages from uploaded Rx photos directly into your cart |
| 📦 Smart Restock AI | Pharmacist AI automates inventory by analyzing low stock to draft customized Purchase Orders to distributors |
| 📈 Langfuse Tracing | End-to-end agent observability (spans and traces) |
| 💾 IndexedDB | Offline-first data storage with Dexie |

---

## Architecture

```
Frontend (React + Vite + TailwindCSS)
   ↕ REST API (axios)
Backend (FastAPI, Python)
   ↕ Agent Router
AI Agent Layer (Google Gemini Native Function Calling)
   ├── PharmacyAgent (Medicines, Tools, Inventory)
   ├── PolicyAgent (Regulation, Returns, Rules)
   └── NotificationAgent (WhatsApp/SMS Copy Generation)
   ↕ Tracing
Langfuse (Observability)
   ↕ Local Storage
Local IndexedDB (Dexie) & local JSON files
```

---

## Data

### Products Dataset (`backend/data/medicines.csv`)
49 real pharmaceutical products sourced from the European market including:
- Analgesics: Paracetamol, Nurofen, Diclofenac-ratiopharm
- Antihypertensives: Ramipril 1A Pharma 10mg *(Rx)*
- Dermatology: Bepanthen, Panthenol Spray, Minoxidil BIO-H-TIN *(Rx)*, Eucerin UreaRepair
- Ophthalmology: Livocab Augentropfen *(Rx)*, Vividrin, Cromo-ratiopharm
- Supplements: NORSAN Omega-3, Centrum Vital, Vigantolvit D3, Vitamin B-Komplex
- Probiotics: OMNI-BIOTIC, Kijimea, MULTILAC, proBIO 6
- Respiratory: Mucosolvan *(Rx)*, Sinupret, Umckaloabo
- Gynecology: COLPOFIX *(Rx)*, femiloges *(Rx)*
- Urology: Aqualibra *(Rx)*, Cystinol, GRANU FINK femina

### Consumer Order History (`backend/data/order_history.csv`)
7 real consumer orders across 7 patients (PAT002–PAT034) with purchase dates, dosage frequencies, and computed refill dates.

---

## Quick Start

### 1. Clone & Configure

```bash
git clone https://github.com/Anikethkanshette/aushadhi-ai.git
cd aushadhi-ai
cp .env.example .env
# Edit .env — add GEMINI_API_KEY (optional, fallback mode works without it)
```

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Swagger docs → **http://localhost:8000/docs**

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App → **http://localhost:5173**

---

## Demo ABHA IDs

| ABHA ID | Patient | Highlights |
|---|---|---|
| `2002-0002-0002` | Priya Sharma | Aqualibra order history |
| `2004-0004-0004` | Rajesh Kumar | Mucosolvan, Rx drugs |
| `2006-0006-0006` | Amit Patel | Ramipril (cardiac) |
| `2008-0008-0008` | Sunita Mehta | Minoxidil (dermatology) |
| `2020-0020-0020` | Vikram Singh | COLPOFIX history |

### Pharmacist Portal Credentials
- **URL**: `http://localhost:5173/pharmacist/login`
- **Username**: `admin`
- **Password**: `admin`

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/agent/chat` | AI pharmacist chat |
| `GET` | `/medicines/` | List / search products |
| `GET` | `/medicines/?search=ramipril` | Search by name or generic |
| `POST` | `/orders/` | Place an order |
| `GET` | `/orders/?abha_id=...` | Patient order history |
| `POST` | `/patients/login` | ABHA login |
| `GET` | `/patients/refill-alerts` | Upcoming refill alerts |
| `GET` | `/patients/{abha}/notifications` | Fetch unread in-app alerts |
| `GET` | `/patients/{abha}/insights` | AI-generated Predictive Refill insights from order history |
| `GET` | `/agent/welfare/{abha_id}` | PMJAY eligibility check |
| `POST` | `/agent/scan-prescription` | Gemini Vision OCR to extract medicines from images |
| `POST` | `/pharmacist/login` | Secure pharmacist auth |
| `GET` | `/pharmacist/stats` | Order and revenue totals |
| `PUT` | `/pharmacist/orders/{id}/status` | Fulfill orders -> triggers Notification Agent |
| `GET` | `/pharmacist/inventory` | Real-time stock levels |
| `POST` | `/pharmacist/generate-po` | AI drafts Purchase Order for low-stock inventory |

---

## Agent Tools

| Tool | Purpose |
|---|---|
| `search_medicine_tool` | Search by name / generic / category |
| `check_stock_tool` | Check stock for a specific product ID |
| `check_prescription_tool` | Verify if Rx is required |
| `get_patient_history_tool` | Retrieve patient's past orders |
| `suggest_alternatives_tool` | Find same-category alternatives |

---

## Project Structure

```
aushadhi-ai/
├── backend/
│   ├── agents/
│   │   ├── pharmacy_agent.py      # Main router + Google GenAI tools
│   │   ├── policy_agent.py        # Rules & Regulations solver
│   │   ├── notification_agent.py  # Automated comms generator
│   │   └── predictive_agent.py    # Refill prediction from history
│   ├── routes/
│   │   ├── medicines.py / orders.py / patients.py
│   │   ├── agent.py / webhooks.py / pharmacist.py
│   ├── data/
│   │   ├── medicines.csv        # 49 real pharmaceutical products
│   │   ├── order_history.csv    # Real consumer order history
│   │   └── notifications.json   # Persistent in-app alerts
│   ├── main.py / models.py / database.py
│   └── requirements.txt
├── frontend/src/
│   ├── pages/
│   │   ├── AbhaLogin.jsx        # ABHA ID login
│   │   ├── Dashboard.jsx        # Responsive shell + Patient bell
│   │   ├── DashboardHome.jsx    # Stats, welfare, refill alerts
│   │   ├── ChatPage.jsx         # Voice + text AI chat
│   │   ├── MedicineSearch.jsx   # Product search + order flow
│   │   ├── OrderHistory.jsx     # Order history + total spend
│   │   └── pharmacist/          # Admin Dashboard, Queue, Inventory
│   ├── App.jsx / db.js / index.css
├── .env.example
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TailwindCSS |
| Local DB | Dexie (IndexedDB), Local JSON |
| Backend | FastAPI, Python 3.11+ |
| AI Agent | Google Gemini Native Function Calling (`google-genai`) |
| Observability | Langfuse (Python SDK) |
| Voice | Web Speech API + Speech Synthesis API |

---

## Notes

- Works **offline** — falls back to IndexedDB when backend is unavailable
- AI agent degrades gracefully without an API key (rule-based fallback)
- All payments, notifications, and welfare checks are **simulated demos**
- ABHA identity is **simulated** — no real ABDM API connection

---

*Built with ❤️ for the Agent Pharmacist Hackathon*
