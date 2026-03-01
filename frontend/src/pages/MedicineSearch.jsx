import React, { useState, useEffect } from 'react'
import axios from 'axios'
import {
    Search, Pill, AlertTriangle, CheckCircle, ShoppingCart,
    Filter, X, Loader2, Package, Sparkles, CreditCard,
    Truck, RefreshCw
} from 'lucide-react'
import api from '../api'
import { API_ENDPOINTS } from '../config'
import { API_CONFIG } from '../config'
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
    const [quantity, setQuantity] = useState('1')
    const [hasRx, setHasRx] = useState(false)
    const [checkoutState, setCheckoutState] = useState('idle')
    const [checkoutResult, setCheckoutResult] = useState(null)
    const [checkoutError, setCheckoutError] = useState('')
    const [prescriptionFile, setPrescriptionFile] = useState(null)
    const [rxScanLoading, setRxScanLoading] = useState(false)
    const [rxScanError, setRxScanError] = useState('')
    const [rxScanSummary, setRxScanSummary] = useState('')
    const [rxScanMatched, setRxScanMatched] = useState(false)
    const [rxScanMatches, setRxScanMatches] = useState([])
    const [rxScanUnavailable, setRxScanUnavailable] = useState([])
    const [rxScanEta, setRxScanEta] = useState('')
    const [notifyRequestLoading, setNotifyRequestLoading] = useState('')
    const [notifyRequestDone, setNotifyRequestDone] = useState([])
    const [rxPatientWarning, setRxPatientWarning] = useState('')
    const [storedPrescriptionRecordId, setStoredPrescriptionRecordId] = useState('')
    const [storedPrescriptionValidUntil, setStoredPrescriptionValidUntil] = useState('')

    const [cart, setCart] = useState([])
    const [showCart, setShowCart] = useState(false)
    const [cartProcessing, setCartProcessing] = useState(false)
    const [cartError, setCartError] = useState('')
    const [cartSuccessCount, setCartSuccessCount] = useState(0)
    const [recommendations, setRecommendations] = useState([])

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
        setQuantity('1')
        setHasRx(false)
        setPrescriptionFile(null)
        setCheckoutState('idle')
        setCheckoutResult(null)
        setCheckoutError('')
        setRxScanLoading(false)
        setRxScanError('')
        setRxScanSummary('')
        setRxScanMatched(false)
        setRxScanMatches([])
        setRxScanUnavailable([])
        setRxScanEta('')
        setRxPatientWarning('')
        setNotifyRequestLoading('')
        setNotifyRequestDone([])
        setStoredPrescriptionRecordId('')
        setStoredPrescriptionValidUntil('')
        loadRecommendations(med.id)
        if (isRx(med)) {
            checkActivePrescription(med)
        }
    }

    const checkActivePrescription = async (medicine) => {
        if (!patient?.abha_id || !medicine?.id) return
        try {
            const res = await axios.get(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.AGENT_ACTIVE_PRESCRIPTION}`, {
                params: {
                    abha_id: patient.abha_id,
                    medicine_id: String(medicine.id),
                },
                timeout: 15000,
            })
            const active = !!res?.data?.data?.active
            const prescription = res?.data?.data?.prescription || null
            if (!active || !prescription) return

            setStoredPrescriptionRecordId(String(prescription.record_id || ''))
            setStoredPrescriptionValidUntil(String(prescription.valid_until || ''))
            setHasRx(true)
            setRxScanMatched(true)

            const matchedItem = (prescription.medicines || []).find(m => String(m?.matched_medicine_id || '') === String(medicine.id))
            const qty = Math.max(1, parseInt(matchedItem?.quantity || 1, 10) || 1)
            setQuantity(String(Math.min(checkoutMaxQty, qty)))
            setRxScanSummary(`Using stored valid prescription until ${prescription.valid_until || 'N/A'}${matchedItem?.dosage ? ` · ${matchedItem.dosage}` : ''}`)
        } catch {
            // Silent fallback: user can still upload manually
        }
    }

    const requestAvailabilityNotification = async (item) => {
        if (!patient?.abha_id) {
            setRxScanError('Please login again to request availability notifications.')
            return
        }

        const key = `${item?.extracted_name || ''}-${item?.dosage || ''}`
        if (!key || notifyRequestDone.includes(key)) return

        setNotifyRequestLoading(key)
        setRxScanError('')

        try {
            await api.post(API_ENDPOINTS.AGENT_EXECUTE, {
                agent: 'notification',
                action: 'generate',
                patient_id: patient?.patient_id,
                patient_name: patient?.name,
                abha_id: patient?.abha_id,
                payload: {
                    event_type: 'refill_reminder',
                    details: {
                        medicine_name: item?.extracted_name || 'Medicine',
                        dosage: item?.dosage || '',
                        requested_via: 'prescription_scan',
                        short_availability_eta: rxScanEta || '30-60 minutes',
                    },
                },
            })
            setNotifyRequestDone(prev => [...prev, key])
        } catch (error) {
            setRxScanError(error?.response?.data?.detail || 'Unable to save notification request. Please try again.')
        } finally {
            setNotifyRequestLoading('')
        }
    }

    const scanPrescription = async (file, medicine) => {
        if (!file || !medicine) return
        setRxScanLoading(true)
        setRxScanError('')
        setRxScanSummary('')
        setRxScanMatched(false)
        setRxScanMatches([])
        setRxScanUnavailable([])
        setRxScanEta('')
        setRxPatientWarning('')
        try {
            const formData = new FormData()
            formData.append('image', file)
            formData.append('patient_name', patient?.name || '')
            formData.append('abha_id', patient?.abha_id || '')
            const res = await axios.post(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.AGENT_SCAN}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 45000,
            })
            const scanned = res?.data?.medicines || []
            const inventoryMatches = scanned
                .filter(item => item?.matched_medicine)
                .map(item => ({
                    id: item.matched_medicine.id,
                    name: item.matched_medicine.name,
                    dosage: item?.dosage || '',
                    quantity: Number.isFinite(Number(item?.quantity)) ? Number(item.quantity) : 1,
                    available: !!item?.available,
                }))
            const unavailable = scanned.filter(item => !item?.available)

            setRxScanMatches(inventoryMatches)
            setRxScanUnavailable(unavailable)
            setRxScanEta(res?.data?.short_availability_eta || '')
            setRxPatientWarning(res?.data?.patient_name_warning || '')

            const nameWords = String(medicine.name || '').toLowerCase().split(/\s+/).filter(Boolean)
            const matched = scanned.find(item => {
                const matchedMedicineId = String(item?.matched_medicine?.id || '')
                const extracted = String(item?.extracted_name || '').toLowerCase()
                const nameMatch = nameWords.some(w => w.length > 3 && extracted.includes(w))
                return matchedMedicineId === String(medicine.id) || nameMatch
            })

            if (!matched) {
                setRxScanError('Prescription scanned, but selected medicine was not clearly matched. Please upload a clearer prescription.')
                return
            }

            const inStockCount = inventoryMatches.filter(m => m.available).length
            const prescribedQty = Number.isFinite(Number(matched?.quantity)) ? Math.max(1, Number(matched.quantity)) : 1
            const summary = `Matched ${matched.extracted_name}${matched.dosage ? ` (${matched.dosage})` : ''} · Qty ${prescribedQty} prescribed · ${inStockCount} in inventory${res?.data?.scan_duration_ms ? ` · scanned in ${(Number(res.data.scan_duration_ms) / 1000).toFixed(1)}s` : ''}`
            setRxScanSummary(summary)
            setRxScanMatched(true)
            setHasRx(true)
            setQuantity(String(Math.min(checkoutMaxQty, prescribedQty)))
            setStoredPrescriptionRecordId(String(res?.data?.prescription_record_id || ''))
            setStoredPrescriptionValidUntil(String(res?.data?.prescription_valid_until || ''))
        } catch (error) {
            setRxScanError(error?.response?.data?.detail || 'Unable to scan prescription. Please try again.')
        } finally {
            setRxScanLoading(false)
        }
    }

    const loadRecommendations = async (medicineId) => {
        try {
            const res = await api.get(API_ENDPOINTS.MEDICINES_RECOMMENDATIONS(medicineId))
            setRecommendations(res.data.recommendations || [])
        } catch {
            setRecommendations([])
        }
    }

    const placeOrder = async () => {
        if (!checkoutMed || !patient) return
        const maxQty = parseInt(checkoutMed.stock_quantity || 1, 10)
        const parsedQty = parseInt(quantity, 10)
        if (!Number.isFinite(parsedQty) || parsedQty < 1 || parsedQty > maxQty) {
            setCheckoutState('error')
            setCheckoutError('Please enter a valid quantity within available stock.')
            return
        }
        if (isRx(checkoutMed) && !hasRx) {
            setCheckoutState('error')
            setCheckoutError('Prescription confirmation is required for this medicine.')
            return
        }
        if (isRx(checkoutMed) && !prescriptionFile && !storedPrescriptionRecordId) {
            setCheckoutState('error')
            setCheckoutError('Please upload prescription for this medicine before checkout.')
            return
        }
        if (isRx(checkoutMed) && !rxScanMatched) {
            setCheckoutState('error')
            setCheckoutError('Prescription must be OCR-verified for this medicine.')
            return
        }
        setCheckoutState('processing')
        setCheckoutError('')
        try {
            const res = await api.post(API_ENDPOINTS.ORDERS_CREATE, {
                patient_id: patient.patient_id,
                patient_name: patient.name,
                abha_id: patient.abha_id,
                medicine_id: String(checkoutMed.id),
                medicine_name: checkoutMed.name,
                quantity: parsedQty,
                dosage_frequency: 'As directed',
                has_prescription: hasRx,
                prescription_file_name: prescriptionFile?.name || '',
                prescription_scan_summary: rxScanSummary || '',
                prescription_verified: rxScanMatched,
                prescription_record_id: storedPrescriptionRecordId || '',
                prescription_valid_until: storedPrescriptionValidUntil || '',
            })
            setCheckoutResult(res.data)
            setCheckoutState('success')
            loadMedicines()
        } catch (e) {
            setCheckoutError(e.message || 'Order failed. Please try again.')
            setCheckoutState('error')
        }
    }

    const addToCart = (med) => {
        setCart(prev => {
            const existing = prev.find(item => String(item.medicine.id) === String(med.id))
            if (existing) {
                return prev.map(item =>
                    String(item.medicine.id) === String(med.id)
                        ? { ...item, quantity: Math.min(parseInt(item.medicine.stock_quantity || 1), item.quantity + 1) }
                        : item
                )
            }
            return [...prev, { medicine: med, quantity: 1, hasPrescription: false }]
        })
    }

    const updateCartQty = (medicineId, nextQty) => {
        setCart(prev => prev.map(item =>
            String(item.medicine.id) === String(medicineId)
                ? {
                    ...item,
                    quantity: Math.max(1, Math.min(parseInt(item.medicine.stock_quantity || 1), nextQty)),
                }
                : item
        ))
    }

    const toggleCartRx = (medicineId, checked) => {
        setCart(prev => prev.map(item =>
            String(item.medicine.id) === String(medicineId)
                ? { ...item, hasPrescription: checked }
                : item
        ))
    }

    const removeCartItem = (medicineId) => {
        setCart(prev => prev.filter(item => String(item.medicine.id) !== String(medicineId)))
    }

    const cartTotal = cart.reduce((sum, item) => sum + (parseFloat(item.medicine.price || 0) * item.quantity), 0)

    const placeCartOrder = async () => {
        if (!patient || cart.length === 0) return
        const hasInvalidQty = cart.some(item => !item.quantity || item.quantity < 1 || item.quantity > parseInt(item.medicine.stock_quantity || 0))
        if (hasInvalidQty) {
            setCartError('One or more items have invalid quantity values.')
            return
        }
        const missingRx = cart.some(item => isRx(item.medicine) && !item.hasPrescription)
        if (missingRx) {
            setCartError('Please confirm prescription for all Rx medicines in cart.')
            return
        }
        setCartProcessing(true)
        setCartError('')
        setCartSuccessCount(0)
        try {
            let successCount = 0
            for (const item of cart) {
                await api.post(API_ENDPOINTS.ORDERS_CREATE, {
                    patient_id: patient.patient_id,
                    patient_name: patient.name,
                    abha_id: patient.abha_id,
                    medicine_id: String(item.medicine.id),
                    medicine_name: item.medicine.name,
                    quantity: parseInt(item.quantity, 10),
                    dosage_frequency: 'As directed',
                    has_prescription: !!item.hasPrescription,
                })
                successCount += 1
            }
            setCartSuccessCount(successCount)
            setCart([])
            loadMedicines()
        } catch (e) {
            setCartError(e.message || 'Failed to place all cart orders. Some items may not have been processed.')
        } finally {
            setCartProcessing(false)
        }
    }

    const closeCheckout = () => setCheckoutMed(null)
    const isRx = (med) => med?.prescription_required === true || med?.prescription_required === 'true'
    const checkoutMaxQty = Math.max(1, parseInt(checkoutMed?.stock_quantity || 1, 10))
    const checkoutQtyNumber = parseInt(quantity, 10)
    const checkoutQtyValid = Number.isFinite(checkoutQtyNumber) && checkoutQtyNumber >= 1 && checkoutQtyNumber <= checkoutMaxQty
    const checkoutQtyForTotal = checkoutQtyValid ? checkoutQtyNumber : 0

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
                <button
                    onClick={() => setShowCart(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:text-white hover:bg-indigo-500/20 text-xs font-semibold transition-all"
                >
                    <ShoppingCart className="w-3.5 h-3.5" /> Cart ({cart.length})
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
                                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                                    style={inStock ? { background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' } : {}}>
                                    <ShoppingCart className="w-3.5 h-3.5" /> Buy Now
                                </button>
                                <button
                                    onClick={() => addToCart(med)}
                                    disabled={!inStock}
                                    className="ml-2 px-3 py-2.5 rounded-xl text-xs font-semibold border border-white/10 text-slate-300 hover:text-white hover:border-white/25 disabled:opacity-30"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>

            {showCart && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="w-full max-w-2xl rounded-3xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh] shadow-2xl shadow-black/60"
                        style={{ background: 'linear-gradient(135deg, #0d1b2a, #0a1628)' }}>
                        <div className="flex justify-between items-center px-6 py-5 border-b border-white/8">
                            <h3 className="text-lg font-black text-white flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5 text-indigo-400" /> Cart Checkout ({cart.length})
                            </h3>
                            <button onClick={() => setShowCart(false)} className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-3">
                            {cart.length === 0 ? (
                                <p className="text-slate-500 text-sm">Your cart is empty.</p>
                            ) : cart.map(item => {
                                const rxRequired = isRx(item.medicine)
                                return (
                                    <div key={item.medicine.id} className="rounded-xl border border-white/10 p-4 bg-white/5">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-white font-semibold text-sm">{item.medicine.name}</p>
                                                <p className="text-slate-500 text-xs">₹{parseFloat(item.medicine.price).toFixed(2)} each</p>
                                            </div>
                                            <button onClick={() => removeCartItem(item.medicine.id)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                                        </div>
                                        <div className="mt-3 flex items-center gap-3">
                                            <button onClick={() => updateCartQty(item.medicine.id, item.quantity - 1)} className="w-8 h-8 rounded-lg border border-white/10 text-white">−</button>
                                            <span className="text-white font-bold w-8 text-center">{item.quantity}</span>
                                            <button onClick={() => updateCartQty(item.medicine.id, item.quantity + 1)} className="w-8 h-8 rounded-lg border border-white/10 text-white">+</button>
                                            <span className="text-slate-500 text-xs">Stock: {item.medicine.stock_quantity}</span>
                                        </div>
                                        {rxRequired && (
                                            <label className="mt-3 flex items-center gap-2 text-xs text-slate-300">
                                                <input
                                                    type="checkbox"
                                                    checked={!!item.hasPrescription}
                                                    onChange={e => toggleCartRx(item.medicine.id, e.target.checked)}
                                                />
                                                I have prescription for this medicine
                                            </label>
                                        )}
                                    </div>
                                )
                            })}
                            {cartSuccessCount > 0 && (
                                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-300 text-sm">
                                    Successfully placed {cartSuccessCount} order{cartSuccessCount === 1 ? '' : 's'}.
                                </div>
                            )}
                            {cartError && (
                                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300 text-sm">
                                    {cartError}
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t border-white/8 flex items-center justify-between gap-3">
                            <p className="text-white font-black">Total: ₹{cartTotal.toFixed(2)}</p>
                            <button
                                onClick={placeCartOrder}
                                disabled={cartProcessing || cart.length === 0}
                                className="px-4 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-40"
                                style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}
                            >
                                {cartProcessing ? 'Processing…' : 'Place All Orders'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                            <button onClick={() => setQuantity(prev => {
                                                const current = parseInt(prev, 10)
                                                const next = Number.isFinite(current) ? current - 1 : 1
                                                return String(Math.max(1, next))
                                            })}
                                                className="w-10 h-10 rounded-xl bg-white/8 border border-white/10 text-white font-bold hover:bg-white/15 transition-all">−</button>
                                            <input type="number" min="1" max={checkoutMed.stock_quantity}
                                                value={quantity}
                                                onChange={e => {
                                                    const raw = e.target.value
                                                    if (raw === '') {
                                                        setQuantity('')
                                                        return
                                                    }
                                                    if (!/^\d+$/.test(raw)) return
                                                    setQuantity(raw)
                                                }}
                                                onBlur={() => {
                                                    const parsed = parseInt(quantity, 10)
                                                    if (!Number.isFinite(parsed)) {
                                                        setQuantity('1')
                                                        return
                                                    }
                                                    setQuantity(String(Math.max(1, Math.min(checkoutMaxQty, parsed))))
                                                }}
                                                className="input-field text-center text-xl font-black w-20 py-2" />
                                            <button onClick={() => setQuantity(prev => {
                                                const current = parseInt(prev, 10)
                                                const next = Number.isFinite(current) ? current + 1 : 1
                                                return String(Math.min(checkoutMaxQty, next))
                                            })}
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
                                                    <div className="mt-3">
                                                        <label className="block text-[11px] text-slate-500 mb-1">Upload prescription (required)</label>
                                                        <input
                                                            type="file"
                                                            accept="image/*,.pdf"
                                                            onChange={e => {
                                                                const file = e.target.files?.[0] || null
                                                                setPrescriptionFile(file)
                                                                if (file) {
                                                                    setHasRx(true)
                                                                    scanPrescription(file, checkoutMed)
                                                                }
                                                                if (!file) {
                                                                    setRxScanMatched(false)
                                                                    setRxScanSummary('')
                                                                }
                                                            }}
                                                            className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-500/20 file:text-indigo-300"
                                                        />
                                                        {prescriptionFile && (
                                                            <p className="text-[11px] text-emerald-400 mt-1">Attached: {prescriptionFile.name}</p>
                                                        )}
                                                        {rxScanLoading && (
                                                            <p className="text-[11px] text-indigo-300 mt-1">Scanning prescription…</p>
                                                        )}
                                                        {rxScanSummary && (
                                                            <p className="text-[11px] text-emerald-400 mt-1">OCR: {rxScanSummary}</p>
                                                        )}
                                                        {storedPrescriptionValidUntil && (
                                                            <p className="text-[11px] text-indigo-300 mt-1">Stored prescription valid until: {storedPrescriptionValidUntil}</p>
                                                        )}
                                                        {rxScanMatches.length > 0 && (
                                                            <div className="mt-2 space-y-1">
                                                                <p className="text-[11px] text-slate-400">From inventory:</p>
                                                                {rxScanMatches.map(item => (
                                                                    <p key={`${item.id}-${item.name}-${item.dosage}`} className="text-[11px] text-slate-300">
                                                                        • {item.name}{item.dosage ? ` (${item.dosage})` : ''} · Qty {item.quantity || 1} {item.available ? '— In Stock' : '— Not Available'}
                                                                    </p>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {rxScanUnavailable.length > 0 && (
                                                            <div className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-2">
                                                                <p className="text-[11px] text-amber-300">Unavailable now, arranging shortly{rxScanEta ? ` (${rxScanEta})` : ''}:</p>
                                                                {rxScanUnavailable.map(item => {
                                                                    const key = `${item?.extracted_name || ''}-${item?.dosage || ''}`
                                                                    const done = notifyRequestDone.includes(key)
                                                                    const loading = notifyRequestLoading === key
                                                                    return (
                                                                        <div key={`na-${key}`} className="mt-1.5 flex items-center justify-between gap-2">
                                                                            <p className="text-[11px] text-amber-100/90">
                                                                                • {item.extracted_name}{item.dosage ? ` (${item.dosage})` : ''} · Qty {item.quantity || 1}
                                                                            </p>
                                                                            <button
                                                                                type="button"
                                                                                disabled={done || loading}
                                                                                onClick={() => requestAvailabilityNotification(item)}
                                                                                className="text-[10px] px-2 py-1 rounded-md border border-amber-300/25 bg-amber-200/10 text-amber-100 hover:bg-amber-200/20 transition-all disabled:opacity-60"
                                                                            >
                                                                                {loading ? 'Saving…' : done ? 'Requested ✓' : 'Notify me'}
                                                                            </button>
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        )}
                                                        {rxScanError && (
                                                            <p className="text-[11px] text-red-400 mt-1">{rxScanError}</p>
                                                        )}
                                                        {rxPatientWarning && (
                                                            <p className="text-[11px] text-amber-300 mt-1">⚠️ {rxPatientWarning}</p>
                                                        )}
                                                    </div>
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

                                    {recommendations.length > 0 && (
                                        <div className="rounded-2xl border border-white/10 p-4 bg-white/5">
                                            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Recommended Alternatives</p>
                                            <div className="space-y-2">
                                                {recommendations.map(rec => (
                                                    <button
                                                        key={rec.id}
                                                        onClick={() => openCheckout(rec)}
                                                        className="w-full text-left px-3 py-2 rounded-xl border border-white/10 hover:border-indigo-500/30 hover:bg-indigo-500/10 transition-all"
                                                    >
                                                        <p className="text-sm text-white font-semibold">{rec.name}</p>
                                                        <p className="text-[11px] text-slate-500">₹{parseFloat(rec.price).toFixed(2)} · {rec.stock_quantity} in stock</p>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between py-3 border-t border-white/8">
                                        <span className="text-slate-400 text-sm">Estimated Total</span>
                                        <span className="text-white font-black text-xl">₹{(parseFloat(checkoutMed.price) * checkoutQtyForTotal).toFixed(2)}</span>
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
                                        !checkoutQtyValid ||
                                        (isRx(checkoutMed) && !hasRx)
                                    }
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                    style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', boxShadow: '0 4px 20px rgba(99,102,241,0.35)' }}>
                                    {checkoutState === 'processing'
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                                        : <><CreditCard className="w-4 h-4" /> Pay ₹{(parseFloat(checkoutMed.price) * checkoutQtyForTotal).toFixed(2)}</>}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
