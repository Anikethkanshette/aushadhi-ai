import React, { useEffect, useState } from 'react'
import { Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom'
import {
    Heart, LayoutDashboard, Pill, ClipboardList, MessageSquare,
    LogOut, Bell, ChevronRight, Activity, Zap
} from 'lucide-react'
import api from '../api'
import { API_ENDPOINTS } from '../config'
import { useAppContext } from '../context/AppContext'
import DashboardHome from './DashboardHome'
import MedicineSearch from './MedicineSearch'
import OrderHistory from './OrderHistory'
import ChatPage from './ChatPage'

export default function Dashboard() {
    const navigate = useNavigate()
    const { patient, clearAll } = useAppContext()
    const location = useLocation()
    const [notifications, setNotifications] = useState([])
    const [showNotifs, setShowNotifs] = useState(false)
    const [profile, setProfile] = useState(null)

    useEffect(() => {
        if (!patient) {
            navigate('/')
            return
        }

        // Fetch patient profile
        api.get(`/patients/abha/${patient?.abha_id}/profile`)
            .then(r => setProfile(r.data))
            .catch(() => { })

        // Fetch pharmacist notifications for this patient
        const fetchNotifs = () => {
            api.get(`/pharmacist/patient-notifications/${patient?.patient_id || ''}`)
                .then(r => setNotifications(r.data.notifications || []))
                .catch(() => { })
        }
        fetchNotifs()
        const id = setInterval(fetchNotifs, 20000)
        return () => clearInterval(id)
    }, [patient, navigate])

    const handleLogout = () => {
        clearAll()
        localStorage.removeItem('aushadhi_patient')
        api.setToken(null)
        navigate('/')
    }

    const nav = [
        { path: '/dashboard/home', icon: LayoutDashboard, label: 'Overview', accent: '#2563eb' },
        { path: '/dashboard/medicines', icon: Pill, label: 'Medicines', accent: '#059669' },
        { path: '/dashboard/orders', icon: ClipboardList, label: 'My Orders', accent: '#d97706' },
        { path: '/dashboard/chat', icon: MessageSquare, label: 'AI Pharmacist', accent: '#0891b2' },
    ]

    const unread = notifications.length

    return (
        <div className="flex h-screen" style={{ background: 'var(--c-bg)' }}>
            {/* Sidebar */}
            <aside className="w-[220px] flex-shrink-0 flex flex-col sidebar">
                {/* Logo */}
                <div className="px-5 py-5 border-b border-blue-500/20 flex items-center gap-3 bg-gradient-to-b from-slate-800 to-slate-900">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/30">
                        <Heart className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="text-white font-black text-sm tracking-tight">Aushadhi<span className="text-gradient">AI</span></p>
                        <p className="text-[9px] text-emerald-400 uppercase tracking-widest font-bold">AI Pharmacy</p>
                    </div>
                </div>

                {/* Patient card */}
                <div className="mx-3 mt-4 p-3.5 rounded-xl border border-blue-500/20 glass-sm bg-gradient-to-br from-slate-800 to-slate-900">
                    <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-black text-sm flex-shrink-0 bg-gradient-to-br from-emerald-500 to-cyan-500">
                            {patient?.name?.[0]}
                        </div>
                        <div className="min-w-0">
                            <p className="text-white text-sm font-bold truncate">{patient?.name}</p>
                            <p className="text-[9px] text-cyan-400 font-mono">{patient?.abha_id}</p>
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
                <nav className="flex-1 p-3 space-y-1 mt-2 scroll overflow-y-auto">
                    {nav.map(({ path, icon: Icon, label, accent }) => {
                        const active = location.pathname.startsWith(path)
                        return (
                            <Link key={path} to={path}
                                className={`nav-item ${active ? 'active' : ''}`}
                                style={active ? { 
                                    background: `linear-gradient(135deg, ${accent}40, ${accent}20)`,
                                    borderColor: `${accent}40`,
                                    boxShadow: `0 0 15px ${accent}30`
                                } : {}}
                            >
                                <div className="icon-pill"
                                    style={{ background: active ? `${accent}35` : 'rgba(100,116,139,0.2)' }}>
                                    <Icon className="w-4 h-4" style={{ color: active ? '#ffffff' : '#94a3b8' }} />
                                </div>
                                <span>{label}</span>
                            </Link>
                        )
                    })}
                </nav>

                {/* Footer */}
                <div className="p-3 border-t border-blue-500/20 space-y-1">
                    <div className="px-3 py-2 rounded-lg flex items-center gap-2 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 anim-pulse" />
                        <span className="text-[10px] text-emerald-300 font-semibold">AI Agents Online</span>
                        <Activity className="w-3 h-3 text-emerald-400/70 ml-auto" />
                    </div>
                    <button onClick={handleLogout}
                        className="nav-item w-full text-left hover:text-rose-400 transition-all">
                        <div className="icon-pill" style={{ background: 'rgba(244,114,182,0.15)' }}>
                            <LogOut className="w-4 h-4 text-rose-400" />
                        </div>
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Topbar */}
                <header className="flex items-center justify-between px-8 py-4 border-b border-blue-500/20 flex-shrink-0 relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 backdrop-blur-md">
                    <div>
                        <h1 className="text-white font-black text-base">
                            Welcome back, <span className="text-gradient">{patient?.name?.split(' ')[0]}</span> 👋
                        </h1>
                        <p className="text-cyan-400/80 text-xs">Your agentic AI pharmacy assistant</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Notification bell */}
                        <div className="relative">
                            <button onClick={() => setShowNotifs(x => !x)}
                                className="relative w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:bg-blue-500/20"
                                style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)' }}>
                                <Bell className="w-4 h-4 text-cyan-400" />
                                {unread > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black text-white flex items-center justify-center animate-pulse"
                                        style={{ background: 'linear-gradient(135deg, #f472b6, #fb7185)' }}>{unread}</span>
                                )}
                            </button>

                            {showNotifs && (
                                <div className="absolute right-0 top-11 w-80 glass z-50 overflow-hidden shadow-xl anim-appear border border-blue-500/30 bg-gradient-to-br from-slate-800 to-slate-900">
                                    <div className="px-4 py-3 border-b border-blue-500/20 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 to-cyan-500/10">
                                        <p className="text-white font-bold text-sm">Notifications</p>
                                        <button onClick={() => setShowNotifs(false)} className="text-cyan-400 hover:text-cyan-300 text-xs">✕</button>
                                    </div>
                                    {notifications.length === 0 ? (
                                        <div className="py-8 text-center">
                                            <Bell className="w-8 h-8 mx-auto text-cyan-500/40 mb-2" />
                                            <p className="text-cyan-400/60 text-sm">No notifications yet</p>
                                        </div>
                                    ) : notifications.map(n => (
                                        <div key={n.id} className="px-4 py-3 border-b border-blue-500/15 last:border-0 hover:bg-blue-500/10 transition-colors">
                                            <div className="flex items-start gap-3">
                                                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                                                    style={{ background: n.type === 'alert' ? 'rgba(244,114,182,0.15)' : n.type === 'refill' ? 'rgba(251,191,36,0.15)' : 'rgba(59,130,246,0.15)' }}>
                                                    <Bell className="w-3.5 h-3.5" style={{ color: n.type === 'alert' ? '#f472b6' : n.type === 'refill' ? '#fbbf24' : '#60a5fa' }} />
                                                </div>
                                                <div>
                                                    <p className="text-white text-xs font-semibold">{n.subject || 'Message from Pharmacist'}</p>
                                                    <p className="text-cyan-400/70 text-[11px] mt-0.5 leading-relaxed">{n.enhanced || n.message}</p>
                                                    <p className="text-cyan-600 text-[10px] mt-1">{n.sent_at}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-gradient-to-r from-emerald-500/15 to-cyan-500/15">
                            <Zap className="w-3.5 h-3.5 text-emerald-400 anim-pulse" />
                            <span className="text-emerald-400 text-xs font-semibold">AI Active</span>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto scroll">
                    <Routes>
                        <Route path="home" element={<DashboardHome profile={profile} />} />
                        <Route path="medicines" element={<MedicineSearch />} />
                        <Route path="orders" element={<OrderHistory />} />
                        <Route path="chat" element={<ChatPage />} />
                        <Route path="*" element={<Navigate to="home" replace />} />
                    </Routes>
                </main>
            </div>
        </div>
    )
}
