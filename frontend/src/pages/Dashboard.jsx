import React, { useEffect, useState } from 'react'
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import {
    Heart, LayoutDashboard, Pill, ClipboardList, MessageSquare,
    LogOut, Bell, ChevronRight, Activity, Zap
} from 'lucide-react'
import axios from 'axios'
import DashboardHome from './DashboardHome'
import MedicineSearch from './MedicineSearch'
import OrderHistory from './OrderHistory'
import ChatPage from './ChatPage'

export default function Dashboard({ patient, onLogout, apiBase }) {
    const location = useLocation()
    const [notifications, setNotifications] = useState([])
    const [showNotifs, setShowNotifs] = useState(false)
    const [profile, setProfile] = useState(null)

    useEffect(() => {
        // Fetch patient profile
        axios.get(`${apiBase}/patients/abha/${patient?.abha_id}/profile`)
            .then(r => setProfile(r.data))
            .catch(() => { })

        // Fetch pharmacist notifications for this patient
        const fetchNotifs = () => {
            axios.get(`${apiBase}/pharmacist/patient-notifications/${patient?.patient_id || ''}`)
                .then(r => setNotifications(r.data.notifications || []))
                .catch(() => { })
        }
        fetchNotifs()
        const id = setInterval(fetchNotifs, 20000)
        return () => clearInterval(id)
    }, [apiBase, patient])

    const nav = [
        { path: '/dashboard/home', icon: LayoutDashboard, label: 'Overview', accent: '#6366f1' },
        { path: '/dashboard/medicines', icon: Pill, label: 'Medicines', accent: '#10b981' },
        { path: '/dashboard/orders', icon: ClipboardList, label: 'My Orders', accent: '#f59e0b' },
        { path: '/dashboard/chat', icon: MessageSquare, label: 'AI Pharmacist', accent: '#14b8a6' },
    ]

    const unread = notifications.length

    return (
        <div className="flex h-screen" style={{ background: 'var(--c-bg)' }}>
            {/* Sidebar */}
            <aside className="w-[220px] flex-shrink-0 flex flex-col sidebar">
                {/* Logo */}
                <div className="px-5 py-5 border-b border-white/5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #4f46e5, #818cf8)', boxShadow: '0 0 16px rgba(99,102,241,0.35)' }}>
                        <Heart className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="text-white font-black text-sm tracking-tight">Aushadhi<span className="text-gradient">AI</span></p>
                        <p className="text-[9px] text-indigo-400/70 uppercase tracking-widest font-bold">Patient Portal</p>
                    </div>
                </div>

                {/* Patient card */}
                <div className="mx-3 mt-4 p-3.5 rounded-xl border border-white/7"
                    style={{ background: 'rgba(99,102,241,0.07)' }}>
                    <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #4f46e5, #8b5cf6)' }}>
                            {patient?.name?.[0]}
                        </div>
                        <div className="min-w-0">
                            <p className="text-white text-sm font-bold truncate">{patient?.name}</p>
                            <p className="text-[9px] text-slate-600 font-mono">{patient?.abha_id}</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {profile?.blood_group && (
                            <span className="badge badge-red text-[9px]">{profile.blood_group}</span>
                        )}
                        {profile?.age && (
                            <span className="badge badge-indigo text-[9px]">{profile.age}y</span>
                        )}
                        {profile?.chronic_conditions?.slice(0, 1).map(c => (
                            <span key={c} className="badge badge-amber text-[9px]">{c}</span>
                        ))}
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 p-3 space-y-0.5 mt-2 scroll overflow-y-auto">
                    {nav.map(({ path, icon: Icon, label, accent }) => {
                        const active = location.pathname.startsWith(path)
                        return (
                            <Link key={path} to={path}
                                className={`nav-item ${active ? 'active' : ''}`}
                                style={active ? { borderColor: `${accent}35`, background: `${accent}14` } : {}}>
                                <div className="icon-pill"
                                    style={{ background: active ? `${accent}25` : 'rgba(255,255,255,0.04)' }}>
                                    <Icon className="w-4 h-4" style={{ color: active ? accent : '#475569' }} />
                                </div>
                                {label}
                            </Link>
                        )
                    })}
                </nav>

                {/* Footer */}
                <div className="p-3 border-t border-white/5 space-y-1">
                    <div className="px-3 py-2 rounded-xl flex items-center gap-2"
                        style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 anim-pulse" />
                        <span className="text-[10px] text-slate-600 font-semibold">AI Agents Online</span>
                        <Activity className="w-3 h-3 text-emerald-500/50 ml-auto" />
                    </div>
                    <button onClick={onLogout}
                        className="nav-item w-full text-left hover:text-red-400">
                        <div className="icon-pill" style={{ background: 'rgba(244,63,94,0.08)' }}>
                            <LogOut className="w-4 h-4 text-red-500/60" />
                        </div>
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Topbar */}
                <header className="flex items-center justify-between px-8 py-4 border-b border-white/5 flex-shrink-0 relative"
                    style={{ background: 'rgba(3,7,15,0.8)', backdropFilter: 'blur(12px)' }}>
                    <div>
                        <h1 className="text-white font-black text-base">
                            Welcome back, <span className="text-gradient">{patient?.name?.split(' ')[0]}</span> 👋
                        </h1>
                        <p className="text-slate-600 text-xs">Your personal AI-powered pharmacy portal</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Notification bell */}
                        <div className="relative">
                            <button onClick={() => setShowNotifs(x => !x)}
                                className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/8"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <Bell className="w-4 h-4 text-slate-400" />
                                {unread > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black text-white flex items-center justify-center"
                                        style={{ background: '#f43f5e' }}>{unread}</span>
                                )}
                            </button>

                            {showNotifs && (
                                <div className="absolute right-0 top-11 w-80 glass z-50 overflow-hidden shadow-2xl anim-appear">
                                    <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
                                        <p className="text-white font-bold text-sm">Pharmacy Notifications</p>
                                        <button onClick={() => setShowNotifs(false)} className="text-slate-600 hover:text-white text-xs">✕</button>
                                    </div>
                                    {notifications.length === 0 ? (
                                        <div className="py-8 text-center">
                                            <Bell className="w-8 h-8 mx-auto text-slate-700 mb-2" />
                                            <p className="text-slate-600 text-sm">No notifications yet</p>
                                        </div>
                                    ) : notifications.map(n => (
                                        <div key={n.id} className="px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                                            <div className="flex items-start gap-3">
                                                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                                                    style={{ background: n.type === 'alert' ? 'rgba(244,63,94,0.15)' : n.type === 'refill' ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)' }}>
                                                    <Bell className="w-3.5 h-3.5" style={{ color: n.type === 'alert' ? '#f43f5e' : n.type === 'refill' ? '#f59e0b' : '#818cf8' }} />
                                                </div>
                                                <div>
                                                    <p className="text-slate-300 text-xs font-semibold">{n.subject || 'Message from Pharmacist'}</p>
                                                    <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">{n.enhanced || n.message}</p>
                                                    <p className="text-slate-700 text-[10px] mt-1">{n.sent_at}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
                            <Zap className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="text-indigo-300 text-xs font-semibold">Gemini Active</span>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto scroll">
                    <Routes>
                        <Route path="home" element={<DashboardHome patient={patient} apiBase={apiBase} profile={profile} />} />
                        <Route path="medicines" element={<MedicineSearch patient={patient} apiBase={apiBase} />} />
                        <Route path="orders" element={<OrderHistory patient={patient} apiBase={apiBase} />} />
                        <Route path="chat" element={<ChatPage patient={patient} apiBase={apiBase} />} />
                        <Route path="*" element={<Navigate to="home" replace />} />
                    </Routes>
                </main>
            </div>
        </div>
    )
}
