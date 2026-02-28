import React, { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { Mic, MicOff, Send, Bot, User, Loader2, Volume2, VolumeX, Upload, X, Sparkles, Zap } from 'lucide-react'

/* ── Speech Recognition hook ──────────────────────────────────────────────── */
function useSpeechRecognition(onResult) {
    const recognitionRef = useRef(null)
    const [listening, setListening] = useState(false)

    const start = (lang = 'en-IN') => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SR) return alert('Speech recognition not supported in this browser.')
        const recognition = new SR()
        recognition.lang = lang
        recognition.continuous = false
        recognition.interimResults = false
        recognition.onresult = (e) => onResult(e.results[0][0].transcript)
        recognition.onend = () => setListening(false)
        recognition.onerror = () => setListening(false)
        recognition.start()
        recognitionRef.current = recognition
        setListening(true)
    }

    const stop = () => { recognitionRef.current?.stop(); setListening(false) }
    return { listening, start, stop }
}

function speak(text, lang = 'en-IN') {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = lang; utter.rate = 0.95
    window.speechSynthesis.speak(utter)
}

/* ── Chat bubble ──────────────────────────────────────────────────────────── */
function ChatBubble({ msg }) {
    const isBot = msg.role === 'assistant'
    return (
        <div className={`flex gap-3 anim-up ${isBot ? '' : 'flex-row-reverse'}`}>
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0`}
                style={{
                    background: isBot
                        ? 'linear-gradient(135deg, #4f46e5, #14b8a6)'
                        : 'linear-gradient(135deg, #7c3aed, #db2777)',
                }}>
                {isBot ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-white" />}
            </div>

            {/* Bubble */}
            <div className={`max-w-[76%] text-sm leading-relaxed`}>
                <div className={`rounded-2xl px-4 py-3 ${isBot ? 'rounded-tl-sm' : 'rounded-tr-sm'}`}
                    style={isBot
                        ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: '#e2e8f0' }
                        : { background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: '#fff' }}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>

                    {/* Medicine results */}
                    {msg.medicines?.length > 0 && (
                        <div className="mt-3 space-y-2">
                            {msg.medicines.map(m => (
                                <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-xl"
                                    style={{ background: 'rgba(255,255,255,0.08)' }}>
                                    <div>
                                        <p className="font-semibold text-xs">{m.name}</p>
                                        <p className="text-[10px] opacity-70">₹{m.price} · {m.generic_name}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={`badge text-[9px] ${m.available ? 'badge-green' : 'badge-red'}`}>
                                            {m.available ? '✓ In Stock' : 'Out of Stock'}
                                        </span>
                                        {m.prescription_required && <span className="badge badge-amber text-[9px]">Rx</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Welfare */}
                    {msg.welfare_eligible && (
                        <div className="mt-2 text-[11px] rounded-lg px-2.5 py-1.5"
                            style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>
                            🎉 PMJAY eligible – 20% discount applied
                        </div>
                    )}
                </div>
                <p className="text-[10px] mt-1.5 px-1" style={{ color: '#475569' }}>{msg.time}</p>
            </div>
        </div>
    )
}

/* ── Main ─────────────────────────────────────────────────────────────────── */
const QUICK_PROMPTS = [
    '💊 I need Paracetamol 500mg',
    '📦 Check Metformin availability',
    '🔄 Alternatives to Atorvastatin',
    '📋 Show my order history',
]

const QUICK_ACTIONS = [
    { id: 'search', label: 'Search Medicine', message: 'Search medicines for fever and show in-stock options.' },
    { id: 'order', label: 'Order Help', message: 'Help me place an order for my medicines.' },
    { id: 'history', label: 'Order History', message: 'Show my recent order history summary.' },
]

export default function ChatPage({ patient, apiBase }) {
    const [messages, setMessages] = useState([{
        role: 'assistant',
        content: `Hello ${patient?.name?.split(' ')[0] || 'there'}! 👋 I'm your AI Pharmacist powered by Gemini. Ask me about medicines, check availability, verify prescriptions, or track orders. You can also speak using the mic!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [lang, setLang] = useState('en-IN')
    const [ttsEnabled, setTts] = useState(true)
    const [hasPrescription, setHasRx] = useState(false)
    const [prescriptionFile, setRxFile] = useState(null)
    const bottomRef = useRef(null)
    const fileRef = useRef(null)
    const textareaRef = useRef(null)

    const addMsg = (role, content, extra = {}) =>
        setMessages(prev => [...prev, { role, content, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), ...extra }])

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

    // Auto-resize textarea
    useEffect(() => {
        const ta = textareaRef.current
        if (!ta) return
        ta.style.height = 'auto'
        ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
    }, [input])

    const sendMessage = async (text) => {
        if (!text.trim()) return
        addMsg('user', text)
        setInput('')
        setLoading(true)
        try {
            const res = await axios.post(`${apiBase}/agent/chat`, {
                message: text,
                patient_id: patient?.patient_id,
                abha_id: patient?.abha_id,
                language: lang,
                has_prescription: hasPrescription,
            })
            const data = res.data
            addMsg('assistant', data.response, { medicines: data.medicines_found, welfare_eligible: data.welfare_eligible })
            if (ttsEnabled) speak(data.response.replace(/[*#\[\]]/g, '').slice(0, 300), lang)
        } catch {
            const fallback = getFallback(text)
            addMsg('assistant', fallback)
            if (ttsEnabled) speak(fallback.slice(0, 200), lang)
        } finally { setLoading(false) }
    }

    const getFallback = (text) => {
        const t = text.toLowerCase()
        if (t.includes('paracetamol') || t.includes('dolo')) return '💊 Paracetamol 500mg – ₹25 | In Stock (500 units) | OTC – No prescription needed.'
        if (t.includes('amoxicillin')) return '⚕️ Amoxicillin 500mg requires a valid prescription (Schedule H). Please upload your prescription.'
        if (t.includes('metformin')) return '💊 Metformin 500mg – ₹30 | In Stock | Prescription Required. Would you like your refill history?'
        return '👋 I\'m your AI Pharmacist (offline mode). Type a medicine name to check availability, price, and prescription status.'
    }

    const { listening, start, stop } = useSpeechRecognition((text) => { setInput(text); sendMessage(text) })

    const handleRxUpload = async (e) => {
        const file = e.target.files[0]; if (!file) return
        setRxFile(file); setHasRx(true)
        addMsg('user', `📄 Uploaded Prescription: ${file.name}`)
        setLoading(true)
        try {
            const fd = new FormData(); fd.append('image', file)
            const res = await axios.post(`${apiBase}/agent/scan-prescription`, fd)
            const data = res.data
            const meds = (data.medicines || []).map(m => m.matched_medicine ? { ...m.matched_medicine, available: m.available } : null).filter(Boolean)
            addMsg('assistant', `✅ Prescription scanned. ${data.message} Matches found:`, { medicines: meds })
            if (ttsEnabled) speak('I have scanned your prescription. Here are the matching medicines.', lang)
        } catch { addMsg('assistant', '⚠️ Could not process the prescription image. Please try a clearer photo.') }
        finally { setLoading(false) }
    }

    return (
        <div className="flex flex-col h-full" style={{ background: 'var(--c-surface)' }}>

            {/* ── Chat header ── */}
            <div className="px-6 py-4 flex items-center justify-between flex-shrink-0"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(3,7,15,0.6)' }}>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #4f46e5, #14b8a6)', boxShadow: '0 0 16px rgba(99,102,241,0.35)' }}>
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-white font-black text-base flex items-center gap-1.5">
                            AI Pharmacist
                            <span className="badge badge-teal text-[9px] py-0.5">
                                <Sparkles className="w-2.5 h-2.5" /> Gemini
                            </span>
                        </h2>
                        <p className="text-slate-600 text-xs">Ask about medicines, availability, or orders</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Language */}
                    <select value={lang} onChange={e => setLang(e.target.value)}
                        style={{
                            fontSize: '11px', background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.10)', borderRadius: '10px',
                            padding: '6px 10px', color: '#94a3b8',
                        }}>
                        <option value="en-IN">English</option>
                        <option value="hi-IN">हिंदी</option>
                    </select>

                    {/* TTS */}
                    <button onClick={() => setTts(t => !t)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                        style={{ background: ttsEnabled ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                        title={ttsEnabled ? 'Voice on' : 'Voice off'}>
                        {ttsEnabled
                            ? <Volume2 className="w-4 h-4 text-indigo-400" />
                            : <VolumeX className="w-4 h-4 text-slate-600" />}
                    </button>

                    {/* Prescription upload */}
                    <input type="file" ref={fileRef} onChange={handleRxUpload} accept="image/*,.pdf" className="hidden" />
                    <button onClick={() => fileRef.current?.click()}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl transition-all"
                        style={hasPrescription
                            ? { background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399' }
                            : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: '#64748b' }}>
                        <Upload className="w-3.5 h-3.5" />
                        {hasPrescription ? 'Rx ✓' : 'Upload Rx'}
                    </button>
                    {prescriptionFile && (
                        <button onClick={() => { setRxFile(null); setHasRx(false) }}
                            className="text-slate-600 hover:text-red-400 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            <div className="px-6 py-2.5 flex gap-2 flex-wrap border-b border-white/5">
                {QUICK_ACTIONS.map(action => (
                    <button
                        key={action.id}
                        onClick={() => sendMessage(action.message)}
                        className="text-xs px-3 py-1.5 rounded-xl transition-all font-semibold"
                        style={{
                            background: 'rgba(20,184,166,0.10)',
                            border: '1px solid rgba(20,184,166,0.22)',
                            color: '#99f6e4',
                        }}
                    >
                        {action.label}
                    </button>
                ))}
            </div>

            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scroll">
                {messages.map((msg, i) => <ChatBubble key={i} msg={msg} />)}

                {/* Typing indicator */}
                {loading && (
                    <div className="flex gap-3 anim-up">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #4f46e5, #14b8a6)' }}>
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="px-4 py-3 rounded-2xl rounded-tl-sm"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="flex gap-1.5 items-center h-4">
                                {[0, 1, 2].map(i => (
                                    <span key={i} className="w-2 h-2 rounded-full"
                                        style={{ background: '#6366f1', animationDelay: `${i * 0.15}s`, animation: 'pulse 1.2s ease-in-out infinite' }} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* ── Quick prompts ── */}
            {messages.length <= 2 && (
                <div className="px-6 py-3 flex gap-2 flex-wrap flex-shrink-0"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {QUICK_PROMPTS.map(p => (
                        <button key={p} onClick={() => sendMessage(p)}
                            className="text-xs px-3 py-2 rounded-xl transition-all font-medium"
                            style={{
                                background: 'rgba(99,102,241,0.08)',
                                border: '1px solid rgba(99,102,241,0.18)',
                                color: '#a5b4fc',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.18)'; e.currentTarget.style.color = '#fff' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.color = '#a5b4fc' }}>
                            {p}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Input bar ── */}
            <div className="px-6 py-4 flex-shrink-0"
                style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(3,7,15,0.5)' }}>
                <div className="flex gap-3 items-end">
                    {/* Textarea */}
                    <div className="flex-1 relative">
                        <textarea
                            ref={textareaRef}
                            rows={1}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
                            placeholder={lang === 'hi-IN' ? 'दवाई के बारे में पूछें...' : 'Ask about a medicine, availability, or orders…'}
                            className="input resize-none"
                            style={{ minHeight: '48px', maxHeight: '120px', paddingRight: '1rem', lineHeight: '1.5' }}
                        />
                    </div>

                    {/* Mic */}
                    <button onClick={() => listening ? stop() : start(lang)}
                        className="w-12 h-12 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
                        style={listening
                            ? { background: 'linear-gradient(135deg, #be123c, #f43f5e)', boxShadow: '0 0 20px rgba(244,63,94,0.4)' }
                            : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
                        title={listening ? 'Stop recording' : 'Start voice input'}>
                        {listening
                            ? <MicOff className="w-5 h-5 text-white" />
                            : <Mic className="w-5 h-5 text-slate-500" />}
                    </button>

                    {/* Send */}
                    <button onClick={() => sendMessage(input)}
                        disabled={!input.trim() || loading}
                        className="btn btn-primary w-12 h-12 rounded-xl p-0 flex-shrink-0 flex items-center justify-center">
                        {loading ? <Loader2 className="w-5 h-5 anim-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                </div>

                {/* Listening indicator */}
                {listening && (
                    <div className="flex items-center gap-2 mt-2.5 text-xs" style={{ color: '#f43f5e' }}>
                        <span className="w-2 h-2 rounded-full anim-pulse" style={{ background: '#f43f5e' }} />
                        Listening… ({lang === 'hi-IN' ? 'हिंदी' : 'English'}) — speak now
                    </div>
                )}

                {/* Langfuse trace indicator */}
                <div className="flex items-center gap-1.5 mt-2 text-[10px]" style={{ color: '#334155' }}>
                    <Zap className="w-3 h-3 text-indigo-600" />
                    Powered by Gemini · Traced by Langfuse
                </div>
            </div>
        </div>
    )
}
