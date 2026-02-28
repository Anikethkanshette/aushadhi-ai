import React, { useState, useEffect } from 'react'
import axios from 'axios'
import {
    Bell, Send, CheckCircle2, Loader2, User, ChevronDown,
    MessageSquare, AlertTriangle, Calendar, RefreshCw, Clock,
    Sparkles, X, BellRing
} from 'lucide-react'

const NOTIF_TYPES = [
    { id: 'general', label: 'General', color: '#6366f1', desc: 'General message from pharmacist' },
    { id: 'refill', label: 'Refill Alert', color: '#f59e0b', desc: 'Medicine refill reminder' },
    { id: 'alert', label: 'Health Alert', color: '#f43f5e', desc: 'Important health notice' },
    { id: 'appointment', label: 'Appointment', color: '#14b8a6', desc: 'Appointment reminder/info' },
]

const QUICK_MSGS = [
    'Your medicine refill is due. Please visit or order online.',
    'Your recent order is ready for pickup.',
    'Please remember to take your medication as prescribed.',
    'Your prescription has been verified and approved.',
    'We noticed you missed your last refill. Do you need assistance?',
    "Annual health check-up reminder — it's been over 6 months.",
]

export default function NotifyPatient({ apiBase, patients = [] }) {
    const [form, setForm] = useState({ patient_id: '', patient_name: '', subject: '', message: '', type: 'general' })
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(null)
    const [history, setHistory] = useState([])
    const [loadingHistory, setLoadingHistory] = useState(true)
    const [tab, setTab] = useState('compose') // compose | history

    const fetchHistory = async () => {
        try {
            const res = await axios.get(`${apiBase}/pharmacist/notifications`)
            setHistory(res.data.notifications || [])
        } catch { } finally { setLoadingHistory(false) }
    }

    useEffect(() => { fetchHistory() }, [apiBase])

    const selectPatient = (p) => setForm(f => ({ ...f, patient_id: p.patient_id || '', patient_name: p.name }))
    const setQuick = (msg) => setForm(f => ({ ...f, message: msg }))

    const handleSend = async () => {
        if (!form.patient_name || !form.message) return
        setSending(true); setSent(null)
        try {
            const res = await axios.post(`${apiBase}/pharmacist/notify-patient`, form)
            setSent(res.data.notification)
            setForm(f => ({ ...f, message: '', subject: '' }))
            fetchHistory()
            setTimeout(() => setSent(null), 5000)
        } catch { } finally { setSending(false) }
    }

    const typeConfig = NOTIF_TYPES.find(t => t.id === form.type) || NOTIF_TYPES[0]

    const TYPE_BADGE = {
        general: 'badge-indigo',
        refill: 'badge-amber',
        alert: 'badge-red',
        appointment: 'badge-teal',
    }

    return (
        <div className="p-8 max-w-5xl space-y-6 anim-fade">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
                        <BellRing className="w-6 h-6 text-indigo-400" />
                        Patient Notifications
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Send AI-enhanced messages to patients directly from the portal.</p>
                </div>
                {/* Tab switcher */}
                <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {[['compose', 'Compose'], ['history', `History (${history.length})`]].map(([k, l]) => (
                        <button key={k} onClick={() => setTab(k)}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === k ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-white'}`}>
                            {l}
                        </button>
                    ))}
                </div>
            </div>

            {tab === 'compose' && (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Compose form */}
                    <div className="lg:col-span-3 space-y-5">
                        <div className="glass p-6 space-y-5">
                            {/* Patient selector */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Select Patient</label>
                                {patients.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                        {patients.map(p => (
                                            <button key={p.patient_id} onClick={() => selectPatient(p)}
                                                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${form.patient_id === (p.patient_id || '') && form.patient_name === p.name ? 'bg-indigo-600 text-white border-transparent' : 'bg-white/4 text-slate-400 border border-white/8 hover:text-white hover:bg-white/8'}`}>
                                                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs flex-shrink-0"
                                                    style={{ background: `linear-gradient(135deg, ${['#6366f1', '#14b8a6', '#f59e0b', '#f43f5e', '#10b981'][patients.indexOf(p) % 5]}, #0e1827)` }}>
                                                    {p.name?.[0]}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate">{p.name}</p>
                                                    <p className="text-[9px] opacity-60 font-mono truncate">{p.abha_id}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <input type="text" placeholder="Patient name" value={form.patient_name}
                                        onChange={e => setForm(f => ({ ...f, patient_name: e.target.value }))}
                                        className="input text-sm mb-3" />
                                )}
                                {form.patient_name && (
                                    <div className="flex items-center gap-2 text-xs text-indigo-400 font-medium">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Sending to: {form.patient_name}
                                    </div>
                                )}
                            </div>

                            {/* Notification type */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Notification Type</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {NOTIF_TYPES.map(t => (
                                        <button key={t.id} onClick={() => setForm(f => ({ ...f, type: t.id }))}
                                            className={`px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all border ${form.type === t.id ? 'text-white border-transparent' : 'bg-white/4 text-slate-500 border-white/8 hover:text-white'}`}
                                            style={form.type === t.id ? { background: `${t.color}25`, borderColor: `${t.color}40`, color: t.color } : {}}>
                                            {t.label}
                                            <p className="text-[9px] opacity-60 mt-0.5 font-normal">{t.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Subject */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Subject (optional)</label>
                                <input type="text" placeholder="e.g. Refill Reminder for Metformin"
                                    value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                                    className="input text-sm" />
                            </div>

                            {/* Message */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Message <span className="text-indigo-400">· AI-Enhanced before delivery</span></label>
                                <textarea rows={4} placeholder="Type your message here…"
                                    value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                                    className="input text-sm resize-none leading-relaxed" />
                                <p className="text-xs text-slate-600 mt-1.5 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-indigo-500" />
                                    Gemini will enhance this message to sound warm and professional
                                </p>
                            </div>

                            {/* Sent confirmation */}
                            {sent && (
                                <div className="flex items-start gap-3 p-4 rounded-xl anim-up" style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-emerald-300 font-bold text-sm">Notification Sent!</p>
                                        <p className="text-slate-400 text-xs mt-1">"{sent.enhanced}"</p>
                                    </div>
                                </div>
                            )}

                            <button onClick={handleSend}
                                disabled={sending || !form.patient_name || !form.message}
                                className="btn btn-primary w-full py-3.5 text-sm">
                                {sending
                                    ? <><Loader2 className="w-4 h-4 anim-spin" /> Sending & Enhancing with AI…</>
                                    : <><Send className="w-4 h-4" /> Send Notification</>}
                            </button>
                        </div>
                    </div>

                    {/* Quick messages sidebar */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="glass p-5">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Quick Messages</p>
                            <div className="space-y-2">
                                {QUICK_MSGS.map((msg, i) => (
                                    <button key={i} onClick={() => setQuick(msg)}
                                        className="w-full text-left text-xs px-3 py-2.5 rounded-xl transition-all text-slate-400 hover:text-white"
                                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                                        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'}
                                        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}>
                                        {msg}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="glass p-5">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Tips</p>
                            <ul className="space-y-2 text-xs text-slate-500 leading-relaxed">
                                <li className="flex gap-2"><span className="text-indigo-400 mt-0.5">✦</span> AI enhances your message using Gemini before delivery</li>
                                <li className="flex gap-2"><span className="text-amber-400 mt-0.5">✦</span> Broadcast to all by leaving patient field empty</li>
                                <li className="flex gap-2"><span className="text-emerald-400 mt-0.5">✦</span> Patients see notifications in their dashboard bell icon</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {tab === 'history' && (
                <div className="space-y-3 anim-up">
                    <div className="flex items-center justify-between">
                        <p className="text-slate-500 text-sm">{history.length} notifications sent</p>
                        <button onClick={fetchHistory} className="btn btn-ghost text-xs px-3 py-2 gap-1.5">
                            <RefreshCw className="w-3.5 h-3.5" /> Refresh
                        </button>
                    </div>

                    {loadingHistory ? (
                        Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-20" />)
                    ) : history.length === 0 ? (
                        <div className="glass py-20 text-center">
                            <Bell className="w-10 h-10 mx-auto text-slate-700 mb-3" />
                            <p className="text-slate-500">No notifications sent yet</p>
                        </div>
                    ) : history.map(n => (
                        <div key={n.id} className="glass-hover p-5 flex gap-4 items-start">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ background: `${NOTIF_TYPES.find(t => t.id === n.type)?.color || '#6366f1'}20` }}>
                                <Bell className="w-5 h-5" style={{ color: NOTIF_TYPES.find(t => t.id === n.type)?.color || '#6366f1' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className="text-white font-bold text-sm">{n.patient_name || 'All Patients'}</span>
                                    <span className={`badge ${TYPE_BADGE[n.type] || 'badge-indigo'}`}>{n.type}</span>
                                    <span className="text-slate-600 text-[10px] ml-auto font-mono">{n.sent_at}</span>
                                </div>
                                {n.subject && <p className="text-slate-400 text-xs font-semibold mb-1">{n.subject}</p>}
                                <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">{n.enhanced || n.message}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
