import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import AbhaLogin from './pages/AbhaLogin'
import Dashboard from './pages/Dashboard'
import PharmacistLogin from './pages/pharmacist/PharmacistLogin'
import PharmacistDashboard from './pages/pharmacist/PharmacistDashboard'
import { seedMedicines, seedOrders, db } from './db'
import api from './api'
import ErrorBoundary from './components/ErrorBoundary'
import { AppProvider, useAppContext } from './context/AppContext'

/**
 * Main App Router Component
 */
function AppRouter() {
    const { patient, pharmacist, clearAll } = useAppContext()

    useEffect(() => {
        async function initDB() {
            try {
                // Try to load data from backend and seed IndexedDB
                const [medsRes, ordersRes] = await Promise.allSettled([
                    api.get('/medicines/'),
                    api.get('/orders/'),
                ])
                if (medsRes.status === 'fulfilled') {
                    await seedMedicines(medsRes.value.data || [])
                }
                if (ordersRes.status === 'fulfilled') {
                    await seedOrders(ordersRes.value.data || [])
                }
            } catch (e) {
                console.log('[App] Backend not available, using local IndexedDB only', e)
            }
        }
        initDB()
    }, [])

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
                                : <AbhaLogin />
                        }
                    />
                    <Route
                        path="/dashboard/*"
                        element={
                            patient
                                ? <Dashboard />
                                : <Navigate to="/" replace />
                        }
                    />

                    {/* Pharmacist Routes */}
                    <Route
                        path="/pharmacist/login"
                        element={
                            pharmacist
                                ? <Navigate to="/pharmacist/dashboard" replace />
                                : <PharmacistLogin />
                        }
                    />
                    <Route
                        path="/pharmacist/*"
                        element={
                            pharmacist
                                ? <PharmacistDashboard />
                                : <Navigate to="/pharmacist/login" replace />
                        }
                    />
                </Routes>
            </div>
        </Router>
    )
}

/**
 * Root App Component with providers
 */
function App() {
    return (
        <ErrorBoundary>
            <AppProvider>
                <AppRouter />
            </AppProvider>
        </ErrorBoundary>
    )
}

export default App
