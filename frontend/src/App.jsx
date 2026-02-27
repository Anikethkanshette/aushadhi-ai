import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import AbhaLogin from './pages/AbhaLogin'
import Dashboard from './pages/Dashboard'
import PharmacistLogin from './pages/pharmacist/PharmacistLogin'
import PharmacistDashboard from './pages/pharmacist/PharmacistDashboard'
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

    const [pharmacistToken, setPharmacistToken] = useState(() => {
        return localStorage.getItem('aushadhi_pharmacist_token') || null
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

    const handlePharmacistLogin = (token) => {
        setPharmacistToken(token)
        localStorage.setItem('aushadhi_pharmacist_token', token)
    }

    const handlePharmacistLogout = () => {
        setPharmacistToken(null)
        localStorage.removeItem('aushadhi_pharmacist_token')
    }

    return (
        <Router>
            <div className="min-h-screen bg-surface text-white">
                <Routes>
                    {/* Patient Routes */}
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

                    {/* Pharmacist Routes */}
                    <Route
                        path="/pharmacist/login"
                        element={
                            pharmacistToken
                                ? <Navigate to="/pharmacist/dashboard" replace />
                                : <PharmacistLogin onLogin={handlePharmacistLogin} apiBase={API_BASE} />
                        }
                    />
                    <Route
                        path="/pharmacist/*"
                        element={
                            pharmacistToken
                                ? <PharmacistDashboard onLogout={handlePharmacistLogout} apiBase={API_BASE} token={pharmacistToken} />
                                : <Navigate to="/pharmacist/login" replace />
                        }
                    />
                </Routes>
            </div>
        </Router>
    )
}

export default App
