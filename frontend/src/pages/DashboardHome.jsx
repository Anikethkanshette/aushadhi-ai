import React, { useEffect, useState } from 'react'
import api from '../api'
import { API_ENDPOINTS } from '../config'
import { useAppContext } from '../context/AppContext'
import {
    Heart, Activity, Pill, ShoppingBag, AlertCircle, TrendingUp,
    Sparkles, ChevronRight, DropletIcon, Zap, Thermometer, Shield, Package, Loader2
} from 'lucide-react'

const SPARKLINE_H = [30, 45, 35, 60, 50, 70, 55, 80, 65, 90, 75, 100]

function Sparkline({ data = SPARKLINE_H, color = '#6366f1' }) {
    const max = Math.max(...data, 1)
    const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - (v / max) * 100}`).join(' ')
    return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-10">
            <polyline points={pts} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
    )
}

export default function DashboardHome() {
    const { patient } = useAppContext()
    const [orders, setOrders] = useState([])
    const [medicines, setMedicines] = useState([])
    const [alerts, setAlerts] = useState([])
    const [loadingMeds, setLoadingMeds] = useState(true)

    useEffect(() => {
        if (!patient?.patient_id) return

        const fetchData = async () => {
            try {
                const ordersRes = await api.get(API_ENDPOINTS.ORDERS_LIST(patient.patient_id))
                const os = ordersRes.data.orders || []
                setOrders(os)
                const now = new Date()
                const refills = os.filter(o => {
                    const d = new Date(o.purchase_date)
                    return (now - d) > 20 * 24 * 3600 * 1000
                }).slice(0, 2)
                setAlerts(refills)
            } catch (err) {
                console.error('Failed to fetch orders:', err)
            }
        }

        const fetchMedicines = async () => {
            try {
                const medsRes = await api.get(API_ENDPOINTS.MEDICINES_LIST)
                setMedicines(medsRes.data.medicines || [])
            } catch (err) {
                console.error('Failed to fetch medicines:', err)
            } finally {
                setLoadingMeds(false)
            }
        }

        fetchData()
        fetchMedicines()
    }, [patient])

    const health = patient?.health_metrics || {}
    const meds = patient?.current_medications || []
    const allergy = patient?.allergies || []
    const chronic = patient?.chronic_conditions || []

    const healthCards = [
        { label: 'Blood Pressure', value: health.blood_pressure || '—', unit: 'mmHg', icon: Activity, color: '#60a5fa', trend: [65, 70, 68, 75, 72, 78, 74, 80, 76, 82] },
        { label: 'Blood Sugar', value: health.blood_sugar || '—', unit: 'mg/dL', icon: DropletIcon, color: '#f472b6', trend: [80, 95, 87, 100, 92, 105, 98, 88, 94, 102] },
        { label: 'Cholesterol', value: health.cholesterol || '—', unit: 'mg/dL', icon: Heart, color: '#fbbf24', trend: [160, 170, 165, 175, 168, 172, 166, 170, 168, 165] },
        { label: 'Pulse', value: health.pulse_rate || '—', unit: 'bpm', icon: Zap, color: '#34d399', trend: [68, 72, 70, 74, 71, 75, 72, 69, 73, 70] },
    ]

    const completedOrders = orders.filter(o => o.status === 'fulfilled' || o.status === 'completed')
    const totalSpend = orders.reduce((a, o) => a + parseFloat(o.total_amount || 0), 0)

    return (
        <div className="p-8 space-y-7 max-w-5xl anim-fade">
            {/* Hero welcome */}
            <div className="card-luxury p-7 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 rounded-full opacity-20 pointer-events-none"
                    style={{ background: 'radial-gradient(circle, #10b981, #3b82f6)', filter: 'blur(60px)', transform: 'translate(30%,-30%)' }} />
                <div className="relative z-10 flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-2">AI Pharmacy Agent · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <h2 className="text-3xl font-black text-white mb-2">
                            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},<br />
                            <span className="text-gradient">{patient?.name?.split(' ')[0]}</span>
                        </h2>
                        <p className="text-cyan-400/80 text-sm max-w-md">
                            Your agentic AI pharmacist is monitoring your health and ready to provide intelligent assistance with prescriptions and orders.
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 text-right">
                        <div className="badge badge-indigo text-xs py-1.5 px-3">
                            <Sparkles className="w-3 h-3" /> AI Active
                        </div>
                        {patient?.blood_group && <span className="badge badge-red">{patient.blood_group}</span>}
                        {patient?.age && <span className="badge badge-violet">{patient.age}y · {patient.gender}</span>}
                    </div>
                </div>

                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-blue-500/20">
                    {[
                        { label: 'Total Orders', value: orders.length, color: '#60a5fa' },
                        { label: 'Completed', value: completedOrders.length, color: '#34d399' },
                        { label: 'Total Spend', value: `₹${totalSpend.toFixed(0)}`, color: '#fbbf24' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="text-center">
                            <p className="text-2xl font-black" style={{ color }}>{value}</p>
                            <p className="text-cyan-400/60 text-xs mt-0.5">{label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Refill alerts */}
            {alerts.length > 0 && (
                <div className="flex flex-col gap-2 anim-up">
                    {alerts.map(a => (
                        <div key={a.order_id} className="flex items-center gap-4 px-5 py-4 rounded-xl border bg-gradient-to-r from-amber-500/15 to-orange-500/10"
                            style={{ borderColor: 'rgba(251,191,36,0.25)' }}>
                            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-amber-300 font-semibold text-sm">Refill Due: {a.medicine_name}</p>
                                <p className="text-cyan-400/60 text-xs mt-0.5">Last ordered {a.purchase_date} · Consider reordering</p>
                            </div>
                            <a href="/dashboard/medicines" className="btn btn-gold text-xs py-2 px-4">Order Now</a>
                        </div>
                    ))}
                </div>
            )}

            {/* Health metrics */}
            <div>
                <h3 className="text-white font-black mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-400" /> Health Metrics
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {healthCards.map(({ label, value, unit, icon: Icon, color, trend }, i) => (
                        <div key={label} className={`stat-card anim-up delay-${i + 1}`}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="icon-pill" style={{ background: `${color}20` }}>
                                    <Icon className="w-4 h-4" style={{ color }} />
                                </div>
                                <TrendingUp className="w-3.5 h-3.5" style={{ color: `${color}80` }} />
                            </div>
                            <p className="text-2xl font-black text-white">{value}</p>
                            <p className="text-[10px] text-slate-600 mb-3">{unit}</p>
                            <p className="text-xs text-slate-500 mb-2">{label}</p>
                            <Sparkline data={trend} color={color} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Available Medicines / Inventory */}
            <div className="card-luxury p-6">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-white font-black flex items-center gap-2">
                        <Package className="w-5 h-5 text-cyan-400" /> Available Medicines
                    </h3>
                    <a href="/dashboard/medicines" className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors">
                        Browse all <ChevronRight className="w-3 h-3" />
                    </a>
                </div>
                {loadingMeds ? (
                    <div className="flex items-center justify-center h-32">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                    </div>
                ) : medicines.length === 0 ? (
                    <p className="text-slate-600 text-sm py-4 text-center">No medicines available</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {medicines.slice(0, 6).map((med) => {
                            const isLowStock = parseInt(med.stock_quantity) < parseInt(med.min_stock_level)
                            return (
                                <div key={med.id} className="p-4 rounded-lg border border-blue-500/20 bg-gradient-to-br from-slate-800/50 to-slate-900/50 hover:from-slate-800 hover:to-slate-800 transition-all cursor-pointer group">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="text-white font-bold text-sm line-clamp-1 group-hover:text-cyan-300 transition-colors">{med.name}</p>
                                            <p className="text-cyan-400/60 text-xs mt-0.5">{med.generic_name}</p>
                                        </div>
                                        {isLowStock && <span className="badge badge-red text-[9px] flex-shrink-0">LOW</span>}
                                    </div>
                                    <div className="flex items-center justify-between mt-3">
                                        <div>
                                            <p className="text-emerald-400 font-black text-sm">₹{parseFloat(med.price).toFixed(2)}</p>
                                            <p className="text-cyan-400/60 text-xs mt-0.5">Stock: {med.stock_quantity}</p>
                                        </div>
                                        <span className="text-[9px] px-2 py-1 rounded-lg bg-blue-500/20 text-cyan-400 border border-blue-500/20">{med.category}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* 2-col: Medications + Profile */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Current medications */}
                <div className="card-luxury p-5">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <Pill className="w-4 h-4 text-emerald-400" /> Current Medications
                    </h3>
                    {meds.length === 0 ? (
                        <p className="text-slate-600 text-sm py-4 text-center">No medications on record</p>
                    ) : (
                        <div className="space-y-2">
                            {meds.map((m, i) => (
                                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-emerald-500/20"
                                    style={{ background: 'rgba(16,185,145,0.08)' }}>
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                        style={{ background: 'rgba(16,185,145,0.15)' }}>
                                        <Pill className="w-3.5 h-3.5 text-emerald-400" />
                                    </div>
                                    <span className="text-cyan-300 text-sm font-medium">{m}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Health profile */}
                <div className="card-luxury p-5 space-y-4">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <Shield className="w-4 h-4 text-cyan-400" /> Health Profile
                    </h3>
                    {[
                        { label: 'Conditions', values: chronic, color: '#f59e0b', emptyMsg: 'No chronic conditions' },
                        { label: 'Allergies', values: allergy, color: '#f43f5e', emptyMsg: 'No known allergies' },
                    ].map(({ label, values, color, emptyMsg }) => (
                        <div key={label}>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{label}</p>
                            {values.length === 0
                                ? <p className="text-slate-700 text-xs">{emptyMsg}</p>
                                : <div className="flex flex-wrap gap-1.5">{values.map(v => (
                                    <span key={v} className="badge text-[10px]"
                                        style={{ background: `${color}12`, borderColor: `${color}25`, color }}>
                                        {v}
                                    </span>
                                ))}</div>}
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent orders */}
            <div className="card-luxury p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-amber-400" /> Recent Orders
                    </h3>
                    <a href="/dashboard/orders" className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors">
                        View all <ChevronRight className="w-3 h-3" />
                    </a>
                </div>
                {orders.slice(0, 4).length === 0 ? (
                    <p className="text-cyan-400/60 text-sm py-4 text-center">No orders yet</p>
                ) : (
                    <div className="space-y-2">
                        {orders.slice(0, 4).map(o => (
                            <div key={o.order_id} className="flex items-center justify-between py-3 border-b border-blue-500/15 last:border-0 hover:bg-blue-500/10 px-2 rounded transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                                        style={{ background: 'rgba(59,130,246,0.15)' }}>
                                        <Pill className="w-4 h-4 text-cyan-400" />
                                    </div>
                                    <div>
                                        <p className="text-white text-sm font-semibold">{o.medicine_name}</p>
                                        <p className="text-cyan-400/60 text-xs">Qty {o.quantity} · {o.purchase_date}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-emerald-400 font-bold text-sm">₹{parseFloat(o.total_amount || 0).toFixed(2)}</p>
                                    <span className={`badge text-[9px] ${o.status === 'completed' || o.status === 'fulfilled' ? 'badge-green' : 'badge-amber'}`}>
                                        {o.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
