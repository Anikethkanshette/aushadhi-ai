import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import AbhaLogin from './pages/AbhaLogin'
import Dashboard from './pages/Dashboard'
import { seedMedicines, seedOrders, db } from './db'
import axios from 'axios'

const API_BASE = 'http://localhost:8000'

function App() {
    const [patient, setPatient] = useState(() => {
        try {
            const stored = localStorage.getItem('aushadhi_patient')
            return stored ? JSON.parse(stored) : null
        } catch { return null }
    })
    const [seeded, setSeeded] = useState(false)

    useEffect(() => {
        async function initDB() {
            try {
                // Try to load data from backend and seed IndexedDB
                const [medsRes, ordersRes] = await Promise.allSettled([
                    axios.get(`${API_BASE}/medicines/`),
                    axios.get(`${API_BASE}/orders/`),
                ])
                if (medsRes.status === 'fulfilled') {
                    await seedMedicines(medsRes.value.data.medicines || [])
                }
                if (ordersRes.status === 'fulfilled') {
                    await seedOrders(ordersRes.value.data.orders || [])
                }
            } catch (e) {
                console.log('[App] Backend not available, using local IndexedDB only')
            }
            setSeeded(true)
        }
        initDB()
    }, [])

    const handleLogin = (patientData) => {
        setPatient(patientData)
        localStorage.setItem('aushadhi_patient', JSON.stringify(patientData))
    }

    const handleLogout = () => {
        setPatient(null)
        localStorage.removeItem('aushadhi_patient')
    }

    return (
        <Router>
            <div className="min-h-screen bg-surface text-white">
                <Routes>
                    <Route
                        path="/"
                        element={
                            patient
                                ? <Navigate to="/dashboard" replace />
                                : <AbhaLogin onLogin={handleLogin} apiBase={API_BASE} />
                        }
                    />
                    <Route
                        path="/dashboard/*"
                        element={
                            patient
                                ? <Dashboard patient={patient} onLogout={handleLogout} apiBase={API_BASE} />
                                : <Navigate to="/" replace />
                        }
                    />
                </Routes>
            </div>
        </Router>
    )
}

export default App
