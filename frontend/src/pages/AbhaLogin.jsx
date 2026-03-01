import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ShieldCheck, Mic, Sparkles, Heart, Loader2, ArrowRight } from 'lucide-react'
import api from '../api'
import { API_ENDPOINTS } from '../config'
import { useAppContext } from '../context/AppContext'

const DEMO_PATIENTS = [
    { name: 'Rajesh Kumar', abha: '1234-5678-9012', password: 'rajesh123', age: 58, cond: 'Diabetes, Hypertension', color: '#6366f1' },
    { name: 'Priya Sharma', abha: '2345-6789-0123', password: 'priya234', age: 34, cond: 'Allergies, Vit D', color: '#14b8a6' },
    { name: 'Amit Patel', abha: '3456-7890-1234', password: 'amit345', age: 62, cond: 'Cardiac, Lipids', color: '#f59e0b' },
    { name: 'Sunita Devi', abha: '4567-8901-2345', password: 'sunita456', age: 45, cond: 'Thyroid, GERD', color: '#f43f5e' },
    { name: 'Mohammed K.', abha: '5678-9012-3456', password: 'khalil567', age: 38, cond: 'Healthy', color: '#10b981' },
]

const FEATURES = [
    { icon: Sparkles, label: 'AI Pharmacist', sub: 'Gemini-powered advice' },
    { icon: Mic, label: 'Voice Enabled', sub: 'Hindi & English support' },
    { icon: Heart, label: 'Health History', sub: 'Full medical profile' },
    { icon: ShieldCheck, label: 'ABHA Secure', sub: '20% PMJAY discount' },
]

export default function AbhaLogin() {
    const navigate = useNavigate()
    const { setPatient } = useAppContext()
    
    const [abhaId, setAbhaId] = useState('')
    const [password, setPassword] = useState('')
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleLogin = async (e) => {
        e?.preventDefault()
        if (!abhaId || !password) { setError('Please enter ABHA ID and password'); return }
        setLoading(true); setError('')
        try {
            const res = await api.post(API_ENDPOINTS.AUTH_LOGIN, { abha_id: abhaId.trim(), password })
            setPatient(res.data.patient)
            localStorage.setItem('aushadhi_patient', JSON.stringify(res.data.patient))
            navigate('/dashboard')
        } catch (err) {
            setError(err.message || 'Login failed. Check your credentials.')
        } finally { setLoading(false) }
    }

    const fill = (p) => { setAbhaId(p.abha); setPassword(p.password); setError('') }

    return (
        <div className="min-h-screen page-bg flex relative overflow-hidden">
            <div className="hackfusion-bg" aria-hidden="true">
                <span className="hackfusion-grid" />
                <span className="hackfusion-plane plane-a" />
                <span className="hackfusion-plane plane-b" />
                <span className="hackfusion-glow" />
                <p className="hackfusion-title" data-text="HackFusion 3.0">HackFusion 3.0</p>
            </div>

            {/* ── Left panel ── */}
            <div className="hidden lg:flex flex-col justify-between w-[54%] px-16 py-14 relative overflow-hidden">
                {/* Decorative orbs */}
                <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
                    style={{ background: 'radial-gradient(circle, #6366f1, transparent)', filter: 'blur(80px)' }} />
                <div className="absolute bottom-10 right-10 w-72 h-72 rounded-full opacity-15"
                    style={{ background: 'radial-gradient(circle, #14b8a6, transparent)', filter: 'blur(60px)' }} />

                {/* Logo */}
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #4f46e5, #818cf8)', boxShadow: '0 0 24px rgba(99,102,241,0.5)' }}>
                            <Heart className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-white font-black text-2xl tracking-tight">
                            Aushadhi<span className="text-gradient">AI</span>
                        </span>
                    </div>
                    <p className="text-slate-500 text-sm ml-1">AI Healthcare Platform · Powered by Google Gemini</p>
                </div>

                {/* Hero content */}
                <div className="anim-up">
                    <p className="text-[11px] font-bold tracking-[0.2em] text-indigo-400 uppercase mb-4">Your Digital Pharmacist</p>
                    <h1 className="text-5xl font-black text-white leading-tight mb-6"
                        style={{ fontFamily: "'Playfair Display', serif" }}>
                        Healthcare,<br />
                        <span className="text-gradient">Reimagined</span><br />
                        with AI.
                    </h1>
                    <p className="text-slate-400 text-lg leading-relaxed max-w-sm">
                        Voice-enabled AI pharmacist that understands your health history, validates prescriptions, and delivers medicines to your door.
                    </p>
                </div>

                {/* Feature pills */}
                <div className="grid grid-cols-2 gap-3">
                    {FEATURES.map(({ icon: Icon, label, sub }, i) => (
                        <div key={label} className={`glass-sm p-4 flex items-center gap-3 anim-up delay-${i + 1}`}>
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ background: 'rgba(99,102,241,0.15)' }}>
                                <Icon className="w-4 h-4 text-indigo-400" />
                            </div>
                            <div>
                                <p className="text-white text-sm font-semibold">{label}</p>
                                <p className="text-slate-500 text-xs">{sub}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Demo patients */}
                <div>
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">Quick Demo Login</p>
                    <div className="flex flex-wrap gap-2">
                        {DEMO_PATIENTS.map(p => (
                            <button key={p.abha} onClick={() => fill(p)}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all hover:scale-[1.04]"
                                style={{ borderColor: `${p.color}30`, background: `${p.color}12`, color: p.color }}>
                                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black"
                                    style={{ background: `${p.color}30` }}>{p.name[0]}</span>
                                {p.name.split(' ')[0]}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Right panel / Login form ── */}
            <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full opacity-10"
                        style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)', filter: 'blur(60px)' }} />
                </div>

                <div className="w-full max-w-sm anim-appear">
                    {/* Mobile logo */}
                    <div className="flex lg:hidden items-center gap-2 mb-8">
                        <Heart className="w-6 h-6 text-indigo-400" />
                        <span className="text-white font-black text-xl">AushadhiAI</span>
                    </div>

                    <div className="med-agent-stage mb-5" aria-hidden="true">
                        <div className="med-agent-halo" />
                        <div className="med-agent-core">
                            <ShieldCheck className="w-6 h-6 text-indigo-300" />
                            <span className="med-agent-pulse" />
                        </div>
                        <span className="med-agent-ring ring-a" />
                        <span className="med-agent-ring ring-b" />
                        <div className="med-agent-chip chip-a">
                            <Sparkles className="w-3.5 h-3.5 text-violet-300" />
                        </div>
                        <div className="med-agent-chip chip-b">
                            <Mic className="w-3.5 h-3.5 text-teal-300" />
                        </div>
                        <div className="med-agent-chip chip-c">
                            <Heart className="w-3.5 h-3.5 text-rose-300" />
                        </div>
                        <p className="med-agent-label">AI Medical Agent</p>
                    </div>

                    <div className="card-luxury p-8">
                        <div className="mb-8">
                            <h2 className="text-2xl font-black text-white mb-1.5">Patient Login</h2>
                            <p className="text-slate-500 text-sm">Sign in with your ABHA ID and password</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-5">
                            {/* ABHA ID */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">ABHA ID</label>
                                <div className="relative">
                                    <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                                    <input type="text" value={abhaId} onChange={e => setAbhaId(e.target.value)}
                                        placeholder="XXXX-XXXX-XXXX" className="input pl-10 text-sm" />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Password</label>
                                <div className="relative">
                                    <input type={showPass ? 'text' : 'password'} value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="Enter your password" className="input pr-10 text-sm" />
                                    <button type="button" onClick={() => setShowPass(x => !x)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors">
                                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-red-400"
                                    style={{ background: 'rgba(244,63,94,0.10)', border: '1px solid rgba(244,63,94,0.20)' }}>
                                    {error}
                                </div>
                            )}

                            <button type="submit" disabled={loading}
                                className="btn btn-primary w-full text-sm py-3.5">
                                {loading
                                    ? <><Loader2 className="w-4 h-4 anim-spin" /> Verifying…</>
                                    : <><span>Sign In</span> <ArrowRight className="w-4 h-4" /></>}
                            </button>
                        </form>

                        <div className="mt-6 pt-6 border-t border-white/8 text-center">
                            <span className="text-slate-600 text-xs">Pharmacist? </span>
                            <a href="/pharmacist/login" className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold transition-colors">
                                Access Pharmacist Portal →
                            </a>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-4 mt-6 text-[10px] text-slate-700">
                        <span>🔒 ABHA Secure</span>
                        <span>✦</span>
                        <span>🤖 Live AI Agents</span>
                        <span>✦</span>
                        <span>💊 PMJAY Welfare</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
