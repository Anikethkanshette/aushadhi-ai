import React, { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { Mic, MicOff, Send, Bot, User, Loader2, Volume2, VolumeX, Upload, X } from 'lucide-react'

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

    const stop = () => {
        recognitionRef.current?.stop()
        setListening(false)
    }

    return { listening, start, stop }
}

function speak(text, lang = 'en-IN') {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = lang
    utter.rate = 0.95
    window.speechSynthesis.speak(utter)
}

function ChatBubble({ msg }) {
    const isBot = msg.role === 'assistant'
    return (
        <div className={`flex gap-3 animate-slide-up ${isBot ? '' : 'flex-row-reverse'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold ${isBot ? 'bg-gradient-to-br from-indigo-500 to-emerald-500' : 'bg-gradient-to-br from-purple-500 to-pink-500'
                }`}>
                {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${isBot
                ? 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-sm'
                : 'bg-indigo-600 text-white rounded-tr-sm'
                }`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.medicines?.length > 0 && (
                    <div className="mt-3 space-y-2">
                        {msg.medicines.map(m => (
                            <div key={m.id} className="flex items-center justify-between bg-white/10 rounded-xl px-3 py-2">
                                <div>
                                    <p className="text-xs font-semibold">{m.name}</p>
                                    <p className="text-[10px] text-slate-300">₹{m.price}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className={m.available ? 'badge badge-green text-[9px]' : 'badge badge-red text-[9px]'}>
                                        {m.available ? '✓ In Stock' : 'Out of Stock'}
                                    </span>
                                    {m.prescription_required && (
                                        <span className="badge badge-yellow text-[9px]">Rx Required</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {msg.welfare_eligible && (
                    <div className="mt-2 text-[11px] text-emerald-400 bg-emerald-500/10 rounded-lg px-2 py-1.5">
                        🎉 PMJAY eligible – 20% discount applied
                    </div>
                )}
                <p className="text-[10px] text-slate-500 mt-1.5">{msg.time}</p>
            </div>
        </div>
    )
}

export default function ChatPage({ patient, apiBase }) {
    const [messages, setMessages] = useState([{
        role: 'assistant',
        content: `Hello ${patient.name?.split(' ')[0]}! 👋 I'm your AI Pharmacist. You can ask me about medicines, check availability, verify prescription requirements, or place orders. You can also speak to me using the microphone!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [lang, setLang] = useState('en-IN')
    const [ttsEnabled, setTtsEnabled] = useState(true)
    const [hasPrescription, setHasPrescription] = useState(false)
    const [prescriptionFile, setPrescriptionFile] = useState(null)
    const bottomRef = useRef(null)
    const fileRef = useRef(null)

    const addMsg = (role, content, extra = {}) => {
        setMessages(prev => [...prev, {
            role, content, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), ...extra,
        }])
    }

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

    const sendMessage = async (text) => {
        if (!text.trim()) return
        addMsg('user', text)
        setInput('')
        setLoading(true)
        try {
            const res = await axios.post(`${apiBase}/agent/chat`, {
                message: text,
                patient_id: patient.patient_id,
                abha_id: patient.abha_id,
                language: lang,
                has_prescription: hasPrescription,
            })
            const data = res.data
            addMsg('assistant', data.response, {
                medicines: data.medicines_found,
                welfare_eligible: data.welfare_eligible,
            })
            if (ttsEnabled) speak(data.response.replace(/[*#\[\]]/g, '').slice(0, 300), lang)
        } catch (err) {
            // Fallback when backend offline
            const fallback = getFallbackResponse(text)
            addMsg('assistant', fallback)
            if (ttsEnabled) speak(fallback.slice(0, 200), lang)
        } finally {
            setLoading(false)
        }
    }

    const getFallbackResponse = (text) => {
        const t = text.toLowerCase()
        if (t.includes('paracetamol') || t.includes('dolo')) return '💊 Paracetamol 500mg – ₹25 | In Stock (500 units) | OTC – No prescription needed.'
        if (t.includes('amoxicillin')) return '⚕️ Amoxicillin 500mg requires a valid prescription (Schedule H drug). Please upload your prescription.'
        if (t.includes('metformin')) return '💊 Metformin 500mg – ₹30 | In Stock | Prescription Required. Are you diabetic? Would you like your refill history?'
        return '👋 Hello! I\'m your AI Pharmacist (offline mode). Type a medicine name to check availability, price, and prescription requirements.'
    }

    const { listening, start, stop } = useSpeechRecognition((text) => {
        setInput(text)
        sendMessage(text)
    })

    const handlePrescriptionUpload = async (e) => {
        const file = e.target.files[0]
        if (file) {
            setPrescriptionFile(file)
            setHasPrescription(true)

            addMsg('user', `📄 Uploaded Prescription: ${file.name}`)
            setLoading(true)

            try {
                const formData = new FormData()
                formData.append('image', file)

                const res = await axios.post(`${apiBase}/agent/scan-prescription`, formData)
                const data = res.data

                const medPayload = data.medicines.map(m => {
                    if (m.matched_medicine) {
                        return {
                            ...m.matched_medicine,
                            available: m.available
                        }
                    }
                    return null
                }).filter(Boolean)

                addMsg('assistant', `✅ I've read your prescription. ${data.message} I found these matches in our inventory:`, {
                    medicines: medPayload
                })

                if (ttsEnabled) speak("I have scanned your prescription. Here are the matching medicines.", lang)

            } catch (err) {
                addMsg('assistant', "⚠️ I couldn't process the prescription image. Please try a clearer photo.")
            } finally {
                setLoading(false)
            }
        }
    }

    const quickPrompts = [
        'I need Paracetamol 500mg',
        'Check Metformin availability',
        'What are alternatives to Atorvastatin?',
        'Show my order history',
    ]

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
                <div>
                    <h2 className="text-lg font-semibold text-white">AI Pharmacist</h2>
                    <p className="text-xs text-slate-400">Ask about medicines, availability, or orders</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Language toggle */}
                    <select
                        id="lang-select"
                        value={lang}
                        onChange={e => setLang(e.target.value)}
                        className="text-xs bg-white/5 border border-white/20 rounded-lg px-2 py-1.5 text-slate-300"
                    >
                        <option value="en-IN">English</option>
                        <option value="hi-IN">हिंदी</option>
                    </select>
                    {/* TTS toggle */}
                    <button
                        id="tts-toggle"
                        onClick={() => setTtsEnabled(t => !t)}
                        className={`p-2 rounded-lg transition-colors ${ttsEnabled ? 'text-indigo-400 bg-indigo-500/20' : 'text-slate-500 hover:bg-white/10'}`}
                        title={ttsEnabled ? 'Voice on' : 'Voice off'}
                    >
                        {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>
                    {/* Prescription upload */}
                    <input type="file" ref={fileRef} onChange={handlePrescriptionUpload} accept="image/*,.pdf" className="hidden" />
                    <button
                        id="upload-rx-btn"
                        onClick={() => fileRef.current?.click()}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${hasPrescription ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-white/20 text-slate-400 hover:bg-white/10'
                            }`}
                    >
                        <Upload className="w-3.5 h-3.5" />
                        {hasPrescription ? 'Rx ✓' : 'Upload Rx'}
                    </button>
                    {prescriptionFile && (
                        <button onClick={() => { setPrescriptionFile(null); setHasPrescription(false) }} className="text-slate-500 hover:text-red-400">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {messages.map((msg, i) => <ChatBubble key={i} msg={msg} />)}
                {loading && (
                    <div className="flex gap-3 animate-slide-up">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
                            <div className="flex gap-1.5 items-center h-4">
                                {[0, 1, 2].map(i => (
                                    <span key={i} className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Quick prompts */}
            {messages.length <= 2 && (
                <div className="px-6 py-2 flex gap-2 flex-wrap flex-shrink-0">
                    {quickPrompts.map(p => (
                        <button
                            key={p}
                            onClick={() => sendMessage(p)}
                            className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-indigo-500/40 transition-all"
                        >
                            {p}
                        </button>
                    ))}
                </div>
            )}

            {/* Input */}
            <div className="px-6 py-4 border-t border-border flex-shrink-0">
                <div className="flex gap-3 items-end">
                    <div className="flex-1 relative">
                        <textarea
                            id="chat-input"
                            rows={1}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
                            placeholder={lang === 'hi-IN' ? 'दवाई के बारे में पूछें...' : 'Ask about a medicine, availability, or your orders...'}
                            className="input-field resize-none pr-4"
                            style={{ minHeight: '48px', maxHeight: '120px' }}
                        />
                    </div>
                    <button
                        id="mic-btn"
                        onClick={() => listening ? stop() : start(lang)}
                        className={`p-3 rounded-xl transition-all ${listening
                            ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/40 animate-pulse-slow'
                            : 'bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white'
                            }`}
                        title={listening ? 'Stop recording' : 'Start voice input'}
                    >
                        {listening ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5" />}
                    </button>
                    <button
                        id="send-btn"
                        onClick={() => sendMessage(input)}
                        disabled={!input.trim() || loading}
                        className="btn-primary p-3 rounded-xl"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                </div>
                {listening && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-red-400">
                        <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                        Listening... ({lang === 'hi-IN' ? 'हिंदी' : 'English'})
                    </div>
                )}
            </div>
        </div>
    )
}
