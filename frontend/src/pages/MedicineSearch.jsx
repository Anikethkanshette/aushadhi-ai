import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Search, Pill, AlertTriangle, CheckCircle, ShoppingCart, Filter, X } from 'lucide-react'
import { searchMedicinesLocal } from '../db'

export default function MedicineSearch({ patient, apiBase }) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [filter, setFilter] = useState({ category: '', rxOnly: false })
    const [categories, setCategories] = useState([])

    // Checkout Modal State
    const [checkoutMed, setCheckoutMed] = useState(null)
    const [quantity, setQuantity] = useState(1)
    const [hasRx, setHasRx] = useState(false)
    const [checkoutState, setCheckoutState] = useState('idle') // idle, processing, success, error
    const [checkoutResult, setCheckoutResult] = useState(null)
    const [checkoutError, setCheckoutError] = useState('')

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

    const openCheckout = (med) => {
        setCheckoutMed(med)
        setQuantity(1)
        setHasRx(false)
        setCheckoutState('idle')
        setCheckoutResult(null)
        setCheckoutError('')
    }

    const placeOrder = async () => {
        if (!checkoutMed) return
        setCheckoutState('processing')
        setCheckoutError('')

        try {
            const res = await axios.post(`${apiBase}/orders/`, {
                patient_id: patient.patient_id,
                patient_name: patient.name,
                abha_id: patient.abha_id,
                medicine_id: checkoutMed.id,
                medicine_name: checkoutMed.name,
                quantity: parseInt(quantity, 10),
                dosage_frequency: 'As directed',
                has_prescription: hasRx,
            })
            setCheckoutResult(res.data)
            setCheckoutState('success')
        } catch (e) {
            const msg = e.response?.data?.detail || 'Order failed to process.'
            setCheckoutError(msg)
            setCheckoutState('error')
        }
    }

    const closeCheckout = () => {
        setCheckoutMed(null)
        if (checkoutState === 'success') {
            // refresh stock
            handleSearch(query)
        }
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
                                    onClick={() => openCheckout(med)}
                                    disabled={!inStock}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                                >
                                    <ShoppingCart className="w-3.5 h-3.5" />
                                    Order
                                </button>
                            </div>

                            {/* Removed inline status */}
                        </div>
                    )
                })}
            </div>

            {/* Checkout Modal */}
            {checkoutMed && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-800/50">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5 text-indigo-400" />
                                {checkoutState === 'success' ? 'Order Successful' : 'Checkout'}
                            </h3>
                            <button onClick={closeCheckout} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5 overflow-y-auto custom-scrollbar">
                            {checkoutState === 'idle' || checkoutState === 'processing' || checkoutState === 'error' ? (
                                <div className="space-y-5">
                                    <div className="glass-card p-4 bg-white/5 border-white/10">
                                        <h4 className="font-semibold text-white">{checkoutMed.name}</h4>
                                        <p className="text-sm text-slate-400 flex justify-between mt-1">
                                            <span>Price per {checkoutMed.unit}: </span>
                                            <span className="text-white">₹{checkoutMed.price}</span>
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Quantity</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max={checkoutMed.stock_quantity}
                                            value={quantity}
                                            onChange={(e) => setQuantity(e.target.value)}
                                            className="input-field w-full"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">Available stock: {checkoutMed.stock_quantity}</p>
                                    </div>

                                    {checkoutMed.prescription_required && (
                                        <div className="glass-card p-4 border-amber-500/30 bg-amber-500/5">
                                            <div className="flex items-start gap-3">
                                                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                                <div>
                                                    <h5 className="text-sm font-medium text-amber-400">Prescription Required</h5>
                                                    <p className="text-xs text-slate-400 mt-1 mb-3">This medicine requires a valid prescription to dispense.</p>

                                                    <label className="flex items-center gap-2 cursor-pointer group">
                                                        <div className="relative flex items-center justify-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={hasRx}
                                                                onChange={(e) => setHasRx(e.target.checked)}
                                                                className="peer sr-only"
                                                            />
                                                            <div className="w-5 h-5 rounded border border-slate-600 bg-slate-800 peer-checked:bg-indigo-500 peer-checked:border-indigo-500 transition-colors"></div>
                                                            <CheckCircle className="w-3.5 h-3.5 text-white absolute opacity-0 peer-checked:opacity-100 transition-opacity" />
                                                        </div>
                                                        <span className="text-sm text-slate-300 group-hover:text-white transition-colors">I confirm I have a valid Rx</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {checkoutError && (
                                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
                                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                                            <p>{checkoutError}</p>
                                        </div>
                                    )}
                                </div>
                            ) : checkoutState === 'success' && checkoutResult ? (
                                <div className="space-y-4 animate-slide-up">
                                    <div className="text-center py-4">
                                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                                            <CheckCircle className="w-8 h-8" />
                                        </div>
                                        <h4 className="text-xl font-bold text-white">{checkoutResult.message}</h4>
                                        <p className="text-slate-400 text-sm mt-1">Txn ID: {checkoutResult.order.tx_id}</p>
                                    </div>

                                    <div className="glass-card p-4 space-y-3 bg-white/5">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-400">Payment Processed via</span>
                                            <span className="text-white font-medium">{checkoutResult.payment.method}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-400">Items Ordered</span>
                                            <span className="text-white font-medium">{checkoutResult.order.quantity}x {checkoutResult.order.medicine_name}</span>
                                        </div>
                                        {checkoutResult.welfare?.is_eligible && (
                                            <div className="flex justify-between items-center text-sm text-emerald-400 border-t border-white/5 pt-3 mt-3">
                                                <span>PMJAY Welfare Discount (20%)</span>
                                                <span>-₹{checkoutResult.welfare.discount_amount}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center font-bold text-lg border-t border-white/10 pt-3 mt-3">
                                            <span className="text-white">Amount Paid</span>
                                            <span className="text-indigo-400">₹{checkoutResult.payment.amount}</span>
                                        </div>
                                    </div>

                                    {checkoutResult.delivery && (
                                        <div className="glass-card p-4 bg-indigo-500/5 text-sm flex gap-3 border-indigo-500/20">
                                            <ShoppingCart className="w-5 h-5 text-indigo-400 shrink-0" />
                                            <div>
                                                <p className="font-medium text-white mb-1">Delivery Estimate</p>
                                                <p className="text-slate-400">{checkoutResult.delivery.message}</p>
                                                <p className="text-slate-500 mt-1 text-xs font-mono">Tracking: {checkoutResult.delivery.tracking_id}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>

                        {/* Footer */}
                        <div className="p-5 border-t border-slate-800 bg-slate-800/30 flex justify-end gap-3">
                            <button
                                onClick={closeCheckout}
                                className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-all font-medium text-sm"
                            >
                                {checkoutState === 'success' ? 'Done' : 'Cancel'}
                            </button>

                            {checkoutState !== 'success' && (
                                <button
                                    onClick={placeOrder}
                                    disabled={checkoutState === 'processing' || quantity < 1 || quantity > checkoutMed.stock_quantity || (checkoutMed.prescription_required && !hasRx)}
                                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {checkoutState === 'processing' ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Processing...
                                        </>
                                    ) : (
                                        `Pay ₹${(checkoutMed.price * quantity).toFixed(2)}`
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
