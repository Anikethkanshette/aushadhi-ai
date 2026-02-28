import React, { useState, useEffect } from 'react'
import axios from 'axios'
import {
    Download, FileSpreadsheet, Users, ShoppingBag, Package,
    CheckCircle, Loader2, TrendingUp, AlertTriangle, RefreshCw
} from 'lucide-react'

const EXPORTS = [
    {
        id: 'orders',
        title: 'Order History',
        desc: 'All patient orders with medicines, payment & refill dates',
        icon: ShoppingBag,
        color: '#6366f1',
        bg: 'from-indigo-500/20 to-indigo-600/5',
        border: 'border-indigo-500/20',
        endpoint: '/pharmacist/export/orders',
        filename: `AushadhiAI_Orders_${new Date().toISOString().slice(0, 10)}.xlsx`,
    },
    {
        id: 'products',
        title: 'Product Catalogue',
        desc: '49 real pharmaceutical products with stock, pricing & supplier data',
        icon: Package,
        color: '#10b981',
        bg: 'from-emerald-500/20 to-emerald-600/5',
        border: 'border-emerald-500/20',
        endpoint: '/pharmacist/export/products',
        filename: `AushadhiAI_Products_${new Date().toISOString().slice(0, 10)}.xlsx`,
    },
    {
        id: 'patients',
        title: 'Patient Registry',
        desc: 'Full patient health profiles: conditions, allergies, medications & metrics',
        icon: Users,
        color: '#a855f7',
        bg: 'from-purple-500/20 to-purple-600/5',
        border: 'border-purple-500/20',
        endpoint: '/pharmacist/export/patients',
        filename: `AushadhiAI_Patients_${new Date().toISOString().slice(0, 10)}.xlsx`,
    },
]

export default function ExportManager({ apiBase }) {
    const [status, setStatus] = useState({})   // { id: 'loading'|'done'|'error' }
    const [counts, setCounts] = useState({ orders: 0, products: 0, patients: 0 })

    useEffect(() => {
        const fetchCounts = async () => {
            try {
                const [oRes, pRes] = await Promise.allSettled([
                    axios.get(`${apiBase}/pharmacist/stats`),
                    axios.get(`${apiBase}/patients/`),
                ])
                if (oRes.status === 'fulfilled') {
                    setCounts(c => ({ ...c, orders: oRes.value.data.total_orders || 0, products: oRes.value.data.total_medicines || 0 }))
                }
                if (pRes.status === 'fulfilled') {
                    setCounts(c => ({ ...c, patients: pRes.value.data.total || 0 }))
                }
            } catch { }
        }
        fetchCounts()
    }, [apiBase])

    const handleDownload = async (exp) => {
        setStatus(s => ({ ...s, [exp.id]: 'loading' }))
        try {
            const res = await axios.get(`${apiBase}${exp.endpoint}`, { responseType: 'blob' })
            const url = URL.createObjectURL(new Blob([res.data]))
            const a = document.createElement('a')
            a.href = url; a.download = exp.filename; a.click()
            URL.revokeObjectURL(url)
            setStatus(s => ({ ...s, [exp.id]: 'done' }))
            setTimeout(() => setStatus(s => ({ ...s, [exp.id]: null })), 3000)
        } catch (e) {
            setStatus(s => ({ ...s, [exp.id]: 'error' }))
            setTimeout(() => setStatus(s => ({ ...s, [exp.id]: null })), 4000)
        }
    }

    const countMap = { orders: counts.orders, products: counts.products, patients: counts.patients }

    return (
        <div className="p-8 max-w-5xl space-y-8 animate-fade-in">

            {/* Header */}
            <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-3">
                    <FileSpreadsheet className="w-7 h-7 text-emerald-400" />
                    Data Export Center
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                    Download live data from your pharmacy — orders, inventory, and patient registry — as formatted Excel files.
                </p>
            </div>

            {/* Info banner */}
            <div className="flex items-center gap-4 p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
                <TrendingUp className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                    <p className="text-emerald-300 text-sm font-semibold">Live Data Exports</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                        All exports pull the latest data in real-time. Low-stock products are highlighted in red in the Products export.
                    </p>
                </div>
                <RefreshCw className="w-4 h-4 text-emerald-500 ml-auto flex-shrink-0" />
            </div>

            {/* Export cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {EXPORTS.map((exp) => {
                    const Icon = exp.icon
                    const st = status[exp.id]
                    const cnt = countMap[exp.id]

                    return (
                        <div key={exp.id}
                            className={`glass-card p-6 border ${exp.border} bg-gradient-to-br ${exp.bg} flex flex-col gap-5 transition-all hover:scale-[1.02]`}>
                            {/* Icon + count */}
                            <div className="flex items-start justify-between">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                                    style={{ background: `${exp.color}25` }}>
                                    <Icon className="w-6 h-6" style={{ color: exp.color }} />
                                </div>
                                {cnt > 0 && (
                                    <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                                        style={{ background: `${exp.color}20`, color: exp.color }}>
                                        {cnt} rows
                                    </span>
                                )}
                            </div>

                            {/* Title/desc */}
                            <div>
                                <h3 className="font-bold text-white text-base mb-1">{exp.title}</h3>
                                <p className="text-slate-500 text-xs leading-relaxed">{exp.desc}</p>
                            </div>

                            {/* Extension tag */}
                            <div className="flex items-center gap-2">
                                <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                                <span className="text-slate-500 text-xs font-mono">{exp.filename.split('/').pop()}</span>
                            </div>

                            {/* Download button */}
                            <button
                                onClick={() => handleDownload(exp)}
                                disabled={st === 'loading'}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-60"
                                style={{
                                    background: st === 'done' ? 'linear-gradient(135deg, #059669, #10b981)'
                                        : st === 'error' ? 'linear-gradient(135deg, #dc2626, #ef4444)'
                                            : `linear-gradient(135deg, ${exp.color}CC, ${exp.color})`,
                                    color: '#fff',
                                    boxShadow: `0 4px 20px ${exp.color}40`,
                                }}
                            >
                                {st === 'loading' && <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>}
                                {st === 'done' && <><CheckCircle className="w-4 h-4" /> Downloaded!</>}
                                {st === 'error' && <><AlertTriangle className="w-4 h-4" /> Error – Retry</>}
                                {!st && <><Download className="w-4 h-4" /> Export as Excel</>}
                            </button>
                        </div>
                    )
                })}
            </div>

            {/* Tips */}
            <div className="glass-card p-5 border border-white/5">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" /> Export Notes
                </h3>
                <ul className="space-y-2 text-xs text-slate-500">
                    <li className="flex gap-2"><span className="text-emerald-400">•</span> <b className="text-slate-400">Orders:</b> Includes all completed & pending orders from the live database (order_history.csv + new orders)</li>
                    <li className="flex gap-2"><span className="text-emerald-400">•</span> <b className="text-slate-400">Products:</b> 49 real pharmaceutical products from medicines.csv — <span className="text-red-400">low-stock rows highlighted in red</span></li>
                    <li className="flex gap-2"><span className="text-emerald-400">•</span> <b className="text-slate-400">Patients:</b> Full health profiles including blood group, conditions, medications, allergies & last visit</li>
                    <li className="flex gap-2"><span className="text-amber-400">•</span> All exports include styled headers, frozen top row, and auto-fit columns for easy readability</li>
                </ul>
            </div>
        </div>
    )
}
