import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { AlertTriangle, PackageSearch, Loader2 } from 'lucide-react'

export default function InventoryManager({ apiBase }) {
    const [medicines, setMedicines] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-white">Inventory Management</h3>
                <div className="relative w-72">
                    <PackageSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search medicines..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-teal-500 transition-colors"
                    />
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
        </div>
    )
}
