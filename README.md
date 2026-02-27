# AushadhiAI 🏥

> **Voice-Enabled Agentic AI Pharmacist** — AI-powered pharmacy assistant with ABHA login, voice interaction, real pharmaceutical product data, and simulated order processing.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React+Vite-61DAFB)](https://react.dev)
[![LangChain](https://img.shields.io/badge/AI-LangChain+Gemini-FF6B35)](https://python.langchain.com)
[![Langfuse](https://img.shields.io/badge/Observability-Langfuse-purple)](https://langfuse.com)

---

## Features

| Feature | Description |
|---|---|
| 🆔 ABHA Login | Simulated ABDM-compatible identity (12-digit ABHA ID) |
| 🎙️ Voice Chat | Web Speech API – speak in English or Hindi |
| 🔊 Text-to-Speech | AI responds in voice using Speech Synthesis |
| 🤖 AI Agent | LangChain + Gemini with 5 pharmacy tools |
| 💊 Medicine Search | 49 real pharmaceutical products with stock, pricing & Rx flags |
| 📋 Prescription Validation | Detects prescription-required drugs (Ramipril, Minoxidil, etc.) |
| 🛒 Order Flow | Simulated orders with payment + notifications |
| 📊 Welfare Eligibility | PMJAY scheme detection and discounts |
| 🔁 Refill Reminders | Predictive refill alerts from real consumer order history |
| 📈 Langfuse Tracing | Agent execution observability |
| 💾 IndexedDB | Offline-first data storage with Dexie |

---

## Architecture

```
Frontend (React + Vite + TailwindCSS)
   ↕ REST API (axios)
Backend (FastAPI, Python)
   ↕ LangChain Agent Calls
AI Agent Layer (Google Gemini + LangChain)
   ↕ Tracing
Langfuse (Observability)
   ↕ Local IndexedDB (Dexie)
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
| `GET` | `/agent/welfare/{abha_id}` | PMJAY eligibility check |

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
│   │   ├── pharmacy_agent.py    # LangChain + Gemini + Langfuse
│   │   └── predictive_agent.py  # Refill prediction from history
│   ├── routes/
│   │   ├── medicines.py / orders.py / patients.py
│   │   ├── agent.py / webhooks.py
│   ├── data/
│   │   ├── medicines.csv        # 49 real pharmaceutical products
│   │   └── order_history.csv    # Real consumer order history
│   ├── main.py / models.py / database.py
│   └── requirements.txt
├── frontend/src/
│   ├── pages/
│   │   ├── AbhaLogin.jsx        # ABHA ID login
│   │   ├── Dashboard.jsx        # Responsive shell + sidebar
│   │   ├── DashboardHome.jsx    # Stats, welfare, refill alerts
│   │   ├── ChatPage.jsx         # Voice + text AI chat
│   │   ├── MedicineSearch.jsx   # Product search + order flow
│   │   └── OrderHistory.jsx     # Order history + total spend
│   ├── App.jsx / db.js / index.css
├── .env.example
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TailwindCSS |
| Local DB | Dexie (IndexedDB) |
| Backend | FastAPI, Python 3.11+ |
| AI Agent | LangChain, Google Gemini 1.5 Flash |
| Observability | Langfuse |
| Voice | Web Speech API + Speech Synthesis API |

---

## Notes

- Works **offline** — falls back to IndexedDB when backend is unavailable
- AI agent degrades gracefully without an API key (rule-based fallback)
- All payments, notifications, and welfare checks are **simulated demos**
- ABHA identity is **simulated** — no real ABDM API connection

---

*Built with ❤️ for the AI Pharmacist Hackathon*
