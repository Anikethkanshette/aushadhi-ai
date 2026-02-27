import React, { useEffect, useState } from 'react'
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { LogOut, LayoutDashboard, Package, ClipboardList, TrendingUp, AlertTriangle, ShieldAlert } from 'lucide-react'
import axios from 'axios'
import OrdersQueue from './OrdersQueue'
import InventoryManager from './InventoryManager'

export default function PharmacistDashboard({ onLogout, apiBase, token }) {
    const location = useLocation()
    const [stats, setStats] = useState(null)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axios.get(`${apiBase}/pharmacist/stats`)
                setStats(res.data)
            } catch (e) { console.error('Error fetching stats', e) }
        }
        fetchStats()
        // refresh stats every 30s
        const intId = setInterval(fetchStats, 30000)
        return () => clearInterval(intId)
    }, [apiBase])

    const navItems = [
        { path: '/pharmacist/dashboard', icon: LayoutDashboard, label: 'Overview' },
        { path: '/pharmacist/orders', icon: ClipboardList, label: 'Order Queue' },
        { path: '/pharmacist/inventory', icon: Package, label: 'Inventory' },
    ]

    return (
        <div className="flex h-screen bg-[#0d151c] font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-teal-950/20 border-r border-teal-500/10 flex flex-col">
                <div className="p-6 border-b border-teal-500/10">
                    <div className="flex items-center space-x-3 text-teal-400">
                        <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
                            <ShieldAlert size={20} />
                        </div>
                        <span className="font-bold text-lg tracking-wide">AushadhiAI</span>
                    </div>
                    <div className="mt-1 text-xs text-teal-500/60 uppercase tracking-wider font-semibold">Pharmacist Portal</div>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => {
                        const active = location.pathname === item.path
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${active
                                    ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <Icon size={20} />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-teal-500/10">
                    <button
                        onClick={onLogout}
                        className="flex items-center space-x-3 text-gray-400 hover:text-red-400 transition-colors w-full px-4 py-3 rounded-xl hover:bg-red-500/10"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden flex flex-col items-center">
                <header className="w-full max-w-6xl p-6 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Pharmacist Dashboard</h2>
                        <p className="text-gray-400 text-sm">Manage orders, inventory, and verify prescriptions.</p>
                    </div>
                </header>

                <div className="w-full max-w-6xl flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
                    <Routes>
                        <Route path="/" element={<Navigate to="/pharmacist/dashboard" replace />} />
                        <Route path="/dashboard" element={<DashboardOverview stats={stats} />} />
                        <Route path="/orders" element={<OrdersQueue apiBase={apiBase} />} />
                        <Route path="/inventory" element={<InventoryManager apiBase={apiBase} />} />
                    </Routes>
                </div>
            </main>
        </div>
    )
}

function DashboardOverview({ stats }) {
    if (!stats) return <div className="text-gray-400">Loading stats...</div>

    const cards = [
        { title: 'Pending Orders', value: stats.pending_orders, icon: ClipboardList, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
        { title: 'Low Stock Items', value: stats.low_stock_items, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
        { title: 'Total Revenue', value: `₹${stats.total_revenue.toFixed(2)}`, icon: TrendingUp, color: 'text-teal-400', bg: 'bg-teal-400/10', border: 'border-teal-400/20' },
        { title: 'Total Orders', value: stats.total_orders, icon: Package, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' }
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cards.map((c, i) => (
                <div key={i} className={`rounded-2xl p-6 border ${c.border} bg-white/5 backdrop-blur-md relative overflow-hidden`}>
                    <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${c.bg} blur-2xl z-0`} />
                    <div className="relative z-10 flex justify-between items-start">
                        <div>
                            <p className="text-gray-400 text-sm font-medium mb-1">{c.title}</p>
                            <h3 className="text-3xl font-bold text-white">{c.value}</h3>
                        </div>
                        <div className={`p-3 rounded-xl ${c.bg} ${c.color}`}>
                            <c.icon size={24} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

