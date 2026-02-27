import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Search, Pill, AlertTriangle, CheckCircle, ShoppingCart, Filter, X } from 'lucide-react'
import { searchMedicinesLocal } from '../db'

export default function MedicineSearch({ patient, apiBase }) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [selectedMed, setSelectedMed] = useState(null)
    const [orderStatus, setOrderStatus] = useState(null)
    const [filter, setFilter] = useState({ category: '', rxOnly: false })
    const [categories, setCategories] = useState([])

    useEffect(() => {
        async function loadAll() {
            const all = await searchMedicinesLocal('')
            setResults(all)
            const cats = [...new Set(all.map(m => m.category).filter(Boolean))]
            setCategories(cats)
        }
        loadAll()
    }, [])

    const handleSearch = async (q) => {
        setQuery(q)
        setLoading(true)
        try {
            const res = await axios.get(`${apiBase}/medicines/?search=${q}`)
            let data = res.data.medicines || []
            if (filter.rxOnly) data = data.filter(m => m.prescription_required)
            if (filter.category) data = data.filter(m => m.category === filter.category)
            setResults(data)
        } catch {
            const local = await searchMedicinesLocal(q)
            setResults(local)
        } finally {
            setLoading(false)
        }
    }

    const placeOrder = async (med) => {
        setOrderStatus({ loading: true, medId: med.id })
        try {
            const res = await axios.post(`${apiBase}/orders/`, {
                patient_id: patient.patient_id,
                patient_name: patient.name,
                abha_id: patient.abha_id,
                medicine_id: med.id,
                medicine_name: med.name,
                quantity: 1,
                dosage_frequency: 'As directed',
                has_prescription: false,
            })
            setOrderStatus({ success: true, medId: med.id, message: 'Order placed! ' + res.data.order?.order_id })
        } catch (e) {
            const msg = e.response?.data?.detail || 'Order failed'
            setOrderStatus({ error: true, medId: med.id, message: msg })
        }
        setTimeout(() => setOrderStatus(null), 4000)
    }

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <div>
                <h2 className="text-2xl font-bold text-white">Medicine Finder</h2>
                <p className="text-slate-400 text-sm mt-1">Search the pharmacy catalogue</p>
            </div>

            {/* Search + filter */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        id="medicine-search"
                        type="text"
                        value={query}
                        onChange={e => handleSearch(e.target.value)}
                        placeholder="Search medicine name or generic..."
                        className="input-field pl-10"
                    />
                    {query && (
                        <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white" onClick={() => handleSearch('')}>
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <select
                    value={filter.category}
                    onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}
                    className="input-field sm:w-48"
                >
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button
                    onClick={() => setFilter(f => ({ ...f, rxOnly: !f.rxOnly }))}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${filter.rxOnly ? 'border-amber-500/40 bg-amber-500/10 text-amber-400' : 'border-white/20 text-slate-400 hover:border-white/40'
                        }`}
                >
                    <Filter className="w-4 h-4" /> Rx Only
                </button>
            </div>

            {/* Results */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="glass-card p-5 animate-pulse h-36 bg-white/3" />
                    ))
                ) : results.length === 0 ? (
                    <div className="col-span-full text-center py-16 text-slate-500">
                        <Pill className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No medicines found for "{query}"</p>
                    </div>
                ) : results.map(med => {
                    const inStock = med.stock_quantity > 0
                    const status = orderStatus?.medId === med.id ? orderStatus : null
                    return (
                        <div key={med.id} className="glass-card p-5 hover:border-indigo-500/40 transition-all duration-200 group">
                            <div className="flex items-start justify-between mb-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                                    <Pill className="w-5 h-5 text-indigo-400" />
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    <span className={inStock ? 'badge badge-green' : 'badge badge-red'}>
                                        {inStock ? '✓ In Stock' : 'Out of Stock'}
                                    </span>
                                    {med.prescription_required && (
                                        <span className="badge badge-yellow">Rx</span>
                                    )}
                                </div>
                            </div>

                            <h3 className="text-white font-semibold text-sm mb-0.5 group-hover:text-indigo-300 transition-colors">{med.name}</h3>
                            <p className="text-slate-400 text-xs mb-3">{med.generic_name} · {med.category}</p>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-lg font-bold text-white">₹{med.price}</p>
                                    <p className="text-xs text-slate-500">{med.stock_quantity} {med.unit}s</p>
                                </div>
                                <button
                                    id={`order-${med.id}`}
                                    onClick={() => placeOrder(med)}
                                    disabled={!inStock || !!status?.loading}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                                >
                                    <ShoppingCart className="w-3.5 h-3.5" />
                                    Order
                                </button>
                            </div>

                            {status && (
                                <div className={`mt-3 rounded-xl px-3 py-2 text-xs flex items-center gap-2 ${status.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : status.error ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                            : 'bg-indigo-500/10 text-indigo-400'
                                    }`}>
                                    {status.success ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                                    {status.message || 'Processing...'}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
