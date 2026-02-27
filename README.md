# AushadhiAI 🏥

> **Voice-Enabled Agentic AI Pharmacist** — AI-powered pharmacy assistant with ABHA login, voice interaction, medicine availability checking, and simulated order processing.

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
| 💊 Medicine Search | 30 medicines, stock check, alternatives |
| 📋 Prescription Validation | Detects Schedule H drugs needing Rx |
| 🛒 Order Flow | Simulated orders with payment + notifications |
| 📊 Welfare Eligibility | PMJAY scheme detection and discounts |
| 🔁 Refill Reminders | Predictive refill alerts from order history |
| 📈 Langfuse Tracing | Agent execution observability |
| 💾 IndexedDB | Offline-first data with Dexie |

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

## Quick Start

### 1. Clone & Configure

```bash
git clone https://github.com/Anikethkanshette/aushadhi-ai.git
cd aushadhi-ai
cp .env.example .env
# Edit .env with your GEMINI_API_KEY and Langfuse keys
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend runs at: **http://localhost:8000**  
Swagger docs: **http://localhost:8000/docs**

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## Demo Patients (ABHA IDs)

| ABHA ID | Patient | Conditions |
|---|---|---|
| `1234-5678-9012` | Rajesh Kumar, 58M | Diabetes, Hypertension |
| `2345-6789-0123` | Priya Sharma, 34F | Allergic Rhinitis |
| `3456-7890-1234` | Amit Patel, 62M | Cardiac, Hyperlipidemia |
| `4567-8901-2345` | Sunita Devi, 45F | Hypothyroidism |
| `5678-9012-3456` | Mohammed Khalil, 38M | — |

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/agent/chat` | AI chat with agent |
| `GET` | `/medicines/` | List/search medicines |
| `POST` | `/orders/` | Place an order |
| `GET` | `/orders/` | Get order history |
| `POST` | `/patients/login` | ABHA login |
| `GET` | `/patients/refill-alerts` | Get refill alerts |
| `GET` | `/agent/welfare/{abha_id}` | Welfare eligibility |

---

## Project Structure

```
aushadhi-ai/
├── backend/
│   ├── agents/
│   │   ├── pharmacy_agent.py    # LangChain + Gemini agent
│   │   └── predictive_agent.py  # Refill prediction
│   ├── routes/
│   │   ├── medicines.py
│   │   ├── orders.py
│   │   ├── patients.py
│   │   ├── agent.py
│   │   └── webhooks.py
│   ├── data/
│   │   ├── medicines.csv        # 30 medicines dataset
│   │   └── order_history.csv    # Consumer order history
│   ├── main.py
│   ├── models.py
│   ├── database.py
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── AbhaLogin.jsx
│       │   ├── Dashboard.jsx
│       │   ├── DashboardHome.jsx
│       │   ├── ChatPage.jsx      # Voice + Text chat
│       │   ├── MedicineSearch.jsx
│       │   └── OrderHistory.jsx
│       ├── App.jsx
│       ├── db.js                 # Dexie IndexedDB
│       └── index.css
├── .env.example
└── README.md
```

---

## Agent Tools

| Tool | Purpose |
|---|---|
| `search_medicine_tool` | Search by name/generic/category |
| `check_stock_tool` | Check specific medicine stock |
| `check_prescription_tool` | Verify Rx requirement |
| `get_patient_history_tool` | Retrieve patient order history |
| `suggest_alternatives_tool` | Find generic alternatives |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TailwindCSS |
| State | React Hooks, localStorage |
| Local DB | Dexie (IndexedDB) |
| Backend | FastAPI, Python 3.11+ |
| AI Agent | LangChain, Google Gemini 1.5 Flash |
| Observability | Langfuse |
| Voice | Web Speech API, Speech Synthesis API |

---

## Hackathon Notes

- Works **offline** – falls back to IndexedDB when backend is unavailable
- AI agent degrades gracefully without API keys (rule-based fallback)
- All payments, notifications, and welfare checks are **simulated demos**
- ABHA identity is **simulated** – no real ABDM API connection

---

*Built with ❤️ for the AI Pharmacist Hackathon*
