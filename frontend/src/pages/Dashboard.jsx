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
    const [notifFilter, setNotifFilter] = useState('all')

    useEffect(() => {
        if (!patient) {
            navigate('/')
            return
        }

        // Fetch patient profile
        api.get(`/patients/abha/${patient?.abha_id}/profile`)
            .then(r => setProfile(r.data))
            .catch(() => { })

        // Fetch patient notifications
        const fetchNotifs = () => {
            api.get(`/patients/${patient?.abha_id}/notifications`)
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
        { path: '/dashboard/home', icon: LayoutDashboard, label: 'Overview', accent: '#6366f1' },
        { path: '/dashboard/medicines', icon: Pill, label: 'Medicines', accent: '#10b981' },
        { path: '/dashboard/orders', icon: ClipboardList, label: 'My Orders', accent: '#f59e0b' },
        { path: '/dashboard/chat', icon: MessageSquare, label: 'AI Pharmacist', accent: '#14b8a6' },
    ]

    const unread = notifications.filter(n => !n.read).length
    const visibleNotifications = notifFilter === 'all'
        ? notifications
        : notifications.filter(n => notifFilter === 'unread' ? !n.read : n.type === notifFilter)

    const markOneRead = async (notificationId, read) => {
        try {
            await api.patch(API_ENDPOINTS.PATIENTS_NOTIF_MARK_READ(patient?.abha_id, notificationId), { read })
            setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read } : n))
        } catch { }
    }

    const markAllRead = async () => {
        try {
            await api.patch(API_ENDPOINTS.PATIENTS_NOTIF_MARK_ALL(patient?.abha_id))
            setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        } catch { }
    }

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
                    <button onClick={handleLogout}
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
                                        <div className="flex items-center gap-2">
                                            <button onClick={markAllRead} className="text-[10px] text-indigo-400 hover:text-white">Mark all read</button>
                                            <button onClick={() => setShowNotifs(false)} className="text-slate-600 hover:text-white text-xs">✕</button>
                                        </div>
                                    </div>
                                    <div className="px-3 py-2 border-b border-white/5 flex gap-2">
                                        {['all', 'unread', 'refill', 'alert', 'general'].map(f => (
                                            <button
                                                key={f}
                                                onClick={() => setNotifFilter(f)}
                                                className={`text-[10px] px-2 py-1 rounded-lg transition-all ${notifFilter === f ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-white/5 text-slate-500 border border-transparent'}`}
                                            >
                                                {f}
                                            </button>
                                        ))}
                                    </div>
                                    {visibleNotifications.length === 0 ? (
                                        <div className="py-8 text-center">
                                            <Bell className="w-8 h-8 mx-auto text-slate-700 mb-2" />
                                            <p className="text-slate-600 text-sm">No notifications yet</p>
                                        </div>
                                    ) : visibleNotifications.map(n => (
                                        <div key={n.id} className={`px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors ${n.read ? 'opacity-70' : ''}`}>
                                            <div className="flex items-start gap-3">
                                                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                                                    style={{ background: n.type === 'alert' ? 'rgba(244,63,94,0.15)' : n.type === 'refill' ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)' }}>
                                                    <Bell className="w-3.5 h-3.5" style={{ color: n.type === 'alert' ? '#f43f5e' : n.type === 'refill' ? '#f59e0b' : '#818cf8' }} />
                                                </div>
                                                <div>
                                                    <p className="text-slate-300 text-xs font-semibold">{n.subject || 'Message from Pharmacist'}</p>
                                                    <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">{n.enhanced || n.message}</p>
                                                    <p className="text-slate-700 text-[10px] mt-1">{n.sent_at}</p>
                                                    <button
                                                        onClick={() => markOneRead(n.id, !n.read)}
                                                        className="text-[10px] text-indigo-400 hover:text-white mt-1"
                                                    >
                                                        {n.read ? 'Mark unread' : 'Mark read'}
                                                    </button>
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
