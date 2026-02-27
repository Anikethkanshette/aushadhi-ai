import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react'

export default function OrdersQueue({ apiBase }) {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(null)

    const fetchOrders = async () => {
        try {
            const res = await axios.get(`${apiBase}/pharmacist/orders`)
            setOrders(res.data.orders)
        } catch (e) {
            console.error('Failed to load orders', e)
        } finally { setLoading(false) }
    }

    useEffect(() => {
        fetchOrders()
    }, [apiBase])

    const updateStatus = async (orderId, status) => {
        setActionLoading(orderId)
        try {
            await axios.put(`${apiBase}/pharmacist/orders/${orderId}/status?status=${status}`)
            await fetchOrders() // refresh
        } catch (e) {
            console.error('Failed to update status', e)
        } finally {
            setActionLoading(null)
        }
    }

    if (loading) return <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-500" /></div>

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white">Orders Queue</h3>

            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-gray-400 text-sm border-b border-white/10">
                        <tr>
                            <th className="p-4 font-medium">Order ID</th>
                            <th className="p-4 font-medium">Patient</th>
                            <th className="p-4 font-medium">Medicine</th>
                            <th className="p-4 font-medium">Date</th>
                            <th className="p-4 font-medium">Status</th>
                            <th className="p-4 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {orders.map(order => (
                            <tr key={order.order_id} className="hover:bg-white/5 transition-colors">
                                <td className="p-4 text-sm font-mono text-teal-400">{order.order_id}</td>
                                <td className="p-4">
                                    <div className="text-white font-medium">{order.patient_name}</div>
                                    <div className="text-xs text-gray-500 font-mono">{order.abha_id}</div>
                                </td>
                                <td className="p-4">
                                    <div className="text-white">{order.medicine_name}</div>
                                    <div className="text-xs text-gray-400">Qty: {order.quantity} · ₹{order.total_amount}</div>
                                </td>
                                <td className="p-4 text-sm text-gray-400">{order.purchase_date}</td>
                                <td className="p-4">
                                    <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium border
                                        ${order.status === 'completed' || order.status === 'fulfilled' ? 'bg-green-500/10 text-green-400 border-green-500/20' : ''}
                                        ${order.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : ''}
                                        ${order.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' : ''}
                                        ${order.status === 'approved' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : ''}
                                    `}>
                                        {order.status === 'pending' && <Clock size={12} />}
                                        {(order.status === 'completed' || order.status === 'fulfilled') && <CheckCircle2 size={12} />}
                                        {order.status === 'rejected' && <XCircle size={12} />}
                                        <span className="capitalize">{order.status}</span>
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    {order.status === 'pending' && (
                                        <div className="flex justify-end space-x-2">
                                            <button
                                                onClick={() => updateStatus(order.order_id, 'approved')}
                                                disabled={actionLoading === order.order_id}
                                                className="px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => updateStatus(order.order_id, 'rejected')}
                                                disabled={actionLoading === order.order_id}
                                                className="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    )}
                                    {order.status === 'approved' && (
                                        <button
                                            onClick={() => updateStatus(order.order_id, 'fulfilled')}
                                            disabled={actionLoading === order.order_id}
                                            className="px-4 py-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center space-x-2 ml-auto"
                                        >
                                            {actionLoading === order.order_id && <Loader2 size={14} className="animate-spin" />}
                                            <span>Fulfill Order</span>
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
