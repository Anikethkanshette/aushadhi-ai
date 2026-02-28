import React, { useState, useEffect } from 'react'
import axios from 'axios'
import {
    Search, Pill, AlertTriangle, CheckCircle, ShoppingCart,
    Filter, X, Loader2, Package, Star, Sparkles, CreditCard,
    Truck, TrendingUp
} from 'lucide-react'
import { searchMedicinesLocal } from '../db'

export default function MedicineSearch({ patient, apiBase }) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [filter, setFilter] = useState({ category: '', rxOnly: false })
    const [categories, setCategories] = useState([])

    // Checkout state
    const [checkoutMed, setCheckoutMed] = useState(null)
    const [quantity, setQuantity] = useState(1)
    const [hasRx, setHasRx] = useState(false)
    const [checkoutState, setCheckoutState] = useState('idle')
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
        } finally { setLoading(false) }
    }

    const openCheckout = (med) => {
        setCheckoutMed(med); setQuantity(1); setHasRx(false)
        setCheckoutState('idle'); setCheckoutResult(null); setCheckoutError('')
    }

    const placeOrder = async () => {
        if (!checkoutMed) return
        setCheckoutState('processing'); setCheckoutError('')
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
            setCheckoutError(e.response?.data?.detail || 'Order failed.')
            setCheckoutState('error')
        }
    }

    const closeCheckout = () => {
        setCheckoutMed(null)
        if (checkoutState === 'success') handleSearch(query)
    }

    return (
        <div className="p-6 space-y-6 animate-fade-in max-w-6xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black text-white flex items-center gap-3">
                    <Search className="w-6 h-6 text-emerald-400" /> Medicine Finder
                </h1>
                <p className="text-slate-500 text-sm mt-1">Browse 49 pharmaceutical products from our live inventory</p>
            </div>

            {/* Search bar */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input id="medicine-search" type="text" value={query}
                        onChange={e => handleSearch(e.target.value)}
                        placeholder="Search medicine or generic name…"
                        className="input-field pl-10 pr-10 py-3" />
                    {query && (
                        <button onClick={() => handleSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <button onClick={() => setFilter(f => ({ ...f, rxOnly: !f.rxOnly }))}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${filter.rxOnly ? 'border-amber-500/40 bg-amber-500/10 text-amber-400' : 'border-white/10 text-slate-500 hover:text-white hover:border-white/20'}`}>
                    <Filter className="w-4 h-4" /> Rx Only
                </button>
            </div>

            {/* Category chips */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {['All', ...categories].map(cat => {
                    const active = cat === 'All' ? !filter.category : filter.category === cat
                    return (
                        <button key={cat}
                            onClick={() => setFilter(f => ({ ...f, category: cat === 'All' ? '' : cat }))}
                            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${active ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-white/5 text-slate-500 hover:text-white hover:bg-white/10'}`}>
                            {cat}
                        </button>
                    )
                })}
            </div>

            {/* Results */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="glass-card h-40 animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
                    ))
                ) : results.length === 0 ? (
                    <div className="col-span-full glass-card py-20 text-center">
                        <Pill className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                        <p className="text-slate-500">No medicines found{query ? ` for "${query}"` : ''}</p>
                    </div>
                ) : results.map(med => {
                    const inStock = parseInt(med.stock_quantity) > 0
                    const isRx = med.prescription_required === true || med.prescription_required === 'true'
                    return (
                        <div key={med.id}
                            className={`glass-card p-5 border transition-all duration-200 hover:scale-[1.02] group cursor-default ${inStock ? 'border-white/5 hover:border-emerald-500/20' : 'border-white/5 opacity-60'}`}>
                            {/* Top */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                    <Pill className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div className="flex gap-1.5 flex-wrap justify-end">
                                    <span className={`badge text-[10px] ${inStock ? 'badge-green' : 'badge-red'}`}>
                                        {inStock ? '✓ In Stock' : 'Out of Stock'}
                                    </span>
                                    {isRx && <span className="badge badge-yellow text-[10px]">Rx</span>}
                                </div>
                            </div>

                            {/* Name */}
                            <h3 className="text-white font-bold text-sm leading-tight mb-1 group-hover:text-emerald-300 transition-colors line-clamp-2">{med.name}</h3>
                            <p className="text-slate-500 text-xs mb-4">{med.generic_name} · <span className="text-slate-600">{med.category}</span></p>

                            {/* Price + action */}
                            <div className="flex items-center justify-between mt-auto">
                                <div>
                                    <p className="text-xl font-black text-white">₹{parseFloat(med.price).toFixed(2)}</p>
                                    <p className="text-[11px] text-slate-600 mt-0.5">{med.stock_quantity} {med.unit}s left</p>
                                </div>
                                <button id={`order-${med.id}`}
                                    onClick={() => openCheckout(med)}
                                    disabled={!inStock}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                                    style={inStock ? { background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' } : {}}>
                                    <ShoppingCart className="w-3.5 h-3.5" />
                                    Order
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* ── Checkout Modal ── */}
            {checkoutMed && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-md rounded-3xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh] shadow-2xl shadow-black/60"
                        style={{ background: 'linear-gradient(135deg, #0d1b2a, #0a1628)' }}>

                        {/* Modal header */}
                        <div className="flex justify-between items-center px-6 py-5 border-b border-white/8">
                            <h3 className="text-lg font-black text-white flex items-center gap-2">
                                {checkoutState === 'success'
                                    ? <><CheckCircle className="w-5 h-5 text-emerald-400" /> Order Confirmed!</>
                                    : <><ShoppingCart className="w-5 h-5 text-indigo-400" /> Checkout</>}
                            </h3>
                            <button onClick={closeCheckout} className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal body */}
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                            {(checkoutState === 'idle' || checkoutState === 'processing' || checkoutState === 'error') && (
                                <div className="space-y-5">
                                    {/* Medicine summary */}
                                    <div className="rounded-2xl border border-indigo-500/15 bg-indigo-500/5 p-4">
                                        <p className="text-white font-bold text-base">{checkoutMed.name}</p>
                                        <p className="text-indigo-300/70 text-xs mt-0.5">{checkoutMed.generic_name}</p>
                                        <div className="flex items-center justify-between mt-3">
                                            <span className="text-slate-500 text-sm">Price / {checkoutMed.unit}</span>
                                            <span className="text-white font-black text-lg">₹{parseFloat(checkoutMed.price).toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {/* Quantity */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Quantity</label>
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                                className="w-10 h-10 rounded-xl bg-white/8 border border-white/10 text-white font-bold hover:bg-white/15 transition-all">−</button>
                                            <input type="number" min="1" max={checkoutMed.stock_quantity}
                                                value={quantity} onChange={e => setQuantity(Math.max(1, Math.min(checkoutMed.stock_quantity, parseInt(e.target.value) || 1)))}
                                                className="input-field text-center text-xl font-black w-20 py-2" />
                                            <button onClick={() => setQuantity(q => Math.min(checkoutMed.stock_quantity, q + 1))}
                                                className="w-10 h-10 rounded-xl bg-white/8 border border-white/10 text-white font-bold hover:bg-white/15 transition-all">+</button>
                                        </div>
                                        <p className="text-xs text-slate-600 mt-1.5">{checkoutMed.stock_quantity} units available</p>
                                    </div>

                                    {/* Rx checkbox */}
                                    {(checkoutMed.prescription_required === true || checkoutMed.prescription_required === 'true') && (
                                        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                                            <div className="flex items-start gap-3">
                                                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                                <div className="flex-1">
                                                    <p className="text-amber-300 font-semibold text-sm">Prescription Required</p>
                                                    <p className="text-slate-500 text-xs mt-1 mb-3">A valid prescription is required to dispense this medicine.</p>
                                                    <label className="flex items-center gap-3 cursor-pointer">
                                                        <div className="relative flex-shrink-0">
                                                            <input type="checkbox" checked={hasRx} onChange={e => setHasRx(e.target.checked)} className="peer sr-only" />
                                                            <div className="w-5 h-5 rounded-md border border-slate-600 bg-slate-800 peer-checked:bg-indigo-500 peer-checked:border-indigo-500 transition-colors flex items-center justify-center">
                                                                {hasRx && <CheckCircle className="w-3 h-3 text-white" />}
                                                            </div>
                                                        </div>
                                                        <span className="text-slate-300 text-sm">I confirm I have a valid prescription</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Total preview */}
                                    <div className="flex items-center justify-between py-3 border-t border-white/8">
                                        <span className="text-slate-400 text-sm">Total</span>
                                        <span className="text-white font-black text-xl">₹{(parseFloat(checkoutMed.price) * quantity).toFixed(2)}</span>
                                    </div>

                                    {checkoutError && (
                                        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm animate-slide-up">
                                            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {checkoutError}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Success view */}
                            {checkoutState === 'success' && checkoutResult && (
                                <div className="space-y-5 animate-slide-up">
                                    <div className="text-center py-4">
                                        <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-emerald-500/20">
                                            <CheckCircle className="w-10 h-10 text-emerald-400" />
                                        </div>
                                        <h4 className="text-xl font-black text-white">{checkoutResult.message}</h4>
                                        <p className="text-emerald-400/70 text-xs font-mono mt-1">Txn: {checkoutResult.order?.tx_id}</p>
                                    </div>

                                    <div className="glass-card border border-white/8 p-5 space-y-3">
                                        {[
                                            ['Medicine', `${checkoutResult.order?.quantity}× ${checkoutResult.order?.medicine_name}`],
                                            ['Payment via', checkoutResult.payment?.method],
                                        ].map(([k, v]) => (
                                            <div key={k} className="flex justify-between text-sm">
                                                <span className="text-slate-500">{k}</span>
                                                <span className="text-white font-semibold">{v}</span>
                                            </div>
                                        ))}
                                        {checkoutResult.welfare?.is_eligible && (
                                            <div className="flex justify-between text-sm text-emerald-400 border-t border-white/8 pt-3">
                                                <span>PMJAY 20% Discount</span>
                                                <span>−₹{checkoutResult.welfare?.discount_amount}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between font-black text-lg border-t border-white/10 pt-3">
                                            <span className="text-white">Amount Paid</span>
                                            <span className="text-indigo-400">₹{checkoutResult.payment?.amount}</span>
                                        </div>
                                    </div>

                                    {checkoutResult.delivery && (
                                        <div className="glass-card border border-indigo-500/15 bg-indigo-500/5 p-4 flex gap-3">
                                            <Truck className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-white font-semibold text-sm">Delivery Estimate</p>
                                                <p className="text-slate-400 text-xs mt-1">{checkoutResult.delivery.message}</p>
                                                <p className="text-slate-600 text-[10px] font-mono mt-1">Tracking: {checkoutResult.delivery.tracking_id}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal footer */}
                        <div className="px-6 py-4 border-t border-white/8 flex gap-3">
                            <button onClick={closeCheckout} className="btn-secondary flex-1 text-sm py-3">
                                {checkoutState === 'success' ? 'Close' : 'Cancel'}
                            </button>
                            {checkoutState !== 'success' && (
                                <button onClick={placeOrder}
                                    disabled={
                                        checkoutState === 'processing' ||
                                        quantity < 1 || quantity > checkoutMed.stock_quantity ||
                                        ((checkoutMed.prescription_required === true || checkoutMed.prescription_required === 'true') && !hasRx)
                                    }
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                    style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', boxShadow: '0 4px 20px rgba(99,102,241,0.35)' }}>
                                    {checkoutState === 'processing'
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                                        : <><CreditCard className="w-4 h-4" /> Pay ₹{(parseFloat(checkoutMed.price) * quantity).toFixed(2)}</>}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
