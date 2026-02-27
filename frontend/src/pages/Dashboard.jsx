import React, { useState } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import {
    MessageSquare, Search, ClipboardList, LayoutDashboard,
    LogOut, User, Bell, Pill, Menu, X
} from 'lucide-react'
import ChatPage from './ChatPage'
import MedicineSearch from './MedicineSearch'
import OrderHistory from './OrderHistory'
import DashboardHome from './DashboardHome'
import axios from 'axios'

export default function Dashboard({ patient, onLogout, apiBase }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [showNotifs, setShowNotifs] = useState(false)

    useEffect(() => {
        if (!patient?.abha_id) return

        const fetchNotifs = async () => {
            try {
                const res = await axios.get(`${apiBase}/patients/${patient.abha_id}/notifications`)
                setNotifications(res.data.notifications)
                setUnreadCount(res.data.unread)
            } catch (e) { console.error('Error fetching notifications', e) }
        }

        fetchNotifs()
        const intervalId = setInterval(fetchNotifs, 10000)
        return () => clearInterval(intervalId)
    }, [patient, apiBase])

    const navItems = [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Overview', end: true },
        { to: '/dashboard/chat', icon: MessageSquare, label: 'AI Pharmacist' },
        { to: '/dashboard/medicines', icon: Search, label: 'Medicines' },
        { to: '/dashboard/orders', icon: ClipboardList, label: 'My Orders' },
    ]

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transform transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {/* Logo */}
                <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center">
                        <Pill className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-lg font-bold text-white">Aushadhi<span className="text-indigo-400">AI</span></span>
                </div>

                {/* Patient card */}
                <div className="mx-4 mt-4 glass-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {patient.name?.charAt(0) || 'P'}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{patient.name}</p>
                            <p className="text-xs text-slate-400 font-mono truncate">ABHA: {patient.abha_id}</p>
                        </div>
                    </div>
                    {patient.chronic_conditions?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                            {patient.chronic_conditions.slice(0, 2).map(c => (
                                <span key={c} className="badge badge-blue text-[10px] px-2 py-0.5">{c}</span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Nav */}
                <nav className="px-4 mt-6 space-y-1">
                    {navItems.map(({ to, icon: Icon, label, end }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-150 ${isActive
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`
                            }
                            onClick={() => setSidebarOpen(false)}
                        >
                            <Icon className="w-5 h-5 flex-shrink-0" />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                {/* Bottom logout */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                    <button
                        id="logout-btn"
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 font-medium text-sm transition-all duration-150"
                    >
                        <LogOut className="w-5 h-5" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/60 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top bar */}
                <header className="flex items-center gap-4 px-6 py-4 bg-card border-b border-border flex-shrink-0">
                    <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(!sidebarOpen)}>
                        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                    <div className="flex-1" />
                    <span className="badge badge-green hide-on-mobile">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-slow" />
                        AI Online
                    </span>

                    {/* Notification Bell */}
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifs(!showNotifs)}
                            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl relative transition-colors"
                        >
                            <Bell className="w-5 h-5" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-card" />
                            )}
                        </button>

                        {/* Dropdown */}
                        {showNotifs && (
                            <div className="absolute top-full right-0 mt-2 w-80 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-50">
                                <div className="p-4 border-b border-border flex justify-between items-center bg-white/5">
                                    <h4 className="font-semibold text-white">Notifications</h4>
                                    {unreadCount > 0 && (
                                        <span className="bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                            {unreadCount} New
                                        </span>
                                    )}
                                </div>
                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                    {notifications.length === 0 ? (
                                        <div className="p-6 text-center text-slate-500 text-sm">No new notifications</div>
                                    ) : (
                                        <div className="divide-y divide-border">
                                            {notifications.map(n => (
                                                <div key={n.id} className={`p-4 hover:bg-white/5 transition-colors ${!n.read ? 'bg-indigo-500/5' : ''}`}>
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h5 className="font-semibold text-sm text-white">{n.title}</h5>
                                                        <span className="text-[10px] text-slate-500">
                                                            {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-400 leading-snug">{n.message}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold shadow-lg">
                        {patient.name?.charAt(0) || 'P'}
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-auto">
                    <Routes>
                        <Route path="/" element={<DashboardHome patient={patient} apiBase={apiBase} />} />
                        <Route path="/chat" element={<ChatPage patient={patient} apiBase={apiBase} />} />
                        <Route path="/medicines" element={<MedicineSearch patient={patient} apiBase={apiBase} />} />
                        <Route path="/orders" element={<OrderHistory patient={patient} apiBase={apiBase} />} />
                    </Routes>
                </main>
            </div>
        </div>
    )
}
