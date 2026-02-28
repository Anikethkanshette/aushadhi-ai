import React, { useState, useEffect } from 'react'
import {
    Search, Pill, AlertTriangle, CheckCircle, ShoppingCart,
    Filter, X, Loader2, Package, Sparkles, CreditCard,
    Truck, RefreshCw
} from 'lucide-react'
import api from '../api'
import { API_ENDPOINTS } from '../config'
import { useAppContext } from '../context/AppContext'

export default function MedicineSearch() {
    const { patient } = useAppContext()

    const [allMeds, setAllMeds] = useState([])
    const [results, setResults] = useState([])
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(true)
    const [categories, setCategories] = useState([])
    const [filter, setFilter] = useState({
        category: '',
        rxType: 'all',
        inStockOnly: false,
        minPrice: '',
        maxPrice: '',
    })

    // Checkout state
    const [checkoutMed, setCheckoutMed] = useState(null)
    const [quantity, setQuantity] = useState(1)
    const [hasRx, setHasRx] = useState(false)
    const [checkoutState, setCheckoutState] = useState('idle')
    const [checkoutResult, setCheckoutResult] = useState(null)
    const [checkoutError, setCheckoutError] = useState('')

    useEffect(() => { loadMedicines() }, [])
    useEffect(() => { applyFilters(allMeds, query, filter) }, [filter, query, allMeds])

    const loadMedicines = async () => {
        setLoading(true)
        try {
            const res = await api.get(API_ENDPOINTS.MEDICINES_LIST)
            const meds = res.data.medicines || []
            setAllMeds(meds)
            const cats = [...new Set(meds.map(m => m.category).filter(Boolean))].sort()
            setCategories(cats)
        } catch (err) {
            console.error('Failed to load medicines:', err)
        } finally {
            setLoading(false)
        }
    }

    const applyFilters = (meds, q, f) => {
        let filtered = [...meds]
        if (q.trim()) {
            const lq = q.toLowerCase()
            filtered = filtered.filter(m =>
                m.name?.toLowerCase().includes(lq) ||
                m.generic_name?.toLowerCase().includes(lq) ||
                m.category?.toLowerCase().includes(lq)
            )
        }
        if (f.rxType === 'rx') {
            filtered = filtered.filter(m => m.prescription_required === true || m.prescription_required === 'true')
        }
        if (f.rxType === 'otc') {
            filtered = filtered.filter(m => !(m.prescription_required === true || m.prescription_required === 'true'))
        }
        if (f.inStockOnly) {
            filtered = filtered.filter(m => parseInt(m.stock_quantity) > 0)
        }
        if (f.minPrice !== '') {
            filtered = filtered.filter(m => parseFloat(m.price) >= parseFloat(f.minPrice || 0))
        }
        if (f.maxPrice !== '') {
            filtered = filtered.filter(m => parseFloat(m.price) <= parseFloat(f.maxPrice || Number.MAX_SAFE_INTEGER))
        }
        if (f.category) filtered = filtered.filter(m => m.category === f.category)
        setResults(filtered)
    }

    const handleSearch = (q) => {
        setQuery(q)
        applyFilters(allMeds, q, filter)
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
        if (!checkoutMed || !patient) return
        setCheckoutState('processing')
        setCheckoutError('')
        try {
            const res = await api.post(API_ENDPOINTS.ORDERS_CREATE, {
                patient_id: patient.patient_id,
                patient_name: patient.name,
                abha_id: patient.abha_id,
                medicine_id: String(checkoutMed.id),
                medicine_name: checkoutMed.name,
                quantity: parseInt(quantity, 10),
                dosage_frequency: 'As directed',
                has_prescription: hasRx,
            })
            setCheckoutResult(res.data)
            setCheckoutState('success')
            loadMedicines()
        } catch (e) {
            setCheckoutError(e.message || 'Order failed. Please try again.')
            setCheckoutState('error')
        }
    }

    const closeCheckout = () => setCheckoutMed(null)
    const isRx = (med) => med?.prescription_required === true || med?.prescription_required === 'true'

    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-3">
                        <Search className="w-6 h-6 text-emerald-400" /> Medicine Finder
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Browse {allMeds.length} medicines from live inventory
                    </p>
                </div>
                <button onClick={loadMedicines} disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 text-xs font-semibold transition-all disabled:opacity-40">
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>
            </div>

            {/* Search bar */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input type="text" value={query}
                        onChange={e => handleSearch(e.target.value)}
                        placeholder="Search by name, generic name or category…"
                        className="input-field pl-10 pr-10 py-3 w-full" />
                    {query && (
                        <button onClick={() => handleSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <button onClick={() => setFilter(f => ({ ...f, inStockOnly: !f.inStockOnly }))}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${filter.inStockOnly ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-white/10 text-slate-500 hover:text-white hover:border-white/20'}`}>
                    <Filter className="w-4 h-4" /> In Stock
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <select
                    value={filter.rxType}
                    onChange={e => setFilter(f => ({ ...f, rxType: e.target.value }))}
                    className="input-field py-3 text-sm"
                >
                    <option value="all">All Types</option>
                    <option value="rx">Prescription Only</option>
                    <option value="otc">OTC Only</option>
                </select>
                <input
                    type="number"
                    min="0"
                    value={filter.minPrice}
                    onChange={e => setFilter(f => ({ ...f, minPrice: e.target.value }))}
                    placeholder="Min ₹"
                    className="input-field py-3 text-sm"
                />
                <input
                    type="number"
                    min="0"
                    value={filter.maxPrice}
                    onChange={e => setFilter(f => ({ ...f, maxPrice: e.target.value }))}
                    placeholder="Max ₹"
                    className="input-field py-3 text-sm"
                />
                <button
                    onClick={() => setFilter({ category: '', rxType: 'all', inStockOnly: false, minPrice: '', maxPrice: '' })}
                    className="px-4 py-3 rounded-xl border border-white/10 text-slate-500 hover:text-white hover:border-white/20 text-sm font-semibold transition-all"
                >
                    Clear Filters
                </button>
            </div>

            {/* Category chips */}
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
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

            {/* Results count */}
            {!loading && (
                <p className="text-slate-600 text-xs">
                    Showing {results.length} of {allMeds.length} medicines
                    {query && <span> for "<span className="text-slate-400">{query}</span>"</span>}
                </p>
            )}

            {/* Results grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="rounded-2xl h-44 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
                    ))
                ) : results.length === 0 ? (
                    <div className="col-span-full py-20 text-center rounded-2xl border border-white/5" style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <Package className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                        <p className="text-slate-500">No medicines found{query ? ` for "${query}"` : ''}</p>
                        {query && (
                            <button onClick={() => handleSearch('')} className="mt-3 text-xs text-indigo-400 hover:underline">
                                Clear search
                            </button>
                        )}
                    </div>
                ) : results.map(med => {
                    const inStock = parseInt(med.stock_quantity) > 0
                    const rxRequired = isRx(med)
                    const isLow = parseInt(med.stock_quantity) < parseInt(med.min_stock_level || 0)
                    return (
                        <div key={med.id}
                            className={`rounded-2xl p-5 border transition-all duration-200 hover:scale-[1.02] group ${inStock ? 'border-white/8 hover:border-emerald-500/25' : 'border-white/5 opacity-55'}`}
                            style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                    <Pill className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div className="flex gap-1.5 flex-wrap justify-end">
                                    <span className={`badge text-[10px] ${inStock ? 'badge-green' : 'badge-red'}`}>
                                        {inStock ? '✓ In Stock' : 'Out of Stock'}
                                    </span>
                                    {rxRequired && <span className="badge badge-yellow text-[10px]">Rx</span>}
                                    {isLow && inStock && <span className="badge badge-amber text-[10px]">Low</span>}
                                </div>
                            </div>
                            <h3 className="text-white font-bold text-sm leading-tight mb-1 group-hover:text-emerald-300 transition-colors line-clamp-2">{med.name}</h3>
                            <p className="text-slate-500 text-xs mb-4">{med.generic_name} · <span className="text-slate-600">{med.category}</span></p>
                            <div className="flex items-center justify-between mt-auto">
                                <div>
                                    <p className="text-xl font-black text-white">₹{parseFloat(med.price).toFixed(2)}</p>
                                    <p className="text-[11px] text-slate-600 mt-0.5">{med.stock_quantity} {med.unit}s left</p>
                                </div>
                                <button onClick={() => openCheckout(med)} disabled={!inStock}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                                    style={inStock ? { background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' } : {}}>
                                    <ShoppingCart className="w-3.5 h-3.5" /> Order
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* ── Checkout Modal ── */}
            {checkoutMed && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-3xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh] shadow-2xl shadow-black/60"
                        style={{ background: 'linear-gradient(135deg, #0d1b2a, #0a1628)' }}>

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

                        <div className="p-6 overflow-y-auto flex-1">
                            {(checkoutState === 'idle' || checkoutState === 'processing' || checkoutState === 'error') && (
                                <div className="space-y-5">
                                    <div className="rounded-2xl border border-indigo-500/15 bg-indigo-500/5 p-4">
                                        <p className="text-white font-bold text-base">{checkoutMed.name}</p>
                                        <p className="text-indigo-300/70 text-xs mt-0.5">{checkoutMed.generic_name}</p>
                                        <div className="flex items-center justify-between mt-3">
                                            <span className="text-slate-500 text-sm">Price / {checkoutMed.unit}</span>
                                            <span className="text-white font-black text-lg">₹{parseFloat(checkoutMed.price).toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Quantity</label>
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                                className="w-10 h-10 rounded-xl bg-white/8 border border-white/10 text-white font-bold hover:bg-white/15 transition-all">−</button>
                                            <input type="number" min="1" max={checkoutMed.stock_quantity}
                                                value={quantity}
                                                onChange={e => setQuantity(Math.max(1, Math.min(checkoutMed.stock_quantity, parseInt(e.target.value) || 1)))}
                                                className="input-field text-center text-xl font-black w-20 py-2" />
                                            <button onClick={() => setQuantity(q => Math.min(checkoutMed.stock_quantity, q + 1))}
                                                className="w-10 h-10 rounded-xl bg-white/8 border border-white/10 text-white font-bold hover:bg-white/15 transition-all">+</button>
                                        </div>
                                        <p className="text-xs text-slate-600 mt-1.5">{checkoutMed.stock_quantity} units available</p>
                                    </div>

                                    {isRx(checkoutMed) && (
                                        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                                            <div className="flex items-start gap-3">
                                                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                                <div className="flex-1">
                                                    <p className="text-amber-300 font-semibold text-sm">Prescription Required</p>
                                                    <p className="text-slate-500 text-xs mt-1 mb-3">A valid prescription is required for this medicine.</p>
                                                    <label className="flex items-center gap-3 cursor-pointer">
                                                        <div className="relative flex-shrink-0">
                                                            <input type="checkbox" checked={hasRx} onChange={e => setHasRx(e.target.checked)} className="peer sr-only" />
                                                            <div className="w-5 h-5 rounded-md border border-slate-600 bg-slate-800 peer-checked:bg-indigo-500 peer-checked:border-indigo-500 transition-colors flex items-center justify-center">
                                                                {hasRx && <CheckCircle className="w-3 h-3 text-white" />}
                                                            </div>
                                                        </div>
                                                        <span className="text-slate-300 text-sm">I have a valid prescription</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {patient?.abha_id && (
                                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-500/5 border border-indigo-500/15 text-xs text-indigo-400">
                                            <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                                            ABHA linked — welfare discounts applied automatically
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between py-3 border-t border-white/8">
                                        <span className="text-slate-400 text-sm">Estimated Total</span>
                                        <span className="text-white font-black text-xl">₹{(parseFloat(checkoutMed.price) * quantity).toFixed(2)}</span>
                                    </div>

                                    {checkoutError && (
                                        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                                            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {checkoutError}
                                        </div>
                                    )}
                                </div>
                            )}

                            {checkoutState === 'success' && checkoutResult && (
                                <div className="space-y-5">
                                    <div className="text-center py-4">
                                        <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-emerald-500/20">
                                            <CheckCircle className="w-10 h-10 text-emerald-400" />
                                        </div>
                                        <h4 className="text-xl font-black text-white">Order Placed!</h4>
                                        <p className="text-emerald-400/70 text-xs font-mono mt-1">{checkoutResult.order?.tx_id}</p>
                                    </div>

                                    <div className="rounded-2xl border border-white/8 p-5 space-y-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                        {[
                                            ['Medicine', `${checkoutResult.order?.quantity}× ${checkoutResult.order?.medicine_name}`],
                                            ['Order ID', checkoutResult.order?.order_id],
                                            ['Payment', checkoutResult.payment?.data?.method || 'UPI'],
                                        ].map(([k, v]) => (
                                            <div key={k} className="flex justify-between text-sm">
                                                <span className="text-slate-500">{k}</span>
                                                <span className="text-white font-semibold">{v}</span>
                                            </div>
                                        ))}
                                        {checkoutResult.welfare?.data?.is_eligible && (
                                            <div className="flex justify-between text-sm text-emerald-400 border-t border-white/8 pt-3">
                                                <span>Welfare Discount</span>
                                                <span>−₹{parseFloat(checkoutResult.welfare.data.discount_amount || 0).toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between font-black text-lg border-t border-white/10 pt-3">
                                            <span className="text-white">Amount Paid</span>
                                            <span className="text-indigo-400">₹{parseFloat(checkoutResult.order?.total_amount || 0).toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {checkoutResult.delivery?.data && (
                                        <div className="rounded-2xl border border-indigo-500/15 bg-indigo-500/5 p-4 flex gap-3">
                                            <Truck className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-white font-semibold text-sm">Delivery Scheduled</p>
                                                <p className="text-slate-400 text-xs mt-1">{checkoutResult.delivery.data.message || 'Estimated 2–3 business days'}</p>
                                                {checkoutResult.delivery.data.tracking_id && (
                                                    <p className="text-slate-600 text-[10px] font-mono mt-1">Tracking: {checkoutResult.delivery.data.tracking_id}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-white/8 flex gap-3">
                            <button onClick={closeCheckout} className="btn-secondary flex-1 text-sm py-3">
                                {checkoutState === 'success' ? 'Done' : 'Cancel'}
                            </button>
                            {checkoutState !== 'success' && (
                                <button onClick={placeOrder}
                                    disabled={
                                        checkoutState === 'processing' ||
                                        quantity < 1 ||
                                        quantity > parseInt(checkoutMed.stock_quantity) ||
                                        (isRx(checkoutMed) && !hasRx)
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
