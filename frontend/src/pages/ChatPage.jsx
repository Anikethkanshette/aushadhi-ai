import React, { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { Mic, MicOff, Send, Bot, User, Loader2, Volume2, VolumeX, Upload, X, Sparkles, Zap } from 'lucide-react'
import { API_CONFIG, API_ENDPOINTS } from '../config'
import { useAppContext } from '../context/AppContext'

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

function pickNaturalLadyVoice(lang = 'en-IN') {
    if (!window.speechSynthesis) return null
    const voices = window.speechSynthesis.getVoices() || []
    if (!voices.length) return null

    const femalePreferredNames = [
        'heera', 'priya', 'neerja', 'veena', 'asha', 'natasha',
        'samantha', 'aria', 'jenny', 'zira', 'female', 'woman', 'lady',
    ]

    const isIndianEnglish = (v) => {
        const langCode = (v.lang || '').toLowerCase()
        return langCode === 'en-in' || langCode.startsWith('en-in')
    }

    const isFemaleLike = (v) => {
        const name = (v.name || '').toLowerCase()
        return femalePreferredNames.some(n => name.includes(n))
    }

    const exactIndianFemale = voices.find(v => isIndianEnglish(v) && isFemaleLike(v))
    if (exactIndianFemale) return exactIndianFemale

    const anyIndianEnglish = voices.find(v => isIndianEnglish(v))
    if (anyIndianEnglish) return anyIndianEnglish

    const localeFamilyFemale = voices.find(v => {
        const langCode = (v.lang || '').toLowerCase()
        return langCode.startsWith('en') && isFemaleLike(v)
    })
    if (localeFamilyFemale) return localeFamilyFemale

    const localeMatch = voices.find(v => (v.lang || '').toLowerCase().startsWith((lang || 'en-IN').toLowerCase().slice(0, 2)))

    return localeMatch || voices[0]
}

function speak(text, lang = 'en-IN') {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = lang
    utter.rate = 0.9
    utter.pitch = 1.02

    const selectedVoice = pickNaturalLadyVoice(lang)
    if (selectedVoice) {
        utter.voice = selectedVoice
        utter.lang = selectedVoice.lang || lang
    }

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

                    {msg.order_summary && (
                        <div className="mt-2 p-2.5 rounded-xl"
                            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.26)' }}>
                            <p className="text-[11px] font-semibold text-indigo-200">Order Summary</p>
                            <p className="text-[11px] opacity-90">Medicine: {msg.order_summary.medicine_name}</p>
                            <p className="text-[11px] opacity-90">Quantity: {msg.order_summary.quantity}</p>
                            <p className="text-[11px] opacity-90">Payment: {msg.order_summary.payment_label}</p>
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
    { id: 'cancel', label: 'Cancel Order', message: 'Show my latest order and help me cancel it.' },
    { id: 'refill', label: 'Auto Refill', message: 'Enable auto refill for my regular medicine with WhatsApp confirmation.' },
    { id: 'notif', label: 'Notifications', message: 'Show unread notifications and mark them as read.' },
]

export default function ChatPage() {
    const { patient } = useAppContext()
    const apiBase = API_CONFIG.BASE_URL
    const [messages, setMessages] = useState([{
        role: 'assistant',
        content: `Hello ${patient?.name?.split(' ')[0] || 'there'}! 👋 I'm your AI Pharmacist powered by Gemini. Ask me about medicines, check availability, verify prescriptions, or track orders. You can also speak using the mic!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [guidedFlow, setGuidedFlow] = useState({ type: 'idle', stage: 'idle', medicine: null, quantity: 1, paymentMethod: '', orderId: '', subscriptionId: '' })
    const [lang, setLang] = useState('en-IN')
    const [ttsEnabled, setTts] = useState(true)
    const [hasPrescription, setHasRx] = useState(false)
    const [prescriptionFile, setRxFile] = useState(null)
    const [rxPatientWarning, setRxPatientWarning] = useState('')
    const bottomRef = useRef(null)
    const fileRef = useRef(null)
    const textareaRef = useRef(null)

    const addMsg = (role, content, extra = {}) =>
        setMessages(prev => [...prev, { role, content, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), ...extra }])

    useEffect(() => {
        const raw = sessionStorage.getItem('aushadhi_chat_handoff')
        if (!raw) return
        sessionStorage.removeItem('aushadhi_chat_handoff')
        try {
            const data = JSON.parse(raw)
            const meds = Array.isArray(data?.medicines) ? data.medicines : []
            if (meds.length === 0) return
            const safeMeds = normalizeMedicinesForPatient(meds)
            const first = safeMeds[0]
            addMsg('assistant', data?.prompt || 'I found these medicines from your prescription. Do you want to order these?', { medicines: safeMeds })
            if (first) {
                setGuidedFlow({ type: 'order', stage: 'awaiting_decision', medicine: first, quantity: 1, paymentMethod: '', orderId: '', subscriptionId: '' })
                addMsg('assistant', `Do you want to order ${first.name}? Reply yes or no.`)
            }
        } catch {
        }
    }, [])

    const normalizeMedicinesForPatient = (items = []) => {
        return (Array.isArray(items) ? items : []).map(item => ({
            id: item?.id,
            name: item?.name,
            price: item?.price,
            generic_name: item?.generic_name,
            prescription_required: !!item?.prescription_required,
            available: typeof item?.available === 'boolean'
                ? item.available
                : Number(item?.stock_quantity || item?.quantity_available || 0) > 0,
        }))
    }

    const formatCancelWindowMessage = (text) => {
        const raw = String(text || '')
        const lowered = raw.toLowerCase()
        if (lowered.includes('only be cancelled within 1 hour') || lowered.includes('within 1 hour of placement')) {
            return 'This order can only be cancelled within 1 hour of placing it.'
        }
        return raw
    }

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

    // Auto-resize textarea
    useEffect(() => {
        const ta = textareaRef.current
        if (!ta) return
        ta.style.height = 'auto'
        ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
    }, [input])

    const isLikelyMedicineNameInput = (text) => {
        const value = (text || '').trim().toLowerCase()
        if (!value) return false
        const actionWords = [
            'order', 'buy', 'purchase', 'history', 'cancel', 'status', 'notification',
            'auto refill', 'refill', 'help', 'track', 'scan', 'prescription', 'quantity',
            'price', 'available', 'stock', 'alternative', 'substitute'
        ]
        if (actionWords.some(w => value.includes(w))) return false
        const tokenCount = value.split(/\s+/).length
        return tokenCount <= 4
    }

    const callAgent = async (text) => {
        const recentContext = messages
            .slice(-6)
            .map(m => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${String(m.content || '').slice(0, 180)}`)
            .join('\n')

        const flowHint = guidedFlow.type !== 'idle'
            ? `\n\nCurrent flow: ${guidedFlow.type} (${guidedFlow.stage})`
            : ''

        const enrichedMessage = recentContext
            ? `Conversation context:\n${recentContext}\n\nLatest user request: ${text}${flowHint}`
            : text

        const res = await axios.post(`${apiBase}${API_ENDPOINTS.AGENT_CHAT}`, {
            message: enrichedMessage,
            patient_id: patient?.patient_id,
            patient_name: patient?.name,
            abha_id: patient?.abha_id,
            language: lang,
            has_prescription: hasPrescription,
        })
        return res.data
    }

    const parseYesNo = (text) => {
        const normalized = (text || '').trim().toLowerCase()
        const yes = ['yes', 'y', 'haan', 'ha', 'ok', 'okay', 'sure']
        const no = ['no', 'n', 'nah', 'not now']
        if (yes.some(v => normalized === v || normalized.startsWith(v + ' '))) return 'yes'
        if (no.some(v => normalized === v || normalized.startsWith(v + ' '))) return 'no'
        return null
    }

    const parsePaymentMethod = (text) => {
        const normalized = (text || '').trim().toLowerCase()
        if (!normalized) return null
        if (normalized.includes('upi')) return { key: 'UPI', label: 'UPI' }
        if (normalized.includes('card') || normalized.includes('credit') || normalized.includes('debit')) return { key: 'CREDIT_CARD', label: 'Card' }
        if (normalized.includes('cash') || normalized.includes('cod') || normalized.includes('delivery')) return { key: 'COD', label: 'Cash on Delivery' }
        return null
    }

    const lookupMedicinesSafely = async (queryText) => {
        const res = await axios.get(`${apiBase}${API_ENDPOINTS.MEDICINES_LIST}`, {
            params: { search: queryText },
        })
        return res?.data?.data?.medicines || []
    }

    const detectGuidedIntent = (text) => {
        const t = (text || '').toLowerCase()
        if (t.includes('order history') || t.includes('my orders') || t.includes('recent orders') || t.includes('past orders')) {
            return { type: 'history', prompt: 'Do you want me to show your order history now? Reply yes or no.' }
        }
        if (t.includes('notification')) {
            return { type: 'notifications', prompt: 'Do you want me to show your notifications now? Reply yes or no.' }
        }
        if (t.includes('order status') || t.includes('track order')) {
            return { type: 'order_status', prompt: 'Do you want to check an order status now? Reply yes or no.' }
        }
        if (t.includes('cancel order')) {
            return { type: 'cancel_order', prompt: 'Do you want to cancel an order now? Reply yes or no.' }
        }
        if (t.includes('show auto refill') || t.includes('list auto refill')) {
            return { type: 'auto_refill_list', prompt: 'Do you want me to show your active auto-refill plans now? Reply yes or no.' }
        }
        if (t.includes('cancel auto refill') || t.includes('stop auto refill') || t.includes('disable auto refill')) {
            return { type: 'auto_refill_cancel', prompt: 'Do you want to cancel an auto-refill plan now? Reply yes or no.' }
        }
        return null
    }

    const sendMessage = async (text) => {
        const trimmed = (text || '').trim()
        if (!trimmed) return
        addMsg('user', trimmed)
        setInput('')

        if (guidedFlow.type === 'order' && guidedFlow.stage === 'awaiting_decision') {
            const answer = parseYesNo(trimmed)
            if (answer === 'yes') {
                setGuidedFlow(prev => ({ ...prev, stage: 'awaiting_quantity' }))
                addMsg('assistant', `Great. How many units of ${guidedFlow.medicine?.name || 'this medicine'} would you like? Please enter a number.`)
                return
            }
            if (answer === 'no') {
                setGuidedFlow({ type: 'idle', stage: 'idle', medicine: null, quantity: 1, paymentMethod: '', orderId: '', subscriptionId: '' })
                addMsg('assistant', 'No problem. You can ask for any other medicine anytime.')
                return
            }
            addMsg('assistant', 'Please reply with yes or no so I can continue.')
            return
        }

        if (guidedFlow.type === 'order' && guidedFlow.stage === 'awaiting_quantity') {
            const qty = parseInt(trimmed, 10)
            if (Number.isNaN(qty) || qty < 1 || qty > 1000) {
                addMsg('assistant', 'Please enter a valid quantity between 1 and 1000.')
                return
            }

            setGuidedFlow(prev => ({ ...prev, stage: 'awaiting_payment_method', quantity: qty }))
            addMsg('assistant', 'Choose your mock payment method: UPI, Card, or Cash on Delivery (COD).')
            return
        }

        if (guidedFlow.type === 'order' && guidedFlow.stage === 'awaiting_payment_method') {
            const payment = parsePaymentMethod(trimmed)
            if (!payment) {
                addMsg('assistant', 'Please choose one payment method: UPI, Card, or Cash on Delivery (COD).')
                return
            }

            const medName = guidedFlow.medicine?.name || 'this medicine'
            const qty = guidedFlow.quantity || 1
            setGuidedFlow(prev => ({ ...prev, stage: 'awaiting_final_confirmation', paymentMethod: payment.key }))
            addMsg('assistant', 'Please review and confirm your order. Reply yes or no.', {
                order_summary: {
                    medicine_name: medName,
                    quantity: qty,
                    payment_label: payment.label,
                },
            })
            return
        }

        if (guidedFlow.type === 'order' && guidedFlow.stage === 'awaiting_final_confirmation') {
            const answer = parseYesNo(trimmed)
            if (answer === 'no') {
                setGuidedFlow({ type: 'idle', stage: 'idle', medicine: null, quantity: 1, paymentMethod: '', orderId: '', subscriptionId: '' })
                addMsg('assistant', 'Order cancelled. I can help you with another medicine anytime.')
                return
            }
            if (answer !== 'yes') {
                addMsg('assistant', 'Please reply with yes or no to confirm the order.')
                return
            }

            setLoading(true)
            try {
                const medicineName = guidedFlow.medicine?.name || 'this medicine'
                const qty = guidedFlow.quantity || 1
                const paymentMethod = guidedFlow.paymentMethod || 'UPI'

                let paymentSummary = ''
                if (paymentMethod === 'COD') {
                    paymentSummary = 'Mock payment selected: Cash on Delivery. Payment will be collected at delivery.'
                } else {
                    const paymentRes = await axios.post(`${apiBase}${API_ENDPOINTS.AGENT_EXECUTE}`, {
                        agent: 'payment',
                        action: 'process',
                        payload: {
                            amount: Math.max(1, qty * Number(guidedFlow.medicine?.price || 1)),
                            method: paymentMethod,
                        },
                        patient_id: patient?.patient_id,
                        patient_name: patient?.name,
                        abha_id: patient?.abha_id,
                    })
                    const paymentData = paymentRes?.data?.result?.data || {}
                    paymentSummary = `Mock payment successful via ${paymentMethod.replace('_', ' ')}. Transaction: ${paymentData.transaction_id || 'N/A'}.`
                }

                const orderInstruction = `Place an order for ${medicineName}, quantity ${qty}. Payment mode already selected: ${paymentMethod}. Confirm order details and share order id.`
                const data = await callAgent(orderInstruction)
                addMsg('assistant', paymentSummary)
                addMsg('assistant', data.response, { medicines: normalizeMedicinesForPatient(data.medicines_found), welfare_eligible: data.welfare_eligible })
                if (ttsEnabled) speak((data.response || '').replace(/[*#\[\]]/g, '').slice(0, 300), lang)
            } catch {
                const fallback = 'I could not place the order right now. Please try again in a moment.'
                addMsg('assistant', fallback)
                if (ttsEnabled) speak(fallback.slice(0, 200), lang)
            } finally {
                setGuidedFlow({ type: 'idle', stage: 'idle', medicine: null, quantity: 1, paymentMethod: '', orderId: '', subscriptionId: '' })
                setLoading(false)
            }
            return
        }

        if (guidedFlow.type !== 'idle') {
            const answer = parseYesNo(trimmed)

            if (guidedFlow.stage === 'awaiting_decision') {
                if (answer === 'no') {
                    setGuidedFlow({ type: 'idle', stage: 'idle', medicine: null, quantity: 1, paymentMethod: '', orderId: '', subscriptionId: '' })
                    addMsg('assistant', 'Okay, cancelled. Ask me anything else anytime.')
                    return
                }
                if (answer !== 'yes') {
                    addMsg('assistant', 'Please reply with yes or no.')
                    return
                }

                if (guidedFlow.type === 'history') {
                    setLoading(true)
                    try {
                        const data = await callAgent('Show my recent order history summary.')
                        addMsg('assistant', data.response, { medicines: data.medicines_found, welfare_eligible: data.welfare_eligible })
                    } catch {
                        addMsg('assistant', 'I could not fetch order history right now. Please try again.')
                    } finally {
                        setGuidedFlow({ type: 'idle', stage: 'idle', medicine: null, quantity: 1, paymentMethod: '', orderId: '', subscriptionId: '' })
                        setLoading(false)
                    }
                    return
                }

                if (guidedFlow.type === 'notifications') {
                    setLoading(true)
                    try {
                        const data = await callAgent('Show unread notifications and mark all as read.')
                        addMsg('assistant', data.response, { medicines: data.medicines_found, welfare_eligible: data.welfare_eligible })
                    } catch {
                        addMsg('assistant', 'I could not fetch notifications right now. Please try again.')
                    } finally {
                        setGuidedFlow({ type: 'idle', stage: 'idle', medicine: null, quantity: 1, paymentMethod: '', orderId: '', subscriptionId: '' })
                        setLoading(false)
                    }
                    return
                }

                if (guidedFlow.type === 'order_status') {
                    setGuidedFlow(prev => ({ ...prev, stage: 'awaiting_order_id' }))
                    addMsg('assistant', 'Please enter your order ID (for example: ORDABC123).')
                    return
                }

                if (guidedFlow.type === 'cancel_order') {
                    setGuidedFlow(prev => ({ ...prev, stage: 'awaiting_order_id' }))
                    addMsg('assistant', 'Please enter the order ID you want to cancel (for example: ORDABC123).')
                    return
                }

                if (guidedFlow.type === 'auto_refill_list') {
                    setLoading(true)
                    try {
                        const data = await callAgent('Show my active auto refill subscriptions.')
                        addMsg('assistant', data.response, { medicines: data.medicines_found, welfare_eligible: data.welfare_eligible })
                    } catch {
                        addMsg('assistant', 'I could not fetch auto-refill plans right now. Please try again.')
                    } finally {
                        setGuidedFlow({ type: 'idle', stage: 'idle', medicine: null, quantity: 1, paymentMethod: '', orderId: '', subscriptionId: '' })
                        setLoading(false)
                    }
                    return
                }

                if (guidedFlow.type === 'auto_refill_cancel') {
                    setGuidedFlow(prev => ({ ...prev, stage: 'awaiting_subscription_id' }))
                    addMsg('assistant', 'Please enter your auto-refill subscription ID (for example: AR-AB12CD34).')
                    return
                }
            }

            if (guidedFlow.stage === 'awaiting_order_id') {
                const enteredOrderId = trimmed.toUpperCase()
                setLoading(true)
                try {
                    const prompt = guidedFlow.type === 'cancel_order'
                        ? `Cancel order ${enteredOrderId} for my account.`
                        : `Check order status for ${enteredOrderId}.`
                    const data = await callAgent(prompt)
                    const responseText = guidedFlow.type === 'cancel_order'
                        ? formatCancelWindowMessage(data.response)
                        : data.response
                    addMsg('assistant', responseText, { medicines: data.medicines_found, welfare_eligible: data.welfare_eligible })
                } catch {
                    addMsg('assistant', 'I could not process this order ID right now. Please try again.')
                } finally {
                    setGuidedFlow({ type: 'idle', stage: 'idle', medicine: null, quantity: 1, paymentMethod: '', orderId: '', subscriptionId: '' })
                    setLoading(false)
                }
                return
            }

            if (guidedFlow.stage === 'awaiting_subscription_id') {
                const enteredSubId = trimmed.toUpperCase()
                setLoading(true)
                try {
                    const data = await callAgent(`Cancel auto refill subscription ${enteredSubId}.`)
                    addMsg('assistant', data.response, { medicines: data.medicines_found, welfare_eligible: data.welfare_eligible })
                } catch {
                    addMsg('assistant', 'I could not cancel that auto-refill plan right now. Please try again.')
                } finally {
                    setGuidedFlow({ type: 'idle', stage: 'idle', medicine: null, quantity: 1, paymentMethod: '', orderId: '', subscriptionId: '' })
                    setLoading(false)
                }
                return
            }
        }

        const guidedIntent = detectGuidedIntent(trimmed)
        if (guidedIntent) {
            setGuidedFlow({ type: guidedIntent.type, stage: 'awaiting_decision', medicine: null, orderId: '', subscriptionId: '' })
            addMsg('assistant', guidedIntent.prompt)
            return
        }

        if (isLikelyMedicineNameInput(trimmed)) {
            setLoading(true)
            try {
                const medicines = await lookupMedicinesSafely(trimmed)
                if (Array.isArray(medicines) && medicines.length > 0) {
                    const top = medicines[0]
                    addMsg('assistant', `I found ${medicines.length} option(s) for "${trimmed}". Do you want to order ${top?.name}? Reply yes or no.`, {
                        medicines: normalizeMedicinesForPatient(medicines.slice(0, 5)),
                        welfare_eligible: false,
                    })
                    setGuidedFlow({ type: 'order', stage: 'awaiting_decision', medicine: top, quantity: 1, paymentMethod: '', orderId: '', subscriptionId: '' })
                    setLoading(false)
                    return
                }
            } catch {
            } finally {
                setLoading(false)
            }
        }

        setLoading(true)
        try {
            const data = await callAgent(trimmed)
            addMsg('assistant', data.response, { medicines: normalizeMedicinesForPatient(data.medicines_found), welfare_eligible: data.welfare_eligible })
            if (ttsEnabled) speak(data.response.replace(/[*#\[\]]/g, '').slice(0, 300), lang)

            if (Array.isArray(data?.medicines_found) && data.medicines_found.length > 0 && isLikelyMedicineNameInput(trimmed)) {
                const firstMedicine = data.medicines_found[0]
                setGuidedFlow({ type: 'order', stage: 'awaiting_decision', medicine: firstMedicine, quantity: 1, paymentMethod: '', orderId: '', subscriptionId: '' })
                addMsg('assistant', `Do you want to order ${firstMedicine?.name}? Reply yes or no.`)
            }
        } catch {
            const fallback = getFallback(trimmed)
            addMsg('assistant', fallback)
            if (ttsEnabled) speak(fallback.slice(0, 200), lang)
        } finally { setLoading(false) }
    }

    const getFallback = (text) => {
        const t = text.toLowerCase()
        if (t.includes('paracetamol') || t.includes('dolo')) return '💊 Paracetamol 500mg – ₹25 | In Stock | OTC – No prescription needed.'
        if (t.includes('amoxicillin')) return '⚕️ Amoxicillin 500mg requires a valid prescription (Schedule H). Please upload your prescription.'
        if (t.includes('metformin')) return '💊 Metformin 500mg – ₹30 | In Stock | Prescription Required. Would you like your refill history?'
        return '👋 I\'m your AI Pharmacist (offline mode). Type a medicine name to check availability, price, and prescription status.'
    }

    const { listening, start, stop } = useSpeechRecognition((text) => { setInput(text); sendMessage(text) })

    const handleRxUpload = async (e) => {
        const file = e.target.files[0]; if (!file) return
        setRxFile(file); setHasRx(true)
        setRxPatientWarning('')
        addMsg('user', `📄 Uploaded Prescription: ${file.name}`)
        setLoading(true)
        try {
            const fd = new FormData(); fd.append('image', file)
            fd.append('patient_name', patient?.name || '')
            fd.append('abha_id', patient?.abha_id || '')
            const res = await axios.post(`${apiBase}${API_ENDPOINTS.AGENT_SCAN}`, fd)
            const data = res.data
            const scanned = Array.isArray(data?.medicines) ? data.medicines : []
            const meds = normalizeMedicinesForPatient(
                scanned
                    .map(m => (m?.matched_medicine ? { ...m.matched_medicine, available: m.available } : null))
                    .filter(Boolean)
            )
            const unavailable = scanned.filter(item => !item?.available)

            const scanTimeText = data?.scan_duration_ms
                ? ` (in ${(Number(data.scan_duration_ms) / 1000).toFixed(1)}s)`
                : ''

            addMsg('assistant', `✅ Prescription scanned${scanTimeText}. I found these medicines in inventory:`, { medicines: meds })

            if (unavailable.length > 0) {
                const unavailableText = unavailable
                    .map(item => `• ${item?.extracted_name}${item?.dosage ? ` (${item.dosage})` : ''}`)
                    .join('\n')
                const eta = data?.short_availability_eta || 'soon'
                addMsg('assistant', `⏳ Not currently available:\n${unavailableText}\n\nWe can arrange these in a short time (about ${eta}).`)
            }

            if (data?.patient_name_warning) {
                setRxPatientWarning(data.patient_name_warning)
                addMsg('assistant', `⚠️ ${data.patient_name_warning}`)
            }

            if (meds.length === 0 && unavailable.length === 0) {
                addMsg('assistant', 'I scanned the prescription, but could not identify medicines clearly. Please upload a clearer image.')
            }

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

            {rxPatientWarning && (
                <div className="px-6 py-2 text-xs text-amber-300 border-b border-amber-500/20 bg-amber-500/10">
                    ⚠️ {rxPatientWarning}
                </div>
            )}

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

                {(guidedFlow.stage === 'awaiting_decision' || guidedFlow.stage === 'awaiting_final_confirmation') && (
                    <>
                        <button
                            onClick={() => sendMessage('yes')}
                            className="text-xs px-3 py-1.5 rounded-xl transition-all font-semibold"
                            style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.22)', color: '#86efac' }}
                        >
                            Yes
                        </button>
                        <button
                            onClick={() => sendMessage('no')}
                            className="text-xs px-3 py-1.5 rounded-xl transition-all font-semibold"
                            style={{ background: 'rgba(244,63,94,0.10)', border: '1px solid rgba(244,63,94,0.22)', color: '#fda4af' }}
                        >
                            No
                        </button>
                    </>
                )}

                {guidedFlow.type === 'order' && guidedFlow.stage === 'awaiting_quantity' && [1, 2, 3, 5].map(q => (
                    <button
                        key={`qty-${q}`}
                        onClick={() => sendMessage(String(q))}
                        className="text-xs px-3 py-1.5 rounded-xl transition-all font-semibold"
                        style={{ background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.22)', color: '#c7d2fe' }}
                    >
                        Qty {q}
                    </button>
                ))}

                {guidedFlow.type === 'order' && guidedFlow.stage === 'awaiting_payment_method' && ['UPI', 'Card', 'Cash on Delivery'].map(method => (
                    <button
                        key={`pay-${method}`}
                        onClick={() => sendMessage(method)}
                        className="text-xs px-3 py-1.5 rounded-xl transition-all font-semibold"
                        style={{ background: 'rgba(20,184,166,0.10)', border: '1px solid rgba(20,184,166,0.22)', color: '#99f6e4' }}
                    >
                        {method}
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
