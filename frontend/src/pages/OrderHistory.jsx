import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { ShoppingBag, Pill, Calendar, RefreshCw, TrendingDown } from 'lucide-react'
import { getPatientOrders } from '../db'

export default function OrderHistory({ patient, apiBase }) {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [totalSpend, setTotalSpend] = useState(0)

    useEffect(() => {
        async function load() {
            try {
                const res = await axios.get(`${apiBase}/orders/?abha_id=${patient.abha_id}`)
                const data = res.data.orders || []
                setOrders(data.reverse())
                const total = data.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
                setTotalSpend(total)
            } catch {
                const local = await getPatientOrders(patient.abha_id)
                setOrders(local.reverse())
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [patient])

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Order History</h2>
                    <p className="text-slate-400 text-sm mt-1">Your past medicine orders</p>
                </div>
                {!loading && (
                    <div className="text-right glass-card px-4 py-3">
                        <p className="text-xs text-slate-400">Total Spend</p>
                        <p className="text-xl font-bold text-indigo-400">₹{totalSpend.toFixed(0)}</p>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="glass-card p-5 animate-pulse h-20 bg-white/3" />
                    ))}
                </div>
            ) : orders.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                    <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium">No orders yet</p>
                    <p className="text-sm mt-1">Medicines you order will appear here</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map((order, i) => (
                        <div
                            key={order.order_id || i}
                            className="glass-card p-5 flex items-center gap-4 hover:border-white/20 transition-all animate-slide-up"
                        >
                            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                                <Pill className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-white font-semibold text-sm">{order.medicine_name}</h3>
                                    <span className="badge badge-green">{order.status || 'completed'}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> {order.purchase_date}
                                    </span>
                                    <span className="text-xs text-slate-400">Qty: {order.quantity}</span>
                                    <span className="text-xs text-slate-400">{order.dosage_frequency}</span>
                                </div>
                                {order.next_refill_date && (
                                    <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                                        <RefreshCw className="w-3 h-3" /> Next refill: {order.next_refill_date}
                                    </p>
                                )}
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className="text-lg font-bold text-white">₹{Number(order.total_amount).toFixed(0)}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{order.order_id}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
