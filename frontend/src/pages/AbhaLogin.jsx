import React, { useState } from 'react'
import axios from 'axios'
import { Shield, Pill, Mic, Stethoscope, AlertCircle, Loader2 } from 'lucide-react'

const DEMO_PATIENTS = [
    { abha_id: '1234-5678-9012', name: 'Rajesh Kumar', hint: 'Age 58, Diabetic' },
    { abha_id: '2345-6789-0123', name: 'Priya Sharma', hint: 'Age 34, Allergies' },
    { abha_id: '3456-7890-1234', name: 'Amit Patel', hint: 'Age 62, Cardiac' },
]

export default function AbhaLogin({ onLogin, apiBase }) {
    const [abhaId, setAbhaId] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const formatAbha = (val) => {
        const digits = val.replace(/\D/g, '').slice(0, 12)
        return digits.replace(/(\d{4})(\d{0,4})(\d{0,4})/, (_, a, b, c) =>
            [a, b, c].filter(Boolean).join('-')
        )
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (abhaId.replace(/-/g, '').length < 12) {
            setError('Please enter a valid 12-digit ABHA ID')
            return
        }
        setLoading(true)
        setError('')
        try {
            let patient
            try {
                const res = await axios.post(`${apiBase}/patients/login?abha_id=${abhaId}`)
                patient = res.data.patient
            } catch {
                // Backend offline – use simulated lookup
                const demo = DEMO_PATIENTS.find(p => p.abha_id === abhaId)
                patient = demo
                    ? { patient_id: `P00${DEMO_PATIENTS.indexOf(demo) + 1}`, abha_id: abhaId, name: demo.name, age: 40, gender: 'Unknown', chronic_conditions: [] }
                    : { patient_id: `P-${abhaId.slice(0, 4)}`, abha_id: abhaId, name: 'Patient', age: 30, gender: 'Unknown', chronic_conditions: [] }
            }
            onLogin(patient)
        } catch (err) {
            setError('Login failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
            {/* Background gradient orbs */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-md relative z-10 animate-fade-in">
                {/* Logo */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 mb-5 shadow-2xl shadow-indigo-500/40">
                        <Pill className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2">
                        Aushadhi<span className="text-indigo-400">AI</span>
                    </h1>
                    <p className="text-slate-400 text-sm">Voice-Enabled Agentic AI Pharmacist</p>
                </div>

                {/* Features row */}
                <div className="flex gap-3 mb-8">
                    {[
                        { icon: Stethoscope, label: 'AI Diagnosis' },
                        { icon: Mic, label: 'Voice Chat' },
                        { icon: Shield, label: 'ABHA Secure' },
                    ].map(({ icon: Icon, label }) => (
                        <div key={label} className="flex-1 glass-card p-3 text-center">
                            <Icon className="w-5 h-5 mx-auto mb-1 text-indigo-400" />
                            <span className="text-xs text-slate-400">{label}</span>
                        </div>
                    ))}
                </div>

                {/* Login form */}
                <div className="glass-card p-8">
                    <h2 className="text-xl font-semibold text-white mb-2">Sign In with ABHA ID</h2>
                    <p className="text-slate-400 text-sm mb-6">
                        Enter your 12-digit Ayushman Bharat Health Account ID
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">ABHA ID</label>
                            <input
                                id="abha-input"
                                type="text"
                                value={abhaId}
                                onChange={(e) => setAbhaId(formatAbha(e.target.value))}
                                placeholder="XXXX-XXXX-XXXX"
                                className="input-field text-lg tracking-widest font-mono"
                                autoComplete="off"
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <button id="login-btn" type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 text-base">
                            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Authenticating...</> : 'Login →'}
                        </button>
                    </form>

                    {/* Demo shortcuts */}
                    <div className="mt-6 pt-6 border-t border-white/10">
                        <p className="text-xs text-slate-500 mb-3 text-center">Demo Patients (click to autofill)</p>
                        <div className="space-y-2">
                            {DEMO_PATIENTS.map((p) => (
                                <button
                                    key={p.abha_id}
                                    id={`demo-${p.abha_id}`}
                                    onClick={() => setAbhaId(p.abha_id)}
                                    className="w-full text-left flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 transition-colors duration-150 group"
                                >
                                    <div>
                                        <span className="text-sm text-white font-medium">{p.name}</span>
                                        <span className="text-xs text-slate-500 ml-2">{p.hint}</span>
                                    </div>
                                    <span className="text-xs font-mono text-slate-500 group-hover:text-indigo-400 transition-colors">{p.abha_id}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
