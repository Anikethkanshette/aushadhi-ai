import React, { useMemo, useState } from 'react'
import { Bot, Play, Sparkles } from 'lucide-react'
import api from '../api'
import { API_ENDPOINTS } from '../config'
import { useAppContext } from '../context/AppContext'

const AGENT_CATALOG = {
    pharmacy: {
        label: 'Pharmacy Agent',
        actions: {
            chat: {
                label: 'Chat',
                template: {
                    message: 'Show my latest order history and pending actions.',
                    language: 'en-IN',
                    has_prescription: false,
                },
            },
        },
    },
    stock: {
        label: 'Stock Agent',
        actions: {
            search: { label: 'Search Inventory', template: { query: 'paracetamol' } },
            item: { label: 'Check Item', template: { medicine_id: 'MED001' } },
            low_stock: { label: 'Low Stock Scan', template: { threshold: 10 } },
        },
    },
    prescription: {
        label: 'Prescription Agent',
        actions: {
            validate: { label: 'Validate Rx', template: { medicine_id: 'MED001', has_prescription: true } },
            interaction: { label: 'Drug Interaction', template: { medicine_id_1: 'MED001', medicine_id_2: 'MED002' } },
        },
    },
    payment: {
        label: 'Payment Agent',
        actions: {
            process: { label: 'Process Payment', template: { amount: 199.0, method: 'UPI' } },
            refund: { label: 'Refund Payment', template: { transaction_id: 'TXN_SAMPLE_001', amount: 99.0, reason: 'Order cancelled' } },
            validate_method: { label: 'Validate Method', template: { method: 'UPI', details: { upi_id: 'demo@upi' } } },
        },
    },
    delivery: {
        label: 'Delivery Agent',
        actions: {
            schedule: { label: 'Schedule Delivery', template: { order_id: 'ORD_SAMPLE_001', zip_code: '560001' } },
            track: { label: 'Track Shipment', template: { tracking_id: 'AWB1234567890' } },
            estimate_cost: { label: 'Estimate Cost', template: { zip_code: '560001', weight_kg: 1.2 } },
        },
    },
    notification: {
        label: 'Notification Agent',
        actions: {
            generate: {
                label: 'Generate Notification',
                template: {
                    event_type: 'order_dispatched',
                    details: { order_id: 'ORD_SAMPLE_001', medicine_name: 'Paracetamol', quantity: 1 },
                },
            },
        },
    },
    policy: {
        label: 'Policy Agent',
        actions: {
            ask: { label: 'Policy Q&A', template: { message: 'What is your return policy for OTC medicines?' } },
            return_policy: { label: 'Return Policy', template: {} },
            schedule_info: { label: 'Schedule Info', template: { schedule: 'H' } },
        },
    },
    predictive: {
        label: 'Predictive Agent',
        actions: {
            refill_alerts: { label: 'Refill Alerts', template: { days_threshold: 7 } },
            predict_refill: { label: 'Predict Next Refill', template: { medicine_id: 'MED001' } },
            timeline: { label: 'Medication Timeline', template: {} },
        },
    },
    welfare: {
        label: 'Welfare Agent',
        actions: {
            check: { label: 'Check Eligibility', template: { order_amount: 450.0 } },
        },
    },
}

function prettyJson(value) {
    try {
        return JSON.stringify(value, null, 2)
    } catch {
        return String(value)
    }
}

export default function AgentsHub() {
    const { patient } = useAppContext()
    const [agentKey, setAgentKey] = useState('pharmacy')
    const [actionKey, setActionKey] = useState('chat')
    const [payloadText, setPayloadText] = useState(prettyJson(AGENT_CATALOG.pharmacy.actions.chat.template))
    const [running, setRunning] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState('')

    const actionEntries = useMemo(() => {
        return Object.entries(AGENT_CATALOG[agentKey].actions)
    }, [agentKey])

    const onAgentChange = (nextAgent) => {
        const firstAction = Object.keys(AGENT_CATALOG[nextAgent].actions)[0]
        setAgentKey(nextAgent)
        setActionKey(firstAction)
        setPayloadText(prettyJson(AGENT_CATALOG[nextAgent].actions[firstAction].template))
        setResult(null)
        setError('')
    }

    const onActionChange = (nextAction) => {
        setActionKey(nextAction)
        setPayloadText(prettyJson(AGENT_CATALOG[agentKey].actions[nextAction].template))
        setResult(null)
        setError('')
    }

    const runAgent = async () => {
        setError('')
        setResult(null)

        let payload
        try {
            payload = payloadText?.trim() ? JSON.parse(payloadText) : {}
        } catch {
            setError('Payload must be valid JSON.')
            return
        }

        setRunning(true)
        try {
            const res = await api.post(API_ENDPOINTS.AGENT_EXECUTE, {
                agent: agentKey,
                action: actionKey,
                payload,
                patient_id: patient?.patient_id,
                patient_name: patient?.name,
                abha_id: patient?.abha_id,
            })
            setResult(res.data)
        } catch (e) {
            setError(e?.message || 'Failed to execute agent action.')
        } finally {
            setRunning(false)
        }
    }

    return (
        <div className="p-8 max-w-5xl space-y-6 anim-fade">
            <div className="card-luxury p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #4f46e5, #14b8a6)' }}>
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-white text-lg font-black flex items-center gap-2">
                            Agents Hub
                            <span className="badge badge-teal text-[9px] py-0.5"><Sparkles className="w-2.5 h-2.5" /> All Agents</span>
                        </h2>
                        <p className="text-slate-600 text-xs">Run any backend agent directly from dashboard context.</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3 mb-3">
                    <div>
                        <label className="text-[11px] text-slate-500 mb-1 block">Agent</label>
                        <select
                            value={agentKey}
                            onChange={e => onAgentChange(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-sm"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: '#cbd5e1' }}
                        >
                            {Object.entries(AGENT_CATALOG).map(([key, value]) => (
                                <option key={key} value={key}>{value.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-[11px] text-slate-500 mb-1 block">Action</label>
                        <select
                            value={actionKey}
                            onChange={e => onActionChange(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-sm"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: '#cbd5e1' }}
                        >
                            {actionEntries.map(([key, value]) => (
                                <option key={key} value={key}>{value.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <label className="text-[11px] text-slate-500 mb-1 block">Payload (JSON)</label>
                <textarea
                    value={payloadText}
                    onChange={e => setPayloadText(e.target.value)}
                    rows={10}
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', color: '#cbd5e1' }}
                />

                <div className="mt-3 flex items-center gap-3">
                    <button
                        onClick={runAgent}
                        disabled={running}
                        className="btn btn-indigo px-4 py-2 text-sm disabled:opacity-60 inline-flex items-center gap-2"
                    >
                        <Play className="w-3.5 h-3.5" />
                        {running ? 'Running...' : 'Run Agent'}
                    </button>
                    {error && <span className="text-xs text-red-400">{error}</span>}
                </div>
            </div>

            <div className="card-luxury p-6">
                <p className="text-white text-sm font-bold mb-2">Response</p>
                <pre className="text-xs whitespace-pre-wrap break-words rounded-xl p-4"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#cbd5e1' }}>
                    {result ? prettyJson(result) : 'Run an action to view response.'}
                </pre>
            </div>
        </div>
    )
}
