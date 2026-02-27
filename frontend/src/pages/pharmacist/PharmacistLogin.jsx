import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldAlert, Loader2, KeyRound, UserCircle } from 'lucide-react'
import axios from 'axios'

export default function PharmacistLogin({ onLogin, apiBase }) {
    const [username, setUsername] = useState('admin')
    const [password, setPassword] = useState('admin')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        try {
            const res = await axios.post(`${apiBase}/pharmacist/login`, { username, password })
            if (res.data.access_token) {
                onLogin(res.data.access_token)
            }
        } catch (err) {
            setError(err.response?.data?.detail || "Invalid credentials. Try admin/admin")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-teal-900/10 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-teal-500/10 blur-[120px] rounded-full pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-teal-500/20 rounded-2xl flex items-center justify-center border border-teal-500/30 mx-auto mb-6 shadow-[0_0_30px_rgba(20,184,166,0.3)]">
                        <ShieldAlert className="text-teal-400 w-10 h-10" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Pharmacist Portal</h1>
                    <p className="text-gray-400">AushadhiAI Admin Access</p>
                </div>

                <div className="glass-card rounded-2xl p-6 border border-white/10 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                                {error}
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Username</label>
                            <div className="relative">
                                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-3 text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                                    placeholder="admin"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-3 text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                                    placeholder="••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !username || !password}
                            className="w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-50 disabled:hover:bg-teal-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg hover:shadow-teal-500/25 flex items-center justify-center space-x-2"
                        >
                            {loading ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /><span>Authenticating...</span></>
                            ) : (
                                <span>Secure Login</span>
                            )}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    )
}
