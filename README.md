# AushadhiAI 🏥

> **Voice-Enabled Agentic AI Pharmacist** — AI-powered pharmacy assistant with ABHA login, voice interaction, real pharmaceutical product data, and simulated order processing.

<p align="center">
   <img src="https://capsule-render.vercel.app/api?type=waving&height=180&text=AushadhiAI%20%7C%20HackFusion%203.0&fontSize=38&fontAlignY=35&color=0:0f172a,50:1e3a8a,100:14b8a6&fontColor=ffffff&animation=fadeIn" alt="AushadhiAI HackFusion 3.0 animated banner" />
</p>

<p align="center">
   <img src="https://readme-typing-svg.demolab.com?font=Inter&weight=700&size=22&pause=1000&center=true&vCenter=true&width=980&lines=Talk+to+your+AI+Pharmacist+like+a+real+assistant;Search+%E2%86%92+Confirm+%E2%86%92+Order+directly+in+chat;Order+history%2C+notifications%2C+auto-refill+with+guided+conversation" alt="AushadhiAI animated typing banner" />
</p>

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React+Vite-61DAFB)](https://react.dev)
[![Gemini](https://img.shields.io/badge/AI-Google_Gemini-FF6B35)](https://aistudio.google.com/)
[![Langfuse](https://img.shields.io/badge/Observability-Langfuse-purple)](https://langfuse.com)
[![HackFusion 3.0](https://img.shields.io/badge/HackFusion-3.0-7c3aed?style=for-the-badge)](https://github.com/Anikethkanshette/aushadhi-ai)
[![Last Commit](https://img.shields.io/github/last-commit/Anikethkanshette/aushadhi-ai?style=for-the-badge)](https://github.com/Anikethkanshette/aushadhi-ai/commits/main)
[![Commit Activity](https://img.shields.io/github/commit-activity/m/Anikethkanshette/aushadhi-ai?style=for-the-badge)](https://github.com/Anikethkanshette/aushadhi-ai/commits/main)

---

## 🏆 HackFusion 3.0 Project

AushadhiAI was built and evolved as a **HackFusion 3.0 project** with a focus on:
- Agentic healthcare workflows
- Human-like voice interaction
- Reliable pharmacy order automation
- Real-time pharmacist + patient collaboration UX

---

## 📈 Live Commit Pulse

> This section auto-updates from GitHub and reflects ongoing repository activity.

[![Repo Commits](https://img.shields.io/github/commit-activity/y/Anikethkanshette/aushadhi-ai?label=Commits%20%28Year%29)](https://github.com/Anikethkanshette/aushadhi-ai/commits/main)
[![Open Issues](https://img.shields.io/github/issues/Anikethkanshette/aushadhi-ai)](https://github.com/Anikethkanshette/aushadhi-ai/issues)
[![PRs](https://img.shields.io/github/issues-pr/Anikethkanshette/aushadhi-ai)](https://github.com/Anikethkanshette/aushadhi-ai/pulls)

<p align="center">
   <img src="https://github-readme-activity-graph.vercel.app/graph?username=Anikethkanshette&bg_color=0f172a&color=ffffff&line=14b8a6&point=7c3aed&area=true&hide_border=true&custom_title=Live%20GitHub%20Commit%20Activity" alt="Live GitHub commit activity graph" />
</p>

- Live commits feed: https://github.com/Anikethkanshette/aushadhi-ai/commits/main

---

## ✨ Features

> AushadhiAI combines a **patient-first conversational experience** with **pharmacist-grade operational intelligence**.

### 👤 Patient Experience
- 🆔 **ABHA Login** — Simulated ABDM-compatible identity using 12-digit ABHA IDs
- 🎙️ **Voice + Multilingual Chat** — Speak naturally in English/Hindi using Web Speech API
- 🔊 **Voice Responses** — Speech Synthesis delivers AI replies as natural audio
- 🧠 **Intelligent Dashboard Chat** — Patient context is preserved (no repeated patient-ID prompts)
- 💬 **Guided Conversational Actions** — AI follows a clear flow: *Yes/No → Quantity/IDs → Execute*
- 🤖 **AI Order Placement** — Place orders directly in chat (e.g., “order 2 paracetamol”)
- 🔁 **Chat-Driven Self-Service** — Order history, order status, cancellation, notifications, auto-refill controls
- 🔔 **In-App Alerts** — Real-time patient notification bell for pharmacist communications

### 💊 Pharmacy & Operations
- 👨‍⚕️ **Pharmacist Portal** — Secure login, order queue, inventory management, and notification workflows
- 💊 **Medicine Search Engine** — 49 real pharmaceutical products with stock, pricing, and Rx flags
- 📋 **Prescription Validation** — Detects prescription-required medicines (e.g., Ramipril, Minoxidil)
- 🛒 **Order Lifecycle Flow** — Simulated ordering, payment state handling, and dispatch notifications
- 📢 **Notification Agent** — AI-generated WhatsApp/SMS/Email drafts + manual pharmacist-to-patient messaging
- 📦 **Smart Restock AI** — Generates distributor-ready purchase orders from low-stock analysis

### 🤖 AI Intelligence Layer
- 🤖 **Agentic Router** — Routes user intent to specialized agents such as `PolicyAgent` and `PharmacyAgent`
- 📸 **Gemini Vision OCR** — Extracts medicines and dosage details from uploaded prescription photos
- 🔁 **Predictive Refill AI** — Estimates chronic medicine depletion timelines from patient order history
- 📊 **Welfare Eligibility Intelligence** — PMJAY detection and discount insights

### 🧱 Reliability & Engineering
- 📈 **Langfuse Tracing** — End-to-end observability across spans, tool calls, intents, and traces
- 💾 **Offline-First Storage** — IndexedDB (Dexie) for resilient local persistence
- 🎨 **Premium Frontend UX** — Oceanic Obsidian visual system, glassmorphism, and smooth interactions

---

## ✨ Animated Conversation Journey

The AI Pharmacist now behaves like a guided assistant inside patient dashboard:

1. **Medicine Search** → User types medicine name
2. **Smart Prompt** → AI asks: *"Do you want to order? (yes/no)"*
3. **Quantity Capture** → AI asks for quantity (with quick quantity chips)
4. **Execution** → AI places order and confirms amount + delivery

And the same guided style is available for dashboard operations:
- **Order History** (confirm → show latest)
- **Order Status** (confirm → ask order ID → fetch status)
- **Cancel Order** (confirm → ask order ID → cancel)
- **Notifications** (confirm → fetch unread / mark read)
- **Auto-Refill** (list active / cancel by subscription ID)

> ✅ All actions run in patient-isolated context using the logged-in dashboard identity.

---

## 🏗️ Architecture

### System Flow

```text
Patient / Pharmacist UI (React + Vite + TailwindCSS)
            ↓ REST API (axios)
Backend Service Layer (FastAPI, Python)
            ↓ Agent Router
AI Agent Layer (Google Gemini Native Function Calling)
   ├── PharmacyAgent      → medicines, stock checks, ordering tools
   ├── PolicyAgent        → compliance, returns, policy guidance
   └── NotificationAgent  → WhatsApp/SMS/Email communication drafting
            ↓ Tracing
Langfuse Observability (spans, intents, tool execution traces)
            ↓ Persistence
IndexedDB (Dexie) + local CSV/JSON datasets
```

### Why this architecture works
- **Separation of concerns** keeps UI, API, business logic, and AI orchestration independently maintainable.
- **Agent specialization** improves response quality by routing each query to the right capability layer.
- **Traceability by design** via Langfuse helps debug intent, tool calls, and failures quickly.
- **Offline resilience** from local-first data storage keeps demo flows stable under network issues.

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

## 🚀 Quick Start

### Prerequisites
- Python **3.11+**
- Node.js **18+** and npm

### 1) Clone & Environment Setup

```bash
git clone https://github.com/Anikethkanshette/aushadhi-ai.git
cd aushadhi-ai
cp .env.example .env
```

Edit `.env` and add `GEMINI_API_KEY` (optional). If omitted, the app runs in fallback mode.

### 2) Start Backend (FastAPI)

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate    # macOS/Linux
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

- API base: **http://localhost:8000**
- Swagger docs: **http://localhost:8000/docs**

### 3) Start Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

- App URL: **http://localhost:5173**

### 4) Demo-Ready Check
- Patient login via ABHA ID and begin chat-assisted medicine ordering.
- Pharmacist login to validate inventory, order queue, and notifications.

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

## 🔌 API Reference

### Core Patient APIs

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/patients/login` | ABHA-based patient authentication |
| `GET` | `/medicines/` | List or browse medicine catalog |
| `GET` | `/medicines/?search=ramipril` | Search medicines by name or generic |
| `POST` | `/orders/` | Create a new medicine order |
| `GET` | `/orders/?abha_id=...` | Fetch patient order history |
| `GET` | `/patients/refill-alerts` | Upcoming refill reminders |
| `GET` | `/patients/{abha}/notifications` | Retrieve unread patient notifications |
| `GET` | `/patients/{abha}/insights` | Predictive refill insights from order patterns |

### Agent & Intelligence APIs

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/agent/chat` | Conversational AI pharmacist with guided actions |
| `GET` | `/agent/welfare/{abha_id}` | PMJAY eligibility and benefit guidance |
| `POST` | `/agent/scan-prescription` | Gemini Vision OCR for prescription extraction |

### Pharmacist Operations APIs

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/pharmacist/login` | Pharmacist authentication |
| `GET` | `/pharmacist/stats` | Revenue, order, and performance stats |
| `GET` | `/pharmacist/inventory` | Live inventory visibility |
| `PUT` | `/pharmacist/orders/{id}/status` | Update order status and trigger notifications |
| `POST` | `/pharmacist/generate-po` | Generate AI-assisted purchase orders for restocking |

### Integration Webhooks

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/webhook/fulfillment` | Receive fulfillment updates and sync order states |
| `POST` | `/webhook/notification` | Simulate external WhatsApp/SMS/Email events |

> Tip: Explore and test all endpoints via Swagger at **http://localhost:8000/docs**.

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

## 🗂️ Project Structure

```text
aushadhi-ai/
├── backend/
│   ├── agents/                    # Agentic intelligence layer
│   │   ├── pharmacy_agent.py      # Medicine tools + ordering orchestration
│   │   ├── policy_agent.py        # Policy, returns, compliance responses
│   │   ├── notification_agent.py  # Patient communication drafting
│   │   └── predictive_agent.py    # Refill prediction from order behavior
│   ├── routes/                    # FastAPI endpoint modules
│   │   ├── medicines.py / orders.py / patients.py
│   │   ├── agent.py / webhooks.py / pharmacist.py
│   ├── data/                      # Demo datasets and persisted runtime artifacts
│   │   ├── medicines.csv          # 49 medicine catalog records
│   │   ├── order_history.csv      # Historical patient order patterns
│   │   └── notifications.json     # In-app notification store
│   ├── main.py                    # FastAPI app entrypoint
│   ├── models.py                  # Pydantic/domain models
│   ├── database.py                # Data access and persistence logic
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── AbhaLogin.jsx      # ABHA login interface
│       │   ├── Dashboard.jsx      # Main patient shell and navigation
│       │   ├── DashboardHome.jsx  # Insights, welfare, refill alerts
│       │   ├── ChatPage.jsx       # Voice + text AI assistant
│       │   ├── MedicineSearch.jsx # Product discovery and ordering
│       │   ├── OrderHistory.jsx   # Patient order timeline and totals
│       │   └── pharmacist/        # Pharmacist portal modules
│       ├── App.jsx
│       ├── db.js                  # IndexedDB (Dexie) setup
│       └── index.css
├── .env.example
└── README.md
```

### Repository design goals
- **Modular backend routes** make features easy to evolve independently.
- **Agent-first architecture** keeps conversational intelligence extensible.
- **Data + UI separation** simplifies debugging, demos, and feature additions.

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
---


 *Built with ❤️ for the Agentic pharmacy in Hackathon
