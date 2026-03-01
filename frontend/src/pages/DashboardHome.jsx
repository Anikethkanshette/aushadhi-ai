import React, { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { API_CONFIG, API_ENDPOINTS } from '../config'
import { useAppContext } from '../context/AppContext'
import {
    Heart, Activity, Pill, ShoppingBag, AlertCircle, TrendingUp,
    Sparkles, ChevronRight, DropletIcon, Zap, Thermometer, Shield, Package, Loader2, Upload
} from 'lucide-react'

const SPARKLINE_H = [30, 45, 35, 60, 50, 70, 55, 80, 65, 90, 75, 100]

function Sparkline({ data = SPARKLINE_H, color = '#6366f1' }) {
    const max = Math.max(...data, 1)
    const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - (v / max) * 100}`).join(' ')
    return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-10">
            <polyline points={pts} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
    )
}

export default function DashboardHome() {
    const { patient } = useAppContext()
    const navigate = useNavigate()
    const [orders, setOrders] = useState([])
    const [medicines, setMedicines] = useState([])
    const [alerts, setAlerts] = useState([])
    const [loadingMeds, setLoadingMeds] = useState(true)
    const [refillProcessing, setRefillProcessing] = useState({})
    const [refillStatus, setRefillStatus] = useState({})
    const [selectedRefillMedicine, setSelectedRefillMedicine] = useState('')
    const [autoRefillPlans, setAutoRefillPlans] = useState([])
    const [rxScanLoading, setRxScanLoading] = useState(false)
    const [rxScanError, setRxScanError] = useState('')
    const [rxScanSummary, setRxScanSummary] = useState('')
    const [rxScanMatches, setRxScanMatches] = useState([])
    const [rxScanUnavailable, setRxScanUnavailable] = useState([])
    const [rxScanEta, setRxScanEta] = useState('')
    const [rxPatientWarning, setRxPatientWarning] = useState('')
    const [notifyDone, setNotifyDone] = useState([])
    const [notifyLoading, setNotifyLoading] = useState('')
    const [activePrescriptions, setActivePrescriptions] = useState([])
    const [expiredPrescriptions, setExpiredPrescriptions] = useState([])
    const [prescriptionView, setPrescriptionView] = useState('active')
    const rxFileRef = useRef(null)

    const loadAutoRefillPlans = useCallback(async () => {
        if (!patient?.abha_id) return
        try {
            const res = await api.get(API_ENDPOINTS.PATIENTS_AUTO_REFILL_SUBSCRIPTIONS(patient.abha_id))
            setAutoRefillPlans(res.data?.subscriptions || [])
        } catch {
            setAutoRefillPlans([])
        }
    }, [patient])

    const loadOrdersAndAlerts = useCallback(async () => {
        if (!patient?.patient_id) return
        try {
            const ordersRes = await api.get(API_ENDPOINTS.ORDERS_LIST(patient.patient_id))
            const os = ordersRes.data.orders || []
            setOrders(os)
            const now = new Date()
            const refills = os.filter(o => {
                const d = new Date(o.purchase_date)
                return (now - d) > 20 * 24 * 3600 * 1000
            }).slice(0, 2)
            setAlerts(refills)
        } catch (err) {
            console.error('Failed to fetch orders:', err)
        }
    }, [patient])

    useEffect(() => {
        if (!patient?.patient_id) return

        const fetchMedicines = async () => {
            try {
                const medsRes = await api.get(API_ENDPOINTS.MEDICINES_LIST)
                setMedicines(medsRes.data.medicines || [])
            } catch (err) {
                console.error('Failed to fetch medicines:', err)
            } finally {
                setLoadingMeds(false)
            }
        }

        loadOrdersAndAlerts()
        fetchMedicines()
        loadAutoRefillPlans()

        api.get(API_ENDPOINTS.AGENT_PRESCRIPTION_HISTORY(patient?.abha_id))
            .then(res => {
                setActivePrescriptions(res.data?.active_prescriptions || [])
                setExpiredPrescriptions(res.data?.expired_prescriptions || [])
            })
            .catch(() => {
                setActivePrescriptions([])
                setExpiredPrescriptions([])
            })
    }, [patient, loadOrdersAndAlerts, loadAutoRefillPlans])

    const handleAutoRefill = async (alertOrder) => {
        if (!patient?.abha_id || !patient?.patient_id || !alertOrder?.medicine_name) return

        const confirmed = window.confirm(
            `Confirm auto refill for ${alertOrder.medicine_name}? The AI pharmacist will place the order now.`
        )
        if (!confirmed) return

        setRefillProcessing(prev => ({ ...prev, [alertOrder.order_id]: true }))
        setRefillStatus(prev => ({ ...prev, [alertOrder.order_id]: '' }))

        try {
            const res = await api.post(API_ENDPOINTS.PATIENTS_AUTO_REFILL, {
                abha_id: patient.abha_id,
                medicine_name: alertOrder.medicine_name,
                quantity: 1,
                confirm: true,
                channels: ['whatsapp', 'email', 'sms'],
            })

            const confirmations = res.data?.data?.channel_confirmations || {}
            const channelsSummary = Object.values(confirmations).join(' | ')
            const success = res.data?.status === 'success'

            setRefillStatus(prev => ({
                ...prev,
                [alertOrder.order_id]: success
                    ? `Auto refill order placed. ${channelsSummary}`
                    : (res.data?.message || 'Auto refill request failed.'),
            }))
            await loadOrdersAndAlerts()
        } catch (err) {
            setRefillStatus(prev => ({
                ...prev,
                [alertOrder.order_id]: err?.response?.data?.detail || err?.message || 'Auto refill failed. Please try again.',
            }))
        } finally {
            setRefillProcessing(prev => ({ ...prev, [alertOrder.order_id]: false }))
        }
    }

    const enableAutoRefillPlan = async () => {
        if (!selectedRefillMedicine || !patient?.abha_id) return
        const confirmed = window.confirm(`Enable auto refill plan for ${selectedRefillMedicine}? You can cancel anytime.`)
        if (!confirmed) return

        const key = `subscribe-${selectedRefillMedicine}`
        setRefillProcessing(prev => ({ ...prev, [key]: true }))
        setRefillStatus(prev => ({ ...prev, [key]: '' }))
        try {
            const res = await api.post(API_ENDPOINTS.PATIENTS_AUTO_REFILL_SUBSCRIBE, {
                abha_id: patient.abha_id,
                medicine_name: selectedRefillMedicine,
                quantity: 1,
                channels: ['whatsapp', 'email', 'sms'],
            })
            setRefillStatus(prev => ({ ...prev, [key]: res.data?.message || 'Auto refill plan enabled.' }))
            await loadAutoRefillPlans()
        } catch (err) {
            setRefillStatus(prev => ({ ...prev, [key]: err?.response?.data?.detail || err?.message || 'Failed to enable auto refill plan.' }))
        } finally {
            setRefillProcessing(prev => ({ ...prev, [key]: false }))
        }
    }

    const cancelAutoRefillPlan = async (subscriptionId, medicineName) => {
        if (!patient?.abha_id || !subscriptionId) return
        const confirmed = window.confirm(`Cancel auto refill plan for ${medicineName}?`)
        if (!confirmed) return
        const key = `cancel-${subscriptionId}`
        setRefillProcessing(prev => ({ ...prev, [key]: true }))
        try {
            await api.delete(API_ENDPOINTS.PATIENTS_AUTO_REFILL_CANCEL(patient.abha_id, subscriptionId))
            await loadAutoRefillPlans()
        } finally {
            setRefillProcessing(prev => ({ ...prev, [key]: false }))
        }
    }

    const requestAvailabilityNotification = async (item) => {
        if (!patient?.abha_id) return
        const key = `${item?.extracted_name || ''}-${item?.dosage || ''}`
        if (!key || notifyDone.includes(key)) return

        setNotifyLoading(key)
        try {
            await api.post(API_ENDPOINTS.AGENT_EXECUTE, {
                agent: 'notification',
                action: 'generate',
                patient_id: patient?.patient_id,
                patient_name: patient?.name,
                abha_id: patient?.abha_id,
                payload: {
                    event_type: 'refill_reminder',
                    details: {
                        medicine_name: item?.extracted_name || 'Medicine',
                        dosage: item?.dosage || '',
                        requested_via: 'overview_prescription_scan',
                        short_availability_eta: rxScanEta || '30-60 minutes',
                    },
                },
            })
            setNotifyDone(prev => [...prev, key])
        } catch {
        } finally {
            setNotifyLoading('')
        }
    }

    const handleOverviewRxUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        setRxScanLoading(true)
        setRxScanError('')
        setRxScanSummary('')
        setRxScanMatches([])
        setRxScanUnavailable([])
        setRxScanEta('')
        setRxPatientWarning('')
        setNotifyDone([])
        setNotifyLoading('')

        try {
            const formData = new FormData()
            formData.append('image', file)
            formData.append('patient_name', patient?.name || '')
            formData.append('abha_id', patient?.abha_id || '')

            const res = await axios.post(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.AGENT_SCAN}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 45000,
            })

            const scanned = Array.isArray(res?.data?.medicines) ? res.data.medicines : []
            const matches = scanned
                .filter(item => item?.matched_medicine)
                .map(item => ({
                    id: item.matched_medicine.id,
                    name: item.matched_medicine.name,
                    medicine: item.matched_medicine,
                    dosage: item?.dosage || '',
                    available: !!item?.available,
                }))
            const unavailable = scanned.filter(item => !item?.available)

            setRxScanMatches(matches)
            setRxScanUnavailable(unavailable)
            setRxScanEta(res?.data?.short_availability_eta || '30-60 minutes')
            setRxPatientWarning(res?.data?.patient_name_warning || '')
            setRxScanSummary(
                `${res?.data?.message || 'Prescription scanned'}${res?.data?.scan_duration_ms ? ` · ${(Number(res.data.scan_duration_ms) / 1000).toFixed(1)}s` : ''}`
            )

            for (const item of unavailable) {
                await requestAvailabilityNotification(item)
            }

            const availableMatches = matches.filter(m => m.available).map(m => m.medicine).filter(Boolean)
            if (availableMatches.length > 0) {
                sessionStorage.setItem('aushadhi_chat_handoff', JSON.stringify({
                    source: 'overview_prescription_scan',
                    medicines: availableMatches,
                    prompt: 'I scanned your prescription. Do you want to order these medicines?',
                }))
                navigate('/dashboard/chat')
            }
        } catch (error) {
            setRxScanError(error?.response?.data?.detail || 'Unable to scan prescription right now. Please try a clearer image.')
        } finally {
            setRxScanLoading(false)
            if (e?.target) e.target.value = ''
        }
    }

    const health = patient?.health_metrics || {}
    const meds = patient?.current_medications || []
    const allergy = patient?.allergies || []
    const chronic = patient?.chronic_conditions || []

    const healthCards = [
        { label: 'Blood Pressure', value: health.blood_pressure || '—', unit: 'mmHg', icon: Activity, color: '#6366f1', trend: [65, 70, 68, 75, 72, 78, 74, 80, 76, 82] },
        { label: 'Blood Sugar', value: health.blood_sugar || '—', unit: 'mg/dL', icon: DropletIcon, color: '#f43f5e', trend: [80, 95, 87, 100, 92, 105, 98, 88, 94, 102] },
        { label: 'Cholesterol', value: health.cholesterol || '—', unit: 'mg/dL', icon: Heart, color: '#f59e0b', trend: [160, 170, 165, 175, 168, 172, 166, 170, 168, 165] },
        { label: 'Pulse', value: health.pulse_rate || '—', unit: 'bpm', icon: Zap, color: '#10b981', trend: [68, 72, 70, 74, 71, 75, 72, 69, 73, 70] },
    ]

    const completedOrders = orders.filter(o => o.status === 'fulfilled' || o.status === 'completed')
    const totalSpend = orders.reduce((a, o) => a + parseFloat(o.total_amount || 0), 0)
    const refillCandidates = [...new Set((orders || []).map(o => o.medicine_name).filter(Boolean))]
    const manualRefillKey = `manual-${selectedRefillMedicine || 'none'}`

    return (
        <div className="p-8 space-y-7 max-w-5xl anim-fade">
            {/* Hero welcome */}
            <div className="card-luxury p-7 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
                    style={{ background: 'radial-gradient(circle, #818cf8, transparent)', filter: 'blur(40px)', transform: 'translate(30%,-30%)' }} />
                <div className="relative z-10 flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <p className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-2">Health Overview · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <h2 className="text-3xl font-black text-white mb-2"
                            style={{ fontFamily: "'Playfair Display', serif" }}>
                            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},<br />
                            <span className="text-gradient">{patient?.name?.split(' ')[0]}</span>
                        </h2>
                        <p className="text-slate-500 text-sm max-w-md">
                            Your AI pharmacist is monitoring your health profile and is ready to assist with prescriptions, advice, and orders.
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 text-right">
                        <div className="badge badge-indigo text-xs py-1.5 px-3">
                            <Sparkles className="w-3 h-3" /> AI Active
                        </div>
                        {patient?.blood_group && <span className="badge badge-red">{patient.blood_group}</span>}
                        {patient?.age && <span className="badge badge-violet">{patient.age}y · {patient.gender}</span>}
                    </div>
                </div>

                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/8">
                    {[
                        { label: 'Total Orders', value: orders.length, color: '#6366f1' },
                        { label: 'Completed', value: completedOrders.length, color: '#10b981' },
                        { label: 'Total Spend', value: `₹${totalSpend.toFixed(0)}`, color: '#f59e0b' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="text-center">
                            <p className="text-2xl font-black" style={{ color }}>{value}</p>
                            <p className="text-slate-600 text-xs mt-0.5">{label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Refill alerts */}
            {alerts.length > 0 && (
                <div className="flex flex-col gap-2 anim-up">
                    {alerts.map(a => (
                        <div key={a.order_id} className="flex items-center gap-4 px-5 py-4 rounded-2xl"
                            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.20)' }}>
                            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-amber-300 font-semibold text-sm">Refill Due: {a.medicine_name}</p>
                                <p className="text-slate-500 text-xs mt-0.5">Last ordered {a.purchase_date} · Consider reordering</p>
                                {refillStatus[a.order_id] && (
                                    <p className={`text-[11px] mt-1 ${refillStatus[a.order_id].toLowerCase().includes('success') ? 'text-emerald-400' : 'text-amber-300'}`}>
                                        {refillStatus[a.order_id]}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleAutoRefill(a)}
                                    disabled={!!refillProcessing[a.order_id]}
                                    className="btn btn-teal text-xs py-2 px-4 disabled:opacity-50"
                                >
                                    {refillProcessing[a.order_id] ? 'Processing…' : 'Auto Refill'}
                                </button>
                                <a href="/dashboard/medicines" className="btn btn-gold text-xs py-2 px-4">Order Now</a>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Active prescriptions */}
            <div className="card-luxury p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                        <h3 className="text-white font-bold text-sm">My Active Prescriptions</h3>
                        <p className="text-slate-500 text-xs mt-1">Uploaded prescriptions are stored and remain usable until validity ends.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPrescriptionView('active')}
                            className={`text-[10px] px-2 py-1 rounded-lg transition-all ${prescriptionView === 'active' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-white/5 text-slate-500 border border-transparent'}`}
                        >
                            Active ({activePrescriptions.length})
                        </button>
                        <button
                            onClick={() => setPrescriptionView('expired')}
                            className={`text-[10px] px-2 py-1 rounded-lg transition-all ${prescriptionView === 'expired' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/5 text-slate-500 border border-transparent'}`}
                        >
                            Expired ({expiredPrescriptions.length})
                        </button>
                    </div>
                </div>

                {(prescriptionView === 'active' ? activePrescriptions : expiredPrescriptions).length === 0 ? (
                    <p className="text-slate-600 text-xs">
                        {prescriptionView === 'active'
                            ? 'No active prescriptions right now. Upload one during medicine checkout.'
                            : 'No expired prescriptions found.'}
                    </p>
                ) : (
                    <div className="space-y-2">
                        {(prescriptionView === 'active' ? activePrescriptions : expiredPrescriptions).slice(0, 5).map((record) => (
                            <div key={record.record_id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-slate-300 text-xs font-mono">{record.record_id}</p>
                                    <p className={`${prescriptionView === 'active' ? 'text-emerald-400' : 'text-amber-300'} text-[11px] font-semibold`}>
                                        {prescriptionView === 'active' ? 'Valid till' : 'Expired on'}: {record.valid_until}
                                    </p>
                                </div>
                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    {(record.medicines || []).slice(0, 3).map((m, idx) => (
                                        <span key={`${record.record_id}-${idx}`} className="badge badge-teal text-[10px]">
                                            {m.extracted_name}{m.dosage ? ` (${m.dosage})` : ''}
                                        </span>
                                    ))}
                                    {(record.medicines || []).length > 3 && (
                                        <span className="badge badge-indigo text-[10px]">+{(record.medicines || []).length - 3} more</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Auto refill agent (always visible) */}
            <div className="card-luxury p-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <h3 className="text-white font-bold text-sm">Auto Refill Agent</h3>
                        <p className="text-slate-500 text-xs mt-1">
                            Confirm once, then AI places order and sends mock confirmations via WhatsApp, Email, and SMS.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <select
                            value={selectedRefillMedicine}
                            onChange={e => setSelectedRefillMedicine(e.target.value)}
                            className="input-field text-sm min-w-[230px]"
                        >
                            <option value="">Select medicine for auto refill</option>
                            {refillCandidates.map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => handleAutoRefill({ order_id: manualRefillKey, medicine_name: selectedRefillMedicine })}
                            disabled={!selectedRefillMedicine || !!refillProcessing[manualRefillKey]}
                            className="btn btn-teal text-xs py-2 px-4 disabled:opacity-50"
                        >
                            {refillProcessing[manualRefillKey] ? 'Processing…' : 'Start Auto Refill'}
                        </button>
                        <button
                            onClick={enableAutoRefillPlan}
                            disabled={!selectedRefillMedicine || !!refillProcessing[`subscribe-${selectedRefillMedicine}`]}
                            className="btn btn-gold text-xs py-2 px-4 disabled:opacity-50"
                        >
                            {refillProcessing[`subscribe-${selectedRefillMedicine}`] ? 'Saving…' : 'Enable Plan'}
                        </button>
                    </div>
                </div>
                {refillStatus[manualRefillKey] && (
                    <p className={`text-[11px] mt-3 ${refillStatus[manualRefillKey].toLowerCase().includes('placed') ? 'text-emerald-400' : 'text-amber-300'}`}>
                        {refillStatus[manualRefillKey]}
                    </p>
                )}
                {selectedRefillMedicine && refillStatus[`subscribe-${selectedRefillMedicine}`] && (
                    <p className="text-[11px] mt-2 text-indigo-300">
                        {refillStatus[`subscribe-${selectedRefillMedicine}`]}
                    </p>
                )}
                {autoRefillPlans.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                        <p className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold">Active Auto Refill Plans</p>
                        {autoRefillPlans.map(plan => (
                            <div key={plan.subscription_id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm text-white font-semibold">{plan.medicine_name}</p>
                                    <p className="text-[11px] text-slate-500">Qty {plan.quantity} · {Array.isArray(plan.channels) ? plan.channels.join(', ') : 'whatsapp, email, sms'}</p>
                                </div>
                                <button
                                    onClick={() => cancelAutoRefillPlan(plan.subscription_id, plan.medicine_name)}
                                    disabled={!!refillProcessing[`cancel-${plan.subscription_id}`]}
                                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 disabled:opacity-50"
                                >
                                    {refillProcessing[`cancel-${plan.subscription_id}`] ? 'Cancelling…' : 'Cancel Plan'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                {refillCandidates.length === 0 && (
                    <p className="text-[11px] text-slate-600 mt-3">No previous medicines found yet. Place one order to enable quick auto refill selection.</p>
                )}
            </div>

            <div className="card-luxury p-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <h3 className="text-white font-bold text-sm">Prescription Scanner</h3>
                        <p className="text-slate-500 text-xs mt-1">Upload prescription to instantly check inventory. Unavailable medicines are marked as available soon and notification requests are sent.</p>
                    </div>
                    <div>
                        <input ref={rxFileRef} type="file" accept="image/*,.pdf" onChange={handleOverviewRxUpload} className="hidden" />
                        <button
                            onClick={() => rxFileRef.current?.click()}
                            className="btn btn-teal text-xs py-2 px-4"
                            disabled={rxScanLoading}
                        >
                            {rxScanLoading ? 'Scanning…' : <><Upload className="w-3.5 h-3.5" /> Upload Prescription</>}
                        </button>
                    </div>
                </div>

                {rxScanSummary && (
                    <p className="text-[11px] text-emerald-400 mt-3">{rxScanSummary}</p>
                )}
                {rxScanError && (
                    <p className="text-[11px] text-red-400 mt-3">{rxScanError}</p>
                )}
                {rxPatientWarning && (
                    <p className="text-[11px] text-amber-300 mt-3">⚠️ {rxPatientWarning}</p>
                )}

                {rxScanMatches.length > 0 && (
                    <div className="mt-4 space-y-2">
                        <p className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold">Available in Inventory</p>
                        {rxScanMatches.filter(m => m.available).map(item => (
                            <div key={`avail-${item.id}-${item.dosage}`} className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-3 py-2 flex items-center justify-between">
                                <p className="text-sm text-emerald-100 font-semibold">{item.name}{item.dosage ? ` (${item.dosage})` : ''}</p>
                                <span className="badge badge-green text-[10px]">In Stock</span>
                            </div>
                        ))}
                    </div>
                )}

                {rxScanUnavailable.length > 0 && (
                    <div className="mt-4 space-y-2">
                        <p className="text-[11px] text-amber-300 uppercase tracking-wide font-semibold">Unavailable Now · Available Soon ({rxScanEta || '30-60 minutes'})</p>
                        {rxScanUnavailable.map(item => {
                            const key = `${item?.extracted_name || ''}-${item?.dosage || ''}`
                            const done = notifyDone.includes(key)
                            const loading = notifyLoading === key
                            return (
                                <div key={`unavail-${key}`} className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 flex items-center justify-between gap-2">
                                    <p className="text-sm text-amber-100 font-semibold">{item.extracted_name}{item.dosage ? ` (${item.dosage})` : ''}</p>
                                    <button
                                        onClick={() => requestAvailabilityNotification(item)}
                                        disabled={done || loading}
                                        className="text-[10px] px-2 py-1 rounded-md border border-amber-300/25 bg-amber-200/10 text-amber-100 disabled:opacity-60"
                                    >
                                        {loading ? 'Notifying…' : done ? 'Notified ✓' : 'Notify me'}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Health metrics */}
            <div>
                <h3 className="text-white font-black mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-400" /> Health Metrics
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {healthCards.map(({ label, value, unit, icon: Icon, color, trend }, i) => (
                        <div key={label} className={`stat-card anim-up delay-${i + 1}`}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="icon-pill" style={{ background: `${color}20` }}>
                                    <Icon className="w-4 h-4" style={{ color }} />
                                </div>
                                <TrendingUp className="w-3.5 h-3.5" style={{ color: `${color}80` }} />
                            </div>
                            <p className="text-2xl font-black text-white">{value}</p>
                            <p className="text-[10px] text-slate-600 mb-3">{unit}</p>
                            <p className="text-xs text-slate-500 mb-2">{label}</p>
                            <Sparkline data={trend} color={color} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Available Medicines / Inventory */}
            <div className="card-luxury p-6">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-white font-black flex items-center gap-2">
                        <Package className="w-5 h-5 text-indigo-400" /> Available Medicines
                    </h3>
                    <a href="/dashboard/medicines" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
                        Browse all <ChevronRight className="w-3 h-3" />
                    </a>
                </div>
                {loadingMeds ? (
                    <div className="flex items-center justify-center h-32">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                    </div>
                ) : medicines.length === 0 ? (
                    <p className="text-slate-600 text-sm py-4 text-center">No medicines available</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {medicines.slice(0, 6).map((med) => {
                            const isLowStock = parseInt(med.stock_quantity) < parseInt(med.min_stock_level)
                            return (
                                <div key={med.id} className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 transition-all cursor-pointer">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="text-white font-bold text-sm line-clamp-1">{med.name}</p>
                                            <p className="text-slate-500 text-xs mt-0.5">{med.generic_name}</p>
                                        </div>
                                        {isLowStock && <span className="badge badge-red text-[9px] flex-shrink-0">LOW</span>}
                                    </div>
                                    <div className="flex items-center justify-between mt-3">
                                        <div>
                                            <p className="text-indigo-400 font-black text-sm">₹{parseFloat(med.price).toFixed(2)}</p>
                                            <p className="text-slate-600 text-xs mt-0.5">Stock: {med.stock_quantity}</p>
                                        </div>
                                        <span className="text-[9px] px-2 py-1 rounded-lg bg-white/5 text-slate-400">{med.category}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* 2-col: Medications + Profile */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Current medications */}
                <div className="card-luxury p-5">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <Pill className="w-4 h-4 text-emerald-400" /> Current Medications
                    </h3>
                    {meds.length === 0 ? (
                        <p className="text-slate-600 text-sm py-4 text-center">No medications on record</p>
                    ) : (
                        <div className="space-y-2">
                            {meds.map((m, i) => (
                                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                                    style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}>
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                        style={{ background: 'rgba(16,185,129,0.15)' }}>
                                        <Pill className="w-3.5 h-3.5 text-emerald-400" />
                                    </div>
                                    <span className="text-slate-300 text-sm font-medium">{m}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Health profile */}
                <div className="card-luxury p-5 space-y-4">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <Shield className="w-4 h-4 text-indigo-400" /> Health Profile
                    </h3>
                    {[
                        { label: 'Conditions', values: chronic, color: '#f59e0b', emptyMsg: 'No chronic conditions' },
                        { label: 'Allergies', values: allergy, color: '#f43f5e', emptyMsg: 'No known allergies' },
                    ].map(({ label, values, color, emptyMsg }) => (
                        <div key={label}>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{label}</p>
                            {values.length === 0
                                ? <p className="text-slate-700 text-xs">{emptyMsg}</p>
                                : <div className="flex flex-wrap gap-1.5">{values.map(v => (
                                    <span key={v} className="badge text-[10px]"
                                        style={{ background: `${color}12`, borderColor: `${color}25`, color }}>
                                        {v}
                                    </span>
                                ))}</div>}
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent orders */}
            <div className="card-luxury p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-amber-400" /> Recent Orders
                    </h3>
                    <a href="/dashboard/orders" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
                        View all <ChevronRight className="w-3 h-3" />
                    </a>
                </div>
                {orders.slice(0, 4).length === 0 ? (
                    <p className="text-slate-600 text-sm py-4 text-center">No orders yet</p>
                ) : (
                    <div className="space-y-2">
                        {orders.slice(0, 4).map(o => (
                            <div key={o.order_id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                                        style={{ background: 'rgba(99,102,241,0.15)' }}>
                                        <Pill className="w-4 h-4 text-indigo-400" />
                                    </div>
                                    <div>
                                        <p className="text-white text-sm font-semibold">{o.medicine_name}</p>
                                        <p className="text-slate-600 text-xs">Qty {o.quantity} · {o.purchase_date}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-white font-bold text-sm">₹{parseFloat(o.total_amount || 0).toFixed(2)}</p>
                                    <span className={`badge text-[9px] ${o.status === 'completed' || o.status === 'fulfilled' ? 'badge-green' : 'badge-amber'}`}>
                                        {o.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
