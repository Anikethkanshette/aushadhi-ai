import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { AlertTriangle, PackageSearch, Loader2, FileText, X } from 'lucide-react'

export default function InventoryManager({ apiBase }) {
    const [medicines, setMedicines] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [showPOModal, setShowPOModal] = useState(false)
    const [poDraft, setPoDraft] = useState('')
    const [generating, setGenerating] = useState(false)

    useEffect(() => {
        const fetchMeds = async () => {
            try {
                const res = await axios.get(`${apiBase}/pharmacist/inventory`)
                setMedicines(res.data.medicines)
            } catch (e) {
                console.error('Failed to load inventory', e)
            } finally { setLoading(false) }
        }
        fetchMeds()
    }, [apiBase])

    if (loading) return <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-500" /></div>

    const filtered = medicines.filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.generic_name.toLowerCase().includes(search.toLowerCase())
    )

    const handleGeneratePO = async () => {
        setGenerating(true)
        setShowPOModal(true)
        try {
            const res = await axios.post(`${apiBase}/pharmacist/generate-po`)
            setPoDraft(res.data.po_draft)
        } catch (e) {
            setPoDraft("Error generating Purchase Order. Please try again.")
        } finally {
            setGenerating(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                <div>
                    <h3 className="text-xl font-semibold text-white">Inventory Management</h3>
                    <p className="text-sm text-gray-400 mt-1">Monitor stock and automate restocks</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleGeneratePO}
                        disabled={generating}
                        className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-4 py-2.5 rounded-xl font-medium shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 transition-all disabled:opacity-50"
                    >
                        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                        Generate Restock PO
                    </button>
                    <div className="relative w-64 block">
                        <PackageSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search medicines..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500 transition-colors"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-gray-400 text-sm border-b border-white/10">
                        <tr>
                            <th className="p-4 font-medium">Product ID</th>
                            <th className="p-4 font-medium">Name & Generic</th>
                            <th className="p-4 font-medium">Category</th>
                            <th className="p-4 font-medium text-right">Price</th>
                            <th className="p-4 font-medium text-right">Stock Level</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {filtered.map(med => {
                            const isLow = parseInt(med.stock_quantity) < parseInt(med.min_stock_level)
                            const isOut = parseInt(med.stock_quantity) === 0
                            return (
                                <tr key={med.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 text-sm font-mono text-gray-400">{med.id}</td>
                                    <td className="p-4">
                                        <div className="text-white font-medium flex items-center space-x-2">
                                            <span>{med.name}</span>
                                            {med.prescription_required && (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">Rx</span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500">{med.generic_name}</div>
                                    </td>
                                    <td className="p-4 text-sm text-gray-400">{med.category}</td>
                                    <td className="p-4 text-sm text-right">₹{med.price.toFixed(2)}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            {isLow && !isOut && <AlertTriangle size={14} className="text-yellow-500" />}
                                            {isOut && <AlertTriangle size={14} className="text-red-500" />}
                                            <span className={`font-medium ${isOut ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-green-400'}`}>
                                                {med.stock_quantity}
                                            </span>
                                            <span className="text-gray-500 text-xs text-left w-8">/ {med.min_stock_level}</span>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* PO Modal */}
            {showPOModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[#15202b] border border-teal-500/20 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-teal-500/20 flex justify-between items-center bg-teal-500/5">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <FileText className="w-5 h-5 text-teal-400" />
                                Smart Restock Purchase Order
                            </h3>
                            <button onClick={() => setShowPOModal(false)} className="p-2 -mr-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {generating ? (
                                <div className="py-20 flex flex-col items-center justify-center text-teal-400">
                                    <Loader2 className="w-10 h-10 animate-spin mb-4" />
                                    <p className="animate-pulse">AI Agent analyzing inventory levels and drafting PO...</p>
                                </div>
                            ) : (
                                <div className="bg-white/5 p-6 rounded-2xl border border-white/10 font-mono text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                                    {poDraft}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-teal-500/20 bg-black/20 flex justify-end gap-3">
                            <button
                                onClick={() => setShowPOModal(false)}
                                className="px-5 py-2.5 rounded-xl font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={generating || poDraft.includes('All inventory levels')}
                                className="px-5 py-2.5 rounded-xl font-medium bg-teal-500 text-white shadow-lg shadow-teal-500/20 hover:bg-teal-400 disabled:opacity-50 disabled:hover:bg-teal-500 transition-colors flex items-center gap-2"
                            >
                                <FileText className="w-4 h-4" />
                                Send Order to Distributor
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
