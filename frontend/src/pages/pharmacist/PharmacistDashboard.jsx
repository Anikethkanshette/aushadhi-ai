import React, { useEffect, useState } from 'react'
import { Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom'
import {
    LogOut, LayoutDashboard, Package, ClipboardList, ShieldAlert,
    Users, FileSpreadsheet, Bell, TrendingUp, AlertTriangle,
    IndianRupee, Activity, CheckCircle2, Clock, BarChart3
} from 'lucide-react'
import api from '../../api'
import { API_ENDPOINTS } from '../../config'
import { useAppContext } from '../../context/AppContext'
import OrdersQueue from './OrdersQueue'
import InventoryManager from './InventoryManager'
import ExportManager from './ExportManager'
import NotifyPatient from './NotifyPatient'

/* ── Inline AllPatients (lightweight) ─────────────────────────────────────── */
function AllPatients({ patients }) {
    const [search, setSearch] = useState('')
    const filtered = patients.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.abha_id?.includes(search)
    )
    return (
        <div className="p-8 max-w-5xl space-y-5 anim-fade">
            <div>
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
                    <Users className="w-6 h-6 text-blue-600" /> Patient Registry
                </h2>
                <p className="text-slate-600 text-sm mt-1">{patients.length} registered patients</p>
            </div>
            <input type="text" placeholder="Search patient name or ABHA ID…" value={search}
                onChange={e => setSearch(e.target.value)}
                className="input text-sm max-w-sm" />
            <div className="space-y-2">
                {filtered.map((p, i) => (
                    <div key={p.patient_id || i} className="glass-hover p-5 flex items-center gap-5">
                        <div className="w-11 h-11 rounded-lg flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                            style={{ background: `linear-gradient(135deg, ${['#2563eb', '#0891b2', '#d97706', '#dc2626', '#059669'][i % 5]}, #f8fafb)` }}>
                            {p.name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-slate-900 font-bold text-sm">{p.name}</p>
                            <p className="text-slate-600 text-xs font-mono">{p.abha_id}</p>
                        </div>
                        <div className="hidden sm:flex gap-2 text-xs flex-wrap justify-end">
                            {p.blood_group && <span className="badge badge-red">{p.blood_group}</span>}
                            {p.age && <span className="badge badge-indigo">{p.age}y</span>}
                            {p.chronic_conditions?.slice(0, 2).map(c => (
                                <span key={c} className="badge badge-amber">{c}</span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

/* ── Overview Dashboard ────────────────────────────────────────────────────── */
function Overview({ stats, patients }) {
    if (!stats) return (
        <div className="p-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-28" />)}
        </div>
    )

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const revenue = stats.monthly_revenue || Array.from({ length: 12 }, () => Math.floor(Math.random() * 5000 + 1000))
    const maxRev = Math.max(...revenue, 1)

    const statCards = [
        { label: 'Total Revenue', value: `₹${(revenue.reduce((a, b) => a + b, 0)).toLocaleString()}`, icon: IndianRupee, color: '#6366f1', desc: 'This year' },
        { label: 'Total Orders', value: stats.total_orders, icon: ClipboardList, color: '#14b8a6', desc: `${stats.pending_orders} pending` },
        { label: 'Patients', value: stats.total_patients, icon: Users, color: '#f59e0b', desc: 'Registered' },
        { label: 'Low Stock', value: stats.low_stock_alerts, icon: AlertTriangle, color: '#f43f5e', desc: 'Need reorder' },
    ]

    return (
        <div className="p-8 space-y-7 max-w-6xl anim-fade">
            <div>
                <h2 className="text-2xl font-black text-slate-900">Pharmacy Overview</h2>
                <p className="text-slate-600 text-sm mt-1">Real-time dashboard · auto-refreshes every 30 s</p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map(({ label, value, icon: Icon, color, desc }, i) => (
                    <div key={label} className={`stat-card anim-up delay-${i + 1}`}>
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                                style={{ background: `${color}15` }}>
                                <Icon className="w-5 h-5" style={{ color }} />
                            </div>
                            {color === '#dc2626' && value > 0
                                ? <span className="badge badge-red text-[9px]">URGENT</span>
                                : <span className="badge badge-teal text-[9px]">LIVE</span>}
                        </div>
                        <p className="text-3xl font-black text-slate-900 mb-1">{value ?? '—'}</p>
                        <p className="text-slate-600 text-xs font-medium">{label}</p>
                        <p className="text-[11px] text-slate-600 mt-1">{desc}</p>
                    </div>
                ))}
            </div>

            {/* Revenue chart */}
            <div className="card-luxury p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-slate-900 font-bold flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-blue-600" /> Monthly Revenue
                        </h3>
                        <p className="text-slate-600 text-xs mt-0.5">This calendar year</p>
                    </div>
                    <span className="badge badge-indigo">{new Date().getFullYear()}</span>
                </div>
                <div className="flex items-end gap-2 h-36">
                    {revenue.map((v, i) => {
                        const h = Math.max((v / maxRev) * 100, 4)
                        const isNow = i === new Date().getMonth()
                        return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                                <div className="w-full rounded-t-lg transition-all group-hover:opacity-100"
                                    style={{
                                        height: `${h}%`,
                                        background: isNow
                                            ? 'linear-gradient(180deg, #3b82f6, #2563eb)'
                                            : 'linear-gradient(180deg, rgba(59,130,246,0.5), rgba(59,130,246,0.2))',
                                        opacity: isNow ? 1 : 0.7,
                                        boxShadow: isNow ? '0 -4px 16px rgba(59,130,246,0.3)' : 'none',
                                    }} />
                                <span className={`text-[9px] font-bold ${isNow ? 'text-blue-600' : 'text-slate-600'}`}>{months[i]}</span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Recent orders */}
            <div className="card-luxury p-6">
                <h3 className="text-slate-900 font-bold mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-cyan-600" /> Recent Orders
                </h3>
                {(stats.recent_orders || []).slice(0, 5).length === 0 ? (
                    <p className="text-slate-600 text-sm py-4 text-center">No recent orders</p>
                ) : (stats.recent_orders || []).slice(0, 5).map(o => (
                    <div key={o.order_id} className="flex items-center justify-between py-3 border-b border-slate-200 last:border-0">
                        <div>
                            <p className="text-slate-900 text-sm font-semibold">{o.patient_name}</p>
                            <p className="text-slate-600 text-xs">{o.medicine_name} · Qty {o.quantity}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-slate-900 font-bold text-sm">₹{parseFloat(o.total_amount || 0).toFixed(2)}</p>
                            <span className={`badge text-[9px] ${o.status === 'completed' || o.status === 'fulfilled' ? 'badge-green' : o.status === 'pending' ? 'badge-amber' : 'badge-red'}`}>
                                {o.status}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

/* ── Shell ─────────────────────────────────────────────────────────────────── */
export default function PharmacistDashboard() {
    const navigate = useNavigate()
    const { pharmacist, clearAll } = useAppContext()
    const location = useLocation()
    const [stats, setStats] = useState(null)
    const [patients, setPatients] = useState([])
    const [notifCount, setNotifCount] = useState(0)

    useEffect(() => {
        if (!pharmacist) {
            navigate('/pharmacist/login')
            return
        }

        const load = async () => {
            try {
                const [sres, pres, nres] = await Promise.all([
                    api.get('/pharmacist/stats'),
                    api.get('/patients/'),
                    api.get('/pharmacist/notifications'),
                ])
                setStats(sres.data)
                setPatients(pres.data.patients || [])
                setNotifCount((nres.data.notifications || []).length)
            } catch { }
        }
        load()
        const id = setInterval(load, 30000)
        return () => clearInterval(id)
    }, [pharmacist, navigate])

    const handleLogout = () => {
        clearAll()
        localStorage.removeItem('aushadhi_pharmacist_token')
        api.setToken(null)
        navigate('/pharmacist/login')
    }

    const nav = [
        { path: '/pharmacist/dashboard', icon: LayoutDashboard, label: 'Overview', accent: '#0891b2' },
        { path: '/pharmacist/orders', icon: ClipboardList, label: 'Order Queue', accent: '#2563eb' },
        { path: '/pharmacist/inventory', icon: Package, label: 'Inventory', accent: '#7c3aed' },
        { path: '/pharmacist/patients', icon: Users, label: 'All Patients', accent: '#d97706' },
        { path: '/pharmacist/notify', icon: Bell, label: 'Notify Patients', accent: '#dc2626', badge: notifCount || undefined },
        { path: '/pharmacist/exports', icon: FileSpreadsheet, label: 'Export Data', accent: '#059669' },
    ]

    const topBar = { pending: stats?.pending_orders ?? 0, lowstock: stats?.low_stock_alerts ?? 0, revenue: stats?.monthly_revenue?.slice(-1)[0] ?? 0 }

    return (
        <div className="flex h-screen" style={{ background: 'var(--c-bg)' }}>
            {/* Sidebar */}
            <aside className="w-[220px] flex-shrink-0 flex flex-col sidebar">
                {/* Logo */}
                <div className="px-5 py-5 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #2d5016, #3d6b1f)' }}>
                            <ShieldAlert className="w-4.5 h-4.5 text-white w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-slate-900 font-black text-sm tracking-tight">Aushadhi<span className="text-gradient">AI</span></p>
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Pharmacist</p>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 p-3 space-y-0.5 mt-2 scroll overflow-y-auto">
                    {nav.map(({ path, icon: Icon, label, accent, badge }) => {
                        const active = location.pathname.startsWith(path)
                        return (
                            <Link key={path} to={path}
                                className={`nav-item ${active ? 'active' : ''}`}
                                style={active ? { borderColor: `${accent}35`, background: `${accent}14` } : {}}>
                                <div className="icon-pill flex-shrink-0"
                                    style={{ background: active ? `${accent}25` : 'rgba(255,255,255,0.04)' }}>
                                    <Icon className="w-4 h-4" style={{ color: active ? accent : '#475569' }} />
                                </div>
                                <span>{label}</span>
                                {badge != null && (
                                    <span className="ml-auto text-[9px] font-black rounded-full px-1.5 py-0.5 min-w-[18px] text-center"
                                        style={{ background: `${accent}25`, color: accent }}>
                                        {badge}
                                    </span>
                                )}
                            </Link>
                        )
                    })}
                </nav>

                {/* Footer */}
                <div className="p-3 border-t border-slate-200 space-y-1">
                    <div className="px-3 py-2.5 rounded-lg bg-slate-50">
                        <div className="flex items-center gap-2 mb-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 anim-pulse" />
                            <span className="text-[10px] text-slate-600 font-semibold">System Online</span>
                        </div>
                        <p className="text-[9px] text-slate-500 font-mono">API · AI Agents Running</p>
                    </div>
                    <button onClick={handleLogout}
                        className="nav-item w-full text-left hover:text-red-600">
                        <div className="icon-pill" style={{ background: 'rgba(220,38,38,0.12)' }}>
                            <LogOut className="w-4 h-4 text-red-600" />
                        </div>
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top bar */}
                <header className="flex items-center justify-between px-8 py-4 border-b border-slate-200 flex-shrink-0 bg-white/50 backdrop-blur-sm">
                    <div>
                        <h1 className="text-slate-900 font-black text-base">Pharmacist Portal</h1>
                        <p className="text-slate-600 text-xs">Manage inventory, orders &amp; patient communications</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {topBar.pending > 0 && (
                            <div className="flex items-center gap-1.5 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-amber-200"
                                style={{ background: 'rgba(217,119,6,0.08)' }}>
                                <Clock className="w-3.5 h-3.5" /> {topBar.pending} Pending
                            </div>
                        )}
                        {topBar.lowstock > 0 && (
                            <div className="flex items-center gap-1.5 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200"
                                style={{ background: 'rgba(220,38,38,0.08)' }}>
                                <AlertTriangle className="w-3.5 h-3.5" /> {topBar.lowstock} Low Stock
                            </div>
                        )}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50">
                            <IndianRupee className="w-3.5 h-3.5 text-slate-700" />
                            <span className="text-slate-900 font-bold text-sm">₹{(topBar.revenue || 0).toLocaleString()}</span>
                            <span className="text-slate-600 text-[10px]">this month</span>
                        </div>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-y-auto scroll">
                    <Routes>
                        <Route path="dashboard" element={<Overview stats={stats} patients={patients} />} />
                        <Route path="orders" element={<OrdersQueue />} />
                        <Route path="inventory" element={<InventoryManager />} />
                        <Route path="patients" element={<AllPatients patients={patients} />} />
                        <Route path="notify" element={<NotifyPatient patients={patients} />} />
                        <Route path="exports" element={<ExportManager />} />
                        <Route path="*" element={<Navigate to="dashboard" replace />} />
                    </Routes>
                </main>
            </div>
        </div>
    )
}
