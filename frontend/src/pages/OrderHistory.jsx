import React, { useState, useEffect } from 'react'
import axios from 'axios'
import {
    ClipboardList, Pill, ChevronDown, ChevronUp, Search, Calendar, TrendingUp,
    Package, IndianRupee, RotateCcw, CheckCircle, Clock, XCircle
} from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { API_CONFIG, API_ENDPOINTS } from '../config'

const STATUS_STYLES = {
    completed: { pill: 'badge-green', icon: CheckCircle, label: 'Completed' },
    fulfilled: { pill: 'badge-green', icon: CheckCircle, label: 'Fulfilled' },
    pending: { pill: 'badge-yellow', icon: Clock, label: 'Pending' },
    approved: { pill: 'badge-blue', icon: TrendingUp, label: 'Approved' },
    rejected: { pill: 'badge-red', icon: XCircle, label: 'Rejected' },
    cancelled: { pill: 'badge-red', icon: XCircle, label: 'Cancelled' },
}

const STATUS_FLOW = ['pending', 'approved', 'fulfilled', 'completed']

function buildTimeline(order) {
    const current = (order.status || 'pending').toLowerCase()
    const currentIdx = STATUS_FLOW.indexOf(current)
    return STATUS_FLOW.map((step, idx) => {
        const done = currentIdx >= idx || (current === 'completed' && step === 'fulfilled')
        return {
            step,
            done,
            label: STATUS_STYLES[step]?.label || step,
        }
    })
}

export default function OrderHistory({ patient, apiBase }) {
    const { patient: contextPatient } = useAppContext()
    const currentPatient = patient || contextPatient
    const resolvedApiBase = apiBase || API_CONFIG.BASE_URL

    const [orders, setOrders] = useState([])
    const [filter, setFilter] = useState('all')
    const [search, setSearch] = useState('')
    const [expanded, setExpanded] = useState(null)
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(null)
    const [actionError, setActionError] = useState('')

    useEffect(() => {
        const fetchOrders = async () => {
            if (!currentPatient?.abha_id) {
                setOrders([])
                setLoading(false)
                return
            }
            try {
                const res = await axios.get(`${resolvedApiBase}/orders/?abha_id=${encodeURIComponent(currentPatient.abha_id)}`)
                setOrders((res.data.orders || []).reverse())
            } catch { } finally { setLoading(false) }
        }
        fetchOrders()
        const intervalId = setInterval(fetchOrders, 10000)
        return () => clearInterval(intervalId)
    }, [currentPatient?.abha_id, resolvedApiBase])

    const cancelOrder = async (orderId) => {
        if (!currentPatient?.abha_id) return
        setActionLoading(orderId)
        setActionError('')
        try {
            await axios.post(`${resolvedApiBase}${API_ENDPOINTS.ORDERS_CANCEL(orderId)}`, {
                abha_id: currentPatient.abha_id,
                reason: 'Cancelled by patient from My Orders',
            })
            const res = await axios.get(`${resolvedApiBase}/orders/?abha_id=${encodeURIComponent(currentPatient.abha_id)}`)
            setOrders((res.data.orders || []).reverse())
        } catch (err) {
            setActionError(err?.response?.data?.detail || 'Unable to cancel order right now.')
        } finally {
            setActionLoading(null)
        }
    }

    const filtered = orders.filter(o => {
        if (filter !== 'all' && o.status.toLowerCase() !== filter) return false
        if (search && !o.medicine_name.toLowerCase().includes(search.toLowerCase())) return false
        return true
    })

    const totalSpend = orders.reduce((s, o) => s + parseFloat(o.total_amount || 0), 0)
    const completedCt = orders.filter(o => ['completed', 'fulfilled'].includes(o.status.toLowerCase())).length

    return (
        <div className="p-6 max-w-5xl mx-auto animate-fade-in space-y-6">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-black text-white flex items-center gap-3">
                    <ClipboardList className="w-6 h-6 text-indigo-400" /> My Orders
                </h1>
                <p className="text-slate-500 text-sm mt-1">Track all your pharmacy orders in one place.</p>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Total Orders', val: orders.length, icon: Package, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                    { label: 'Completed', val: completedCt, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    { label: 'Total Spend', val: `₹${totalSpend.toFixed(0)}`, icon: IndianRupee, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                    { label: 'Pending', val: orders.filter(o => o.status === 'pending').length, icon: Clock, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                ].map(({ label, val, icon: Icon, color, bg }) => (
                    <div key={label} className="glass-card p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`w-5 h-5 ${color}`} />
                        </div>
                        <div>
                            <p className="text-xl font-black text-white">{val}</p>
                            <p className="text-xs text-slate-500">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters + search */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input type="text" placeholder="Search medicines..." value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="input-field pl-9 py-2.5 text-sm" />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {['all', 'completed', 'pending', 'fulfilled'].map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${filter === f ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}>
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders list */}
            {actionError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {actionError}
                </div>
            )}
            {loading ? (
                <div className="text-center py-16 text-slate-500">
                    <RotateCcw className="w-8 h-8 mx-auto mb-3 animate-spin opacity-40" />
                    Loading orders...
                </div>
            ) : filtered.length === 0 ? (
                <div className="glass-card py-20 text-center">
                    <Pill className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                    <p className="text-slate-500">No orders found</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((order, i) => {
                        const statusStyle = STATUS_STYLES[order.status?.toLowerCase()] || STATUS_STYLES.pending
                        const StatusIcon = statusStyle.icon
                        const isOpen = expanded === i

                        return (
                            <div key={order.order_id || i} className="glass-card-hover overflow-hidden">
                                <button
                                    onClick={() => setExpanded(isOpen ? null : i)}
                                    className="w-full flex items-center gap-4 p-5 text-left"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
                                        <Pill className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-white text-sm">{order.medicine_name}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {order.purchase_date} · Qty {order.quantity} · {order.dosage_frequency}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <span className="font-black text-white text-base">₹{parseFloat(order.total_amount).toFixed(0)}</span>
                                        <span className={`badge ${statusStyle.pill}`}>
                                            <StatusIcon className="w-3 h-3" />
                                            {statusStyle.label}
                                        </span>
                                        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                                    </div>
                                </button>

                                {isOpen && (
                                    <div className="px-5 pb-5 border-t border-white/5 pt-4 space-y-4 animate-slide-up">
                                        <div>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold mb-2">Order Timeline</p>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                {buildTimeline(order).map((step, idx) => (
                                                    <div key={`${order.order_id}-${step.step}-${idx}`} className={`rounded-xl border px-3 py-2 ${step.done ? 'border-emerald-500/25 bg-emerald-500/10' : 'border-white/10 bg-white/5'}`}>
                                                        <p className={`text-[10px] font-semibold ${step.done ? 'text-emerald-400' : 'text-slate-500'}`}>{step.label}</p>
                                                        <p className="text-[10px] text-slate-600 mt-1">{step.done ? 'Reached' : 'Pending'}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-[10px] text-slate-600 mt-2">Ordered on {order.purchase_date} · Next refill {order.next_refill_date || '—'}</p>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        {[
                                            { label: 'Order ID', val: order.order_id },
                                            { label: 'Patient', val: order.patient_name },
                                            { label: 'Medicine ID', val: order.medicine_id },
                                            { label: 'Next Refill', val: order.next_refill_date },
                                            { label: 'Total', val: `₹${parseFloat(order.total_amount).toFixed(2)}` },
                                            { label: 'Has Rx', val: order.has_prescription ? 'Yes ✓' : 'No (OTC)' },
                                            { label: 'Rx File', val: order.prescription_file_name || '—' },
                                            { label: 'Rx OCR', val: order.prescription_scan_summary || '—' },
                                        ].map(({ label, val }) => (
                                            <div key={label}>
                                                <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">{label}</p>
                                                <p className="text-sm text-white font-semibold mt-0.5 font-mono">{val || '—'}</p>
                                            </div>
                                        ))}
                                        {order.tx_id && (
                                            <div className="col-span-full">
                                                <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Transaction ID (Ledger)</p>
                                                <p className="text-xs text-emerald-400 font-mono mt-0.5">{order.tx_id}</p>
                                            </div>
                                        )}
                                        {['pending', 'approved', 'completed'].includes((order.status || '').toLowerCase()) && (
                                            <div className="col-span-full flex justify-end">
                                                <button
                                                    onClick={() => cancelOrder(order.order_id)}
                                                    disabled={actionLoading === order.order_id}
                                                    className="px-3 py-2 rounded-xl text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 transition-all disabled:opacity-50"
                                                >
                                                    {actionLoading === order.order_id ? 'Cancelling…' : 'Cancel & Refund'}
                                                </button>
                                            </div>
                                        )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
