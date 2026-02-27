from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import medicines, orders, patients, agent, webhooks
import uvicorn

app = FastAPI(
    title="AushadhiAI API",
    description="Voice-enabled Agentic AI Pharmacist Backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(medicines.router, prefix="/medicines", tags=["medicines"])
app.include_router(orders.router, prefix="/orders", tags=["orders"])
app.include_router(patients.router, prefix="/patients", tags=["patients"])
app.include_router(agent.router, prefix="/agent", tags=["agent"])
app.include_router(webhooks.router, prefix="/webhook", tags=["webhooks"])


@app.get("/")
async def root():
    return {"message": "AushadhiAI API is running", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
