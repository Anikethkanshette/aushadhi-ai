import React, { useState } from 'react'
import axios from 'axios'
import { Eye, EyeOff, ShieldAlert, ArrowRight, Loader2, Zap, Package, Users, FileSpreadsheet } from 'lucide-react'

const CAPS = [
    { icon: Zap, label: 'Live Order Management' },
    { icon: Package, label: 'Smart Inventory Control' },
    { icon: Users, label: 'Patient Notification System' },
    { icon: FileSpreadsheet, label: 'Excel Data Exports' },
]

export default function PharmacistLogin({ onLogin, apiBase }) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleLogin = async (e) => {
        e?.preventDefault()
        setLoading(true); setError('')
        try {
            const res = await axios.post(`${apiBase}/pharmacist/login`, { username, password })
            onLogin(res.data.access_token)
        } catch (err) {
            setError(err.response?.data?.detail || 'Invalid credentials')
        } finally { setLoading(false) }
    }

    return (
        <div className="min-h-screen page-bg flex">
            {/* Left */}
            <div className="hidden lg:flex flex-col justify-between w-[52%] px-16 py-14 relative overflow-hidden">
                <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-15"
                    style={{ background: 'radial-gradient(circle, #0d9488, transparent)', filter: 'blur(100px)' }} />
                <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full opacity-10"
                    style={{ background: 'radial-gradient(circle, #6366f1, transparent)', filter: 'blur(60px)' }} />

                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)', boxShadow: '0 0 24px rgba(20,184,166,0.4)' }}>
                        <ShieldAlert className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <span className="text-white font-black text-xl tracking-tight">
                            Aushadhi<span className="text-gradient-teal">AI</span>
                        </span>
                        <p className="text-[10px] text-teal-500/70 font-bold uppercase tracking-widest">Pharmacist Portal</p>
                    </div>
                </div>

                <div className="anim-up space-y-5">
                    <p className="text-[11px] font-bold tracking-[0.2em] text-teal-400 uppercase">Admin Dashboard</p>
                    <h1 className="text-5xl font-black text-white leading-tight"
                        style={{ fontFamily: "'Playfair Display', serif" }}>
                        Manage.<br />
                        <span className="text-gradient-teal">Notify.</span><br />
                        Deliver.
                    </h1>
                    <p className="text-slate-400 text-base leading-relaxed max-w-sm">
                        Complete pharmacy management — approve orders, manage inventory, export data, and send notifications directly to patients.
                    </p>
                </div>

                <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">Portal Capabilities</p>
                    {CAPS.map(({ icon: Icon, label }, i) => (
                        <div key={label} className={`flex items-center gap-3 py-2.5 px-4 rounded-xl anim-in delay-${i + 1}`}
                            style={{ background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.12)' }}>
                            <Icon className="w-4 h-4 text-teal-400 flex-shrink-0" />
                            <span className="text-slate-300 text-sm font-medium">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right */}
            <div className="flex-1 flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-sm anim-appear">
                    <div className="card-luxury p-8">
                        <div className="mb-8 text-center">
                            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center anim-glow"
                                style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)' }}>
                                <ShieldAlert className="w-7 h-7 text-white" />
                            </div>
                            <h2 className="text-2xl font-black text-white mb-1">Pharmacist Login</h2>
                            <p className="text-slate-500 text-sm">Default: <code className="text-teal-400 font-mono bg-teal-500/10 px-1.5 py-0.5 rounded">admin / admin</code></p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Username</label>
                                <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                                    placeholder="admin" className="input text-sm" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Password</label>
                                <div className="relative">
                                    <input type={showPass ? 'text' : 'password'} value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••••" className="input pr-10 text-sm" />
                                    <button type="button" onClick={() => setShowPass(x => !x)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors">
                                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="px-4 py-3 rounded-xl text-sm text-red-400 flex items-center gap-2"
                                    style={{ background: 'rgba(244,63,94,0.10)', border: '1px solid rgba(244,63,94,0.20)' }}>
                                    {error}
                                </div>
                            )}

                            <button type="submit" disabled={loading}
                                className="btn btn-teal w-full text-sm py-3.5 mt-2">
                                {loading
                                    ? <><Loader2 className="w-4 h-4 anim-spin" /> Authenticating…</>
                                    : <><span>Access Portal</span><ArrowRight className="w-4 h-4" /></>}
                            </button>
                        </form>

                        <div className="mt-6 pt-5 border-t border-white/8 text-center">
                            <a href="/" className="text-slate-600 hover:text-slate-400 text-xs transition-colors">← Patient Portal</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
