import React, { useState, useEffect } from 'react'
import api from '../../api'
import { API_ENDPOINTS } from '../../config'
import {
    AlertTriangle, PackageSearch, Loader2, FileText, X, Search,
    TrendingDown, Package, CheckCircle, Bot, Send, Zap, RefreshCw, PlusCircle
} from 'lucide-react'

export default function InventoryManager() {
    const [medicines, setMedicines] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [catFilter, setCatFilter] = useState('all')
    const [showPOModal, setShowPOModal] = useState(false)
    const [poDraft, setPoDraft] = useState('')
    const [generating, setGenerating] = useState(false)
    const [alertsCreated, setAlertsCreated] = useState(null)
    const [showAddModal, setShowAddModal] = useState(false)
    const [adding, setAdding] = useState(false)
    const [addError, setAddError] = useState('')
    const [addSuccess, setAddSuccess] = useState('')
    const [newMedicine, setNewMedicine] = useState({
        name: '',
        generic_name: '',
        category: 'General',
        stock_quantity: 0,
        unit: 'tablets',
        price: '',
        prescription_required: false,
        min_stock_level: 10,
        supplier: '',
    })

    useEffect(() => {
        const fetchMeds = async () => {
            try {
                const res = await api.get(API_ENDPOINTS.PHARMACIST_INVENTORY)
                setMedicines(res.data.medicines || [])
            } catch (err) {
                console.error('Failed to fetch inventory:', err)
            }
            finally { setLoading(false) }
        }
        fetchMeds()
    }, [])

    const filtered = medicines.filter(m => {
        const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
            m.generic_name?.toLowerCase().includes(search.toLowerCase())
        const matchCat = catFilter === 'all' || m.category === catFilter
        return matchSearch && matchCat
    })

    const categories = ['all', ...new Set(medicines.map(m => m.category).filter(Boolean))]
    const lowStock = medicines.filter(m => parseInt(m.stock_quantity) < parseInt(m.min_stock_level))

    const generatePO = async () => {
        setGenerating(true); setPoDraft(''); setShowPOModal(true)
        try {
            const res = await api.post('/pharmacist/generate-po')
            setPoDraft(res.data.po_draft || 'PO Generated')
        } catch (err) {
            setPoDraft('Failed to generate PO. Please try again.')
            console.error('PO generation failed:', err)
        }
        finally { setGenerating(false) }
    }

    const runLowStockScan = async () => {
        try {
            const res = await api.post('/pharmacist/alerts/low-stock-scan')
            setAlertsCreated(res.data.created_count ?? 0)
        } catch (err) {
            console.error('Low-stock scan failed:', err)
            setAlertsCreated(0)
        }
    }

    const stockPercent = (m) => {
        const pct = (parseInt(m.stock_quantity) / (parseInt(m.min_stock_level) * 3)) * 100
        return Math.min(pct, 100)
    }

    const updateNewMedicineField = (field, value) => {
        setNewMedicine(prev => ({ ...prev, [field]: value }))
    }

    const resetNewMedicine = () => {
        setNewMedicine({
            name: '',
            generic_name: '',
            category: 'General',
            stock_quantity: 0,
            unit: 'tablets',
            price: '',
            prescription_required: false,
            min_stock_level: 10,
            supplier: '',
        })
        setAddError('')
    }

    const handleAddMedicine = async (e) => {
        e.preventDefault()
        setAddError('')
        setAddSuccess('')
        setAdding(true)
        try {
            const payload = {
                ...newMedicine,
                stock_quantity: Number(newMedicine.stock_quantity),
                min_stock_level: Number(newMedicine.min_stock_level),
                price: Number(newMedicine.price),
                prescription_required: Boolean(newMedicine.prescription_required),
            }
            const res = await api.post(API_ENDPOINTS.PHARMACIST_ADD_MEDICINE, payload)
            const created = res.data?.medicine
            if (created) {
                setMedicines(prev => [created, ...prev])
            }
            setAddSuccess('Tablet added to inventory.')
            resetNewMedicine()
            setShowAddModal(false)
        } catch (err) {
            setAddError(err?.message || 'Failed to add tablet. Please try again.')
        } finally {
            setAdding(false)
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        </div>
    )

    return (
        <div className="p-8 max-w-6xl space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-2">
                        <Package className="w-6 h-6 text-indigo-400" /> Inventory Manager
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">{medicines.length} products · {lowStock.length} low stock</p>
                </div>
                <button onClick={generatePO}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white transition-all"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.35)' }}>
                    <Bot className="w-4 h-4" /> AI Restock PO
                </button>
                <button
                    onClick={() => { setShowAddModal(true); setAddError('') }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-all"
                >
                    <PlusCircle className="w-4 h-4" /> Add New Tablet
                </button>
            </div>

            {addSuccess && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 px-4 py-2 text-sm">
                    {addSuccess}
                </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
                <button
                    onClick={runLowStockScan}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/25 bg-red-500/10 text-red-300 hover:text-white hover:bg-red-500/20 transition-all text-sm font-semibold"
                >
                    <AlertTriangle className="w-4 h-4" /> Generate Low-Stock Alerts
                </button>
                {alertsCreated !== null && (
                    <span className="text-xs text-slate-500">Created {alertsCreated} new alert{alertsCreated === 1 ? '' : 's'}.</span>
                )}
            </div>

            {/* Low stock alert */}
            {lowStock.length > 0 && (
                <div className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-red-500/20 bg-red-500/5 animate-slide-up">
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <div>
                        <p className="text-red-300 font-semibold text-sm">{lowStock.length} items below minimum stock level</p>
                        <p className="text-slate-500 text-xs mt-0.5">{lowStock.slice(0, 3).map(m => m.name.split(' ')[0]).join(', ')}{lowStock.length > 3 ? ` + ${lowStock.length - 3} more` : ''}</p>
                    </div>
                    <button onClick={generatePO} className="ml-auto text-xs font-bold text-red-400 hover:text-white border border-red-500/25 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-all flex-shrink-0">
                        Generate PO →
                    </button>
                </div>
            )}

            {/* Search + Category filter */}
            <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[220px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input type="text" placeholder="Search medicines…" value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="input-field pl-10 py-2.5 text-sm" />
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {categories.slice(0, 8).map(cat => (
                        <button key={cat} onClick={() => setCatFilter(cat)}
                            className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${catFilter === cat ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white/5 text-slate-500 hover:text-white hover:bg-white/10'}`}>
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Medicine grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map(m => {
                    const isLow = parseInt(m.stock_quantity) < parseInt(m.min_stock_level)
                    const pct = stockPercent(m)
                    return (
                        <div key={m.id}
                            className={`glass-card p-5 border transition-all hover:scale-[1.01] ${isLow ? 'border-red-500/20' : 'border-white/5'}`}>
                            {/* Top row */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isLow ? 'bg-red-500/15' : 'bg-indigo-500/15'}`}>
                                        <Package className={`w-5 h-5 ${isLow ? 'text-red-400' : 'text-indigo-400'}`} />
                                    </div>
                                    <div>
                                        <p className="text-white font-semibold text-sm leading-tight line-clamp-2 max-w-[150px]">{m.name}</p>
                                        <p className="text-slate-500 text-[10px] mt-0.5">{m.generic_name}</p>
                                    </div>
                                </div>
                                {isLow && <span className="badge badge-red text-[9px] flex-shrink-0">LOW</span>}
                            </div>

                            {/* Category + price */}
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] px-2 py-1 rounded-lg bg-white/5 text-slate-400 border border-white/5">{m.category}</span>
                                <span className="text-white font-black text-base">₹{parseFloat(m.price).toFixed(2)}</span>
                            </div>

                            {/* Stock bar */}
                            <div className="mb-2">
                                <div className="flex justify-between mb-1.5">
                                    <span className="text-[10px] text-slate-500">Stock: <span className={`font-bold ${isLow ? 'text-red-400' : 'text-emerald-400'}`}>{m.stock_quantity}</span></span>
                                    <span className="text-[10px] text-slate-600">Min: {m.min_stock_level} {m.unit}</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-700"
                                        style={{
                                            width: `${pct}%`,
                                            background: isLow ? 'linear-gradient(90deg, #dc2626, #f87171)' : 'linear-gradient(90deg, #059669, #34d399)'
                                        }} />
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-600 mt-2">
                                <span>{m.supplier}</span>
                                {m.prescription_required === 'true' || m.prescription_required === true
                                    ? <span className="badge badge-yellow text-[9px]">Rx Required</span>
                                    : <span className="badge badge-green text-[9px]">OTC</span>}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* PO Modal */}
            {showPOModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-card border border-indigo-500/20 w-full max-w-2xl max-h-[80vh] flex flex-col animate-slide-up">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 flex-shrink-0">
                            <h3 className="font-bold text-white flex items-center gap-2"><Bot className="w-5 h-5 text-indigo-400" /> AI-Generated Purchase Order</h3>
                            <button onClick={() => setShowPOModal(false)} className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            {generating
                                ? <div className="flex flex-col items-center justify-center py-12 gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                                    <p className="text-slate-500 text-sm">AI drafting your Purchase Order…</p>
                                </div>
                                : <pre className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed font-mono">{poDraft}</pre>
                            }
                        </div>
                        {!generating && poDraft && (
                            <div className="px-6 py-4 border-t border-white/8 flex gap-3">
                                <button
                                    onClick={() => { navigator.clipboard.writeText(poDraft) }}
                                    className="btn-secondary text-sm flex-1">
                                    Copy PO
                                </button>
                                <button onClick={() => setShowPOModal(false)} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white"
                                    style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                                    <Send className="w-4 h-4" /> Send to Distributor
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Add Tablet Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-card border border-emerald-500/20 w-full max-w-2xl animate-slide-up">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <PlusCircle className="w-5 h-5 text-emerald-400" /> Add New Tablet
                            </h3>
                            <button onClick={() => { setShowAddModal(false); resetNewMedicine() }} className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddMedicine} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input required type="text" value={newMedicine.name} onChange={(e) => updateNewMedicineField('name', e.target.value)} placeholder="Tablet name" className="input-field text-sm" />
                                <input required type="text" value={newMedicine.generic_name} onChange={(e) => updateNewMedicineField('generic_name', e.target.value)} placeholder="Generic name" className="input-field text-sm" />
                                <input required type="text" value={newMedicine.category} onChange={(e) => updateNewMedicineField('category', e.target.value)} placeholder="Category" className="input-field text-sm" />
                                <input required type="text" value={newMedicine.supplier} onChange={(e) => updateNewMedicineField('supplier', e.target.value)} placeholder="Supplier" className="input-field text-sm" />
                                <input required min="0" type="number" value={newMedicine.stock_quantity} onChange={(e) => updateNewMedicineField('stock_quantity', e.target.value)} placeholder="Stock quantity" className="input-field text-sm" />
                                <input required min="0" type="number" value={newMedicine.min_stock_level} onChange={(e) => updateNewMedicineField('min_stock_level', e.target.value)} placeholder="Min stock level" className="input-field text-sm" />
                                <input required min="0.01" step="0.01" type="number" value={newMedicine.price} onChange={(e) => updateNewMedicineField('price', e.target.value)} placeholder="Price" className="input-field text-sm" />
                                <input required type="text" value={newMedicine.unit} onChange={(e) => updateNewMedicineField('unit', e.target.value)} placeholder="Unit (e.g. tablets)" className="input-field text-sm" />
                            </div>

                            <label className="flex items-center gap-2 text-sm text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={newMedicine.prescription_required}
                                    onChange={(e) => updateNewMedicineField('prescription_required', e.target.checked)}
                                />
                                Prescription required
                            </label>

                            {addError && (
                                <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 px-3 py-2 text-sm">
                                    {addError}
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button type="button" onClick={() => { setShowAddModal(false); resetNewMedicine() }} className="btn-secondary text-sm">
                                    Cancel
                                </button>
                                <button type="submit" disabled={adding} className="flex items-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm text-white bg-emerald-600 hover:bg-emerald-500 transition-all disabled:opacity-60">
                                    {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                                    {adding ? 'Adding...' : 'Add Tablet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
