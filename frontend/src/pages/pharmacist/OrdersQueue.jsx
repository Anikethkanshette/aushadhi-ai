import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import {
    CheckCircle2, Clock, XCircle, Loader2, RefreshCw,
    Pill, IndianRupee, User, Calendar, PackageCheck,
    ChevronRight, AlertTriangle, TrendingUp, Filter
} from 'lucide-react'
import { API_CONFIG } from '../../config'

const STATUS = {
    pending: { pill: 'badge-yellow', icon: Clock, label: 'Pending' },
    approved: { pill: 'badge-blue', icon: ChevronRight, label: 'Approved' },
    fulfilled: { pill: 'badge-green', icon: CheckCircle2, label: 'Fulfilled' },
    completed: { pill: 'badge-green', icon: CheckCircle2, label: 'Completed' },
    rejected: { pill: 'badge-red', icon: XCircle, label: 'Rejected' },
}

export default function OrdersQueue({ apiBase }) {
    const resolvedApiBase = apiBase || API_CONFIG.BASE_URL
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(null)
    const [filter, setFilter] = useState('all')
    const [justUpdated, setJustUpdated] = useState(null)
    const intervalRef = useRef(null)
    const [selectedOrderIds, setSelectedOrderIds] = useState([])
    const [bulkLoading, setBulkLoading] = useState(false)
    const [actionError, setActionError] = useState('')

    const fetchOrders = async (silent = false) => {
        if (!silent) setLoading(true)
        try {
            const res = await axios.get(`${resolvedApiBase}/pharmacist/orders`)
            setOrders(res.data.orders || [])
        } catch { }
        finally { setLoading(false) }
    }

    useEffect(() => {
        fetchOrders()
        intervalRef.current = setInterval(() => fetchOrders(true), 15000)
        return () => clearInterval(intervalRef.current)
    }, [resolvedApiBase])

    const updateStatus = async (orderId, status) => {
        setActionLoading(orderId)
        setActionError('')
        try {
            await axios.put(`${resolvedApiBase}/pharmacist/orders/${orderId}/status?status=${status}`)
            setJustUpdated(orderId)
            setTimeout(() => setJustUpdated(null), 2000)
            await fetchOrders(true)
        } catch {
            setActionError('Failed to update order status. Please try again.')
        }
        finally { setActionLoading(null) }
    }

    const toggleOrderSelection = (orderId) => {
        setSelectedOrderIds(prev => prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId])
    }

    const runBulkUpdate = async (status) => {
        if (selectedOrderIds.length === 0) {
            setActionError('Select at least one order for bulk update.')
            return
        }
        setBulkLoading(true)
        setActionError('')
        try {
            await axios.put(`${resolvedApiBase}/pharmacist/orders/bulk-status`, {
                order_ids: selectedOrderIds,
                status,
            })
            setSelectedOrderIds([])
            await fetchOrders(true)
        } catch {
            setActionError('Bulk update failed. Please retry.')
        } finally {
            setBulkLoading(false)
        }
    }

    const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)
    const counts = Object.fromEntries(
        ['all', 'pending', 'approved', 'fulfilled', 'rejected'].map(s => [
            s, s === 'all' ? orders.length : orders.filter(o => o.status === s).length
        ])
    )

    return (
        <div className="p-8 max-w-6xl space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-2">
                        <PackageCheck className="w-6 h-6 text-blue-400" /> Order Queue
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Approve, fulfill or reject patient orders in real-time.</p>
                </div>
                <button onClick={() => fetchOrders()} className="btn-secondary text-sm gap-2 px-4 py-2.5">
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>

            {/* Summary strip */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {[['all', 'All', counts.all, 'text-white'], ['pending', 'Pending', counts.pending, 'text-amber-400'], ['approved', 'Approved', counts.approved, 'text-blue-400'], ['fulfilled', 'Fulfilled', counts.fulfilled, 'text-emerald-400'], ['rejected', 'Rejected', counts.rejected, 'text-red-400']].map(([k, l, n, c]) => (
                    <button key={k} onClick={() => setFilter(k)}
                        className={`glass-card p-3 text-center transition-all hover:scale-[1.03] border ${filter === k ? 'border-white/20 bg-white/8' : 'border-white/5'}`}>
                        <p className={`text-xl font-black ${c}`}>{n}</p>
                        <p className="text-slate-500 text-xs font-semibold">{l}</p>
                    </button>
                ))}
            </div>

            {/* Table */}
            {actionError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {actionError}
                </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
                <button
                    onClick={() => runBulkUpdate('approved')}
                    disabled={bulkLoading || selectedOrderIds.length === 0}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/25 disabled:opacity-50"
                >
                    Bulk Approve
                </button>
                <button
                    onClick={() => runBulkUpdate('fulfilled')}
                    disabled={bulkLoading || selectedOrderIds.length === 0}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 disabled:opacity-50"
                >
                    Bulk Fulfill
                </button>
                <button
                    onClick={() => runBulkUpdate('rejected')}
                    disabled={bulkLoading || selectedOrderIds.length === 0}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/25 disabled:opacity-50"
                >
                    Bulk Reject
                </button>
                <span className="text-xs text-slate-500">Selected: {selectedOrderIds.length}</span>
            </div>
            {loading ? (
                <div className="flex items-center justify-center py-20 glass-card">
                    <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="glass-card py-20 text-center">
                    <PackageCheck className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                    <p className="text-slate-500 font-medium">No {filter !== 'all' ? filter : ''} orders</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(order => {
                        const st = STATUS[order.status] || STATUS.pending
                        const StIcon = st.icon
                        const isActing = actionLoading === order.order_id
                        return (
                            <div key={order.order_id}
                                className={`glass-card-hover p-5 transition-all ${justUpdated === order.order_id ? 'border-emerald-500/30' : ''}`}>
                                <div className="grid grid-cols-1 sm:grid-cols-6 gap-4 items-center">
                                    <div>
                                        <input
                                            type="checkbox"
                                            checked={selectedOrderIds.includes(order.order_id)}
                                            onChange={() => toggleOrderSelection(order.order_id)}
                                        />
                                    </div>
                                    {/* Order ID */}
                                    <div>
                                        <p className="text-teal-400 font-bold text-xs font-mono mb-1">{order.order_id}</p>
                                        <p className="text-slate-500 text-[10px]">{order.purchase_date}</p>
                                    </div>

                                    {/* Patient */}
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                                            {order.patient_name?.[0] || 'P'}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-white font-semibold text-sm truncate">{order.patient_name}</p>
                                            <p className="text-slate-600 text-[10px] font-mono">{order.abha_id}</p>
                                        </div>
                                    </div>

                                    {/* Medicine */}
                                    <div>
                                        <p className="text-white text-sm font-medium truncate max-w-[180px]">{order.medicine_name}</p>
                                        <p className="text-slate-500 text-xs mt-0.5">Qty {order.quantity} · ₹{parseFloat(order.total_amount).toFixed(2)}</p>
                                    </div>

                                    {/* Status badge */}
                                    <div>
                                        <span className={`badge ${st.pill} gap-1.5`}>
                                            <StIcon className="w-3 h-3" />
                                            {st.label}
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 justify-end">
                                        {order.status === 'pending' && (
                                            <>
                                                <button onClick={() => updateStatus(order.order_id, 'approved')}
                                                    disabled={isActing}
                                                    className="px-3 py-2 rounded-xl text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/25 hover:bg-blue-500/25 transition-all disabled:opacity-50">
                                                    {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Approve'}
                                                </button>
                                                <button onClick={() => updateStatus(order.order_id, 'rejected')}
                                                    disabled={isActing}
                                                    className="px-3 py-2 rounded-xl text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 transition-all disabled:opacity-50">
                                                    Reject
                                                </button>
                                            </>
                                        )}
                                        {order.status === 'approved' && (
                                            <button onClick={() => updateStatus(order.order_id, 'fulfilled')}
                                                disabled={isActing}
                                                className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-600/25 hover:shadow-teal-500/40 transition-all disabled:opacity-50 flex items-center gap-1.5">
                                                {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                                Fulfill
                                            </button>
                                        )}
                                        {(order.status === 'fulfilled' || order.status === 'completed') && (
                                            <span className="text-xs text-emerald-400 flex items-center gap-1">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Done
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
