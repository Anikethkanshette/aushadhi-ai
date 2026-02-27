import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Activity, ShoppingBag, Bell, TrendingUp, AlertTriangle, Pill, ChevronRight } from 'lucide-react'

export default function DashboardHome({ patient, apiBase }) {
    const [stats, setStats] = useState({ orders: 0, medicines: 0, alerts: 0 })
    const [recentOrders, setRecentOrders] = useState([])
    const [refillAlerts, setRefillAlerts] = useState([])
    const [welfare, setWelfare] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            try {
                const [ordersRes, alertsRes, welfareRes] = await Promise.allSettled([
                    axios.get(`${apiBase}/orders/?abha_id=${patient.abha_id}`),
                    axios.get(`${apiBase}/patients/refill-alerts`),
                    axios.get(`${apiBase}/agent/welfare/${patient.abha_id}`),
                ])
                if (ordersRes.status === 'fulfilled') {
                    const orders = ordersRes.value.data.orders || []
                    setRecentOrders(orders.slice(-5).reverse())
                    setStats(s => ({ ...s, orders: orders.length }))
                }
                if (alertsRes.status === 'fulfilled') {
                    const alerts = (alertsRes.value.data.alerts || []).filter(a => a.patient_id === patient.patient_id)
                    setRefillAlerts(alerts)
                    setStats(s => ({ ...s, alerts: alerts.length }))
                }
                if (welfareRes.status === 'fulfilled') {
                    setWelfare(welfareRes.value.data)
                }
            } catch (e) {
                console.log('Dashboard data load error', e)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [patient])

    const statCards = [
        { label: 'Total Orders', value: stats.orders, icon: ShoppingBag, color: 'from-indigo-500 to-purple-500', bg: 'bg-indigo-500/10' },
        { label: 'Refill Alerts', value: stats.alerts, icon: Bell, color: 'from-amber-400 to-orange-500', bg: 'bg-amber-500/10' },
        { label: 'Conditions', value: patient.chronic_conditions?.length || 0, icon: Activity, color: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-500/10' },
    ]

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            {/* Welcome header */}
            <div>
                <h1 className="text-2xl font-bold text-white">
                    Welcome back, <span className="text-indigo-400">{patient.name?.split(' ')[0]}</span> 👋
                </h1>
                <p className="text-slate-400 text-sm mt-1">Here's your health dashboard overview.</p>
            </div>

            {/* Welfare banner */}
            {welfare?.eligible && (
                <div className="glass-card p-4 border border-emerald-500/30 bg-emerald-500/5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                        <p className="text-emerald-400 font-semibold text-sm">🎉 Welfare Eligible – {welfare.scheme}</p>
                        <p className="text-slate-400 text-xs">{welfare.reason}. You get {welfare.discount_percent}% discount on all medicines.</p>
                    </div>
                    <span className="badge badge-green">{welfare.discount_percent}% OFF</span>
                </div>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {statCards.map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="glass-card p-5 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`w-6 h-6 bg-gradient-to-r ${color} bg-clip-text`} style={{ color: 'currentColor' }} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{loading ? '—' : value}</p>
                            <p className="text-slate-400 text-xs">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Refill Alerts */}
                <div className="glass-card p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-white flex items-center gap-2">
                            <Bell className="w-4 h-4 text-amber-400" /> Refill Alerts
                        </h2>
                        {refillAlerts.length > 0 && (
                            <span className="badge badge-yellow">{refillAlerts.length} due</span>
                        )}
                    </div>
                    {refillAlerts.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-sm">
                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            No upcoming refills due
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {refillAlerts.map((alert, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white font-medium truncate">{alert.medicine_name}</p>
                                        <p className="text-xs text-slate-400">Due: {alert.next_refill_date} ({alert.days_until_refill}d)</p>
                                    </div>
                                    <span className={`badge text-[10px] ${alert.urgency === 'CRITICAL' ? 'badge-red' : 'badge-yellow'}`}>
                                        {alert.urgency}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Orders */}
                <div className="glass-card p-5">
                    <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
                        <ShoppingBag className="w-4 h-4 text-indigo-400" /> Recent Orders
                    </h2>
                    {recentOrders.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-sm">
                            <Pill className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            No orders yet
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentOrders.slice(0, 4).map((order, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                                        <Pill className="w-4 h-4 text-indigo-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white font-medium truncate">{order.medicine_name}</p>
                                        <p className="text-xs text-slate-400">{order.purchase_date} · Qty: {order.quantity}</p>
                                    </div>
                                    <span className="badge badge-green text-[10px]">{order.status}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Chronic conditions */}
            {patient.chronic_conditions?.length > 0 && (
                <div className="glass-card p-5">
                    <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-400" /> Chronic Conditions
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {patient.chronic_conditions.map(c => (
                            <span key={c} className="badge badge-blue px-3 py-1.5 text-xs">{c}</span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
