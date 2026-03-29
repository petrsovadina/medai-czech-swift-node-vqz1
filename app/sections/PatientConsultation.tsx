'use client'

import React, { useState, useEffect, useRef } from 'react'
import { FiSend, FiChevronDown, FiChevronRight, FiCheck, FiX, FiAlertTriangle, FiHeart, FiActivity, FiFileText, FiArrowLeft, FiShield, FiClock, FiInfo, FiEdit2 } from 'react-icons/fi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { callAIAgent } from '@/lib/aiAgent'

const AGENT_ID = '69c1bbdee2d1507b5eeec9b7'

// Safety constants
const SAFETY_DISCLAIMER = 'Toto je informativni odpoved urcena jako podpora klinickeho rozhodovani. Nenahrazuje klinicky usudek lekare.'

const URGENCY_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; action?: string }> = {
  URGENTNI: { label: 'URGENTNI', color: 'bg-red-100 text-red-800 border-red-300', icon: <FiAlertTriangle size={12} />, action: 'Zavolejte 155!' },
  VYSOKA: { label: 'VYSOKA', color: 'bg-orange-100 text-orange-800 border-orange-300', icon: <FiAlertTriangle size={12} /> },
  STANDARDNI: { label: 'STANDARDNI', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <FiInfo size={12} /> },
  INFORMACNI: { label: 'INFORMACNI', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: <FiInfo size={12} /> },
}

interface ClinicalResponse {
  urgency?: string
  format_type?: string
  main_recommendation?: string
  key_points?: string[]
  patient_context_summary?: string
  clinical_analysis?: string
  differential_diagnosis?: string[]
  recommended_approach?: string
  pharmacotherapy?: string
  citations?: { id?: string; text?: string; pmid?: string; doi?: string; confidence_tier?: string }[]
  warnings?: string[]
  disclaimer?: string
  auto_capture?: { type?: string; code?: string; display?: string; value?: string }[]
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  parsed?: ClinicalResponse
  timestamp: string
  consultMode?: 'quick' | 'deep'
}

interface PatientData {
  patient?: any
  conditions?: any[]
  medications?: any[]
  observations?: any[]
  allergies?: any[]
  encounters?: any[]
}

interface PatientConsultationProps {
  patientId: string
  onBack: () => void
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-1.5">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-2 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-2 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-3 mb-1">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part)
}

function getUrgencyConfig(urgency?: string) {
  const val = (urgency ?? '').toUpperCase()
  if (val.includes('URGENT') || val.includes('KRITICK')) return URGENCY_CONFIG.URGENTNI
  if (val.includes('VYSOK') || val.includes('HIGH')) return URGENCY_CONFIG.VYSOKA
  if (val.includes('STANDARD') || val.includes('MEDIUM')) return URGENCY_CONFIG.STANDARDNI
  return URGENCY_CONFIG.INFORMACNI
}

function ConfidenceBadge({ tier }: { tier?: string }) {
  const t = (tier ?? '').toUpperCase()
  if (t.includes('A')) return <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 border border-green-200 font-medium">A</span>
  if (t.includes('B')) return <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 font-medium">B</span>
  return <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200 font-medium">C</span>
}

function CollapsibleSection({ title, icon, children, defaultOpen = false }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors">
        {icon}
        <span className="flex-1 text-left">{title}</span>
        {open ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
      </button>
      {open && <div className="px-3 pb-3 pt-1">{children}</div>}
    </div>
  )
}

export default function PatientConsultation({ patientId, onBack }: PatientConsultationProps) {
  const [patientData, setPatientData] = useState<PatientData>({})
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [consultMode, setConsultMode] = useState<'quick' | 'deep'>('quick')
  const [pendingCaptures, setPendingCaptures] = useState<ClinicalResponse['auto_capture']>([])
  const [patientLoading, setPatientLoading] = useState(true)
  const [activeAgent, setActiveAgent] = useState('')
  const [sessionStart] = useState(() => new Date().toISOString())
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (patientId) loadPatientData()
  }, [patientId])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const loadPatientData = async () => {
    setPatientLoading(true)
    try {
      const res = await fetch(`/api/patients/${patientId}`)
      const data = await res.json()
      if (data?.success) setPatientData(data.data ?? {})
    } catch { /* ignore */ }
    setPatientLoading(false)
  }

  const buildContext = () => {
    const conds = Array.isArray(patientData?.conditions) ? patientData.conditions.map((c: any) => c?.display ?? '').filter(Boolean).join(', ') : ''
    const meds = Array.isArray(patientData?.medications) ? patientData.medications.map((m: any) => `${m?.display ?? ''} ${m?.dosage ?? ''}`).filter(Boolean).join(', ') : ''
    const allergies = Array.isArray(patientData?.allergies) ? patientData.allergies.map((a: any) => a?.display ?? '').filter(Boolean).join(', ') : ''
    const obs = Array.isArray(patientData?.observations) ? patientData.observations.map((o: any) => `${o?.display ?? ''}: ${o?.value ?? ''} ${o?.unit ?? ''}`).filter(Boolean).join(', ') : ''
    let ctx = ''
    if (conds) ctx += `Diagnozy: ${conds}. `
    if (meds) ctx += `Leky: ${meds}. `
    if (allergies) ctx += `Alergie: ${allergies}. `
    if (obs) ctx += `Observace: ${obs}. `
    return ctx
  }

  const saveSessionHistory = async (userMsg: string, assistantResponse: ClinicalResponse, mode: 'quick' | 'deep') => {
    try {
      await fetch('/api/session-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          session_start: sessionStart,
          query: userMsg,
          response_summary: assistantResponse?.main_recommendation?.slice(0, 500) ?? '',
          consult_mode: mode,
          urgency: assistantResponse?.urgency ?? 'INFORMACNI',
          citations_count: Array.isArray(assistantResponse?.citations) ? assistantResponse.citations.length : 0,
          timestamp: new Date().toISOString(),
        }),
      })
    } catch { /* non-blocking */ }
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    const now = new Date().toISOString()
    setMessages((prev) => [...prev, { role: 'user', content: userMsg, timestamp: now, consultMode }])
    setLoading(true)
    setActiveAgent(AGENT_ID)

    try {
      const ctx = buildContext()
      const modeInstructions = consultMode === 'deep'
        ? 'Typ konzultace: DeepConsult (1000-2500 znaku, hloubkova analyza, ceske guidelines vs. mezinarodni, terapeuticke moznosti s davkovanim/NU/VZP uhradou, bezpecnostni info, rozhodovaci ramec)'
        : 'Typ konzultace: QuickConsult (200-400 znaku, prima odpoved + 3 klicove body + citace + disclaimer)'

      // Build multi-turn conversation history for context (last 6 exchanges max)
      const recentHistory = messages.slice(-6).map((m) => {
        if (m.role === 'user') return `Lekar: ${m.content}`
        return `Asistent: ${m.parsed?.main_recommendation?.slice(0, 300) ?? m.content.slice(0, 300)}`
      }).join('\n')

      const historyBlock = recentHistory ? `\nHistorie konverzace:\n${recentHistory}\n\n` : ''
      const fullMessage = `${ctx ? `Kontext pacienta: ${ctx}\n\n` : ''}${modeInstructions}${historyBlock}\nAktualni dotaz: ${userMsg}`
      const result = await callAIAgent(fullMessage, AGENT_ID)

      let parsed: ClinicalResponse = {}
      if (result?.success) {
        const raw = result?.response?.result
        if (typeof raw === 'string') {
          try { parsed = JSON.parse(raw) } catch { parsed = { main_recommendation: raw } }
        } else if (raw && typeof raw === 'object') {
          parsed = raw as ClinicalResponse
        }
      }

      // Ensure disclaimer is always present
      if (!parsed.disclaimer) {
        parsed.disclaimer = SAFETY_DISCLAIMER
      }

      const captures = Array.isArray(parsed?.auto_capture) ? parsed.auto_capture : []
      if (captures.length > 0) setPendingCaptures(captures)

      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: parsed?.main_recommendation ?? result?.error ?? 'Zadna odpoved',
        parsed,
        timestamp: new Date().toISOString(),
        consultMode,
      }])

      // Save session history (non-blocking)
      saveSessionHistory(userMsg, parsed, consultMode)

      // Audit log
      fetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'consultation', resource_type: 'patient', resource_id: patientId, metadata: { consult_mode: consultMode, urgency: parsed?.urgency }, timestamp: new Date().toISOString() }),
      }).catch(() => {})
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Chyba pri komunikaci s agentem', timestamp: new Date().toISOString() }])
    }
    setLoading(false)
    setActiveAgent('')
  }

  const handleSaveCaptures = async () => {
    if (!Array.isArray(pendingCaptures)) return
    for (const item of pendingCaptures) {
      const t = item?.type?.toLowerCase() ?? ''
      let endpoint = ''
      let body: any = { patient_id: patientId }
      if (t.includes('condition') || t.includes('diagnos')) {
        endpoint = '/api/patient-conditions'
        body = { ...body, code: item?.code, display: item?.display, clinical_status: 'active' }
      } else if (t.includes('medic') || t.includes('lek')) {
        endpoint = '/api/patient-medications'
        body = { ...body, medication_code: item?.code, display: item?.display, dosage: item?.value }
      } else if (t.includes('allerg')) {
        endpoint = '/api/patient-allergies'
        body = { ...body, substance_code: item?.code, display: item?.display }
      } else if (t.includes('observ')) {
        endpoint = '/api/patient-observations'
        body = { ...body, code: item?.code, display: item?.display, value: item?.value }
      }
      if (endpoint) {
        await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {})
      }
    }
    setPendingCaptures([])
    loadPatientData()
  }

  const conditions = Array.isArray(patientData?.conditions) ? patientData.conditions : []
  const medications = Array.isArray(patientData?.medications) ? patientData.medications : []
  const allergies = Array.isArray(patientData?.allergies) ? patientData.allergies : []
  const observations = Array.isArray(patientData?.observations) ? patientData.observations : []
  const lastCitations = messages.filter((m) => m.role === 'assistant').slice(-1)[0]?.parsed?.citations

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left sidebar - Patient context */}
      <div className="w-64 border-r border-border bg-card overflow-y-auto p-3 space-y-3 hidden lg:block">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-2 text-xs">
          <FiArrowLeft size={14} className="mr-1" /> Zpet
        </Button>
        <div className="text-sm font-medium mb-2">{patientData?.patient?.display_name ?? 'Pacient'}</div>

        <CollapsibleSection title={`Diagnozy (${conditions.length})`} icon={<FiActivity size={14} />} defaultOpen>
          {conditions.length === 0 ? <p className="text-xs text-muted-foreground">Zadne zaznamy</p> : conditions.map((c: any, i: number) => (
            <div key={i} className="text-xs py-1 border-b border-border last:border-0">
              <span className="font-medium">{c?.display ?? 'N/A'}</span>
              {c?.clinical_status && <Badge variant="outline" className="ml-1 text-[10px] py-0">{c.clinical_status}</Badge>}
            </div>
          ))}
        </CollapsibleSection>

        <CollapsibleSection title={`Leky (${medications.length})`} icon={<FiHeart size={14} />}>
          {medications.length === 0 ? <p className="text-xs text-muted-foreground">Zadne zaznamy</p> : medications.map((m: any, i: number) => (
            <div key={i} className="text-xs py-1 border-b border-border last:border-0">
              <span className="font-medium">{m?.display ?? 'N/A'}</span>
              {m?.dosage && <span className="text-muted-foreground ml-1">{m.dosage}</span>}
            </div>
          ))}
        </CollapsibleSection>

        <CollapsibleSection title={`Alergie (${allergies.length})`} icon={<FiAlertTriangle size={14} />}>
          {allergies.length === 0 ? <p className="text-xs text-muted-foreground">Zadne zaznamy</p> : allergies.map((a: any, i: number) => (
            <div key={i} className="text-xs py-1 border-b border-border last:border-0">
              <span className="font-medium">{a?.display ?? 'N/A'}</span>
              {a?.criticality && <Badge variant="destructive" className="ml-1 text-[10px] py-0">{a.criticality}</Badge>}
            </div>
          ))}
        </CollapsibleSection>

        <CollapsibleSection title={`Observace (${observations.length})`} icon={<FiFileText size={14} />}>
          {observations.length === 0 ? <p className="text-xs text-muted-foreground">Zadne zaznamy</p> : observations.map((o: any, i: number) => (
            <div key={i} className="text-xs py-1 border-b border-border last:border-0">
              <span className="font-medium">{o?.display ?? 'N/A'}</span>
              {o?.value && <span className="text-muted-foreground ml-1">{o.value} {o?.unit ?? ''}</span>}
            </div>
          ))}
        </CollapsibleSection>

        {/* Safety info */}
        <div className="mt-4 p-2 rounded-lg bg-secondary border border-border">
          <div className="flex items-center gap-1.5 mb-1">
            <FiShield size={12} className="text-muted-foreground" />
            <p className="text-[10px] font-medium text-muted-foreground">Bezpecnost</p>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            AI asistent neposkytuje diagnozy ani lekarske predpisy. Vsechny informace jsou pouze orientacni.
          </p>
        </div>

        {activeAgent && (
          <div className="mt-2 p-2 rounded-lg bg-secondary">
            <p className="text-[10px] text-muted-foreground">Aktivni agent</p>
            <p className="text-xs font-medium">Clinical Coordinator</p>
            <div className="w-full h-1 bg-muted rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse w-2/3" />
            </div>
          </div>
        )}
      </div>

      {/* Center - Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card">
          <Button variant="ghost" size="sm" onClick={onBack} className="lg:hidden"><FiArrowLeft size={16} /></Button>
          <h2 className="text-sm font-semibold flex-1">{patientData?.patient?.display_name ?? 'Konzultace'}</h2>
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5">
            <button onClick={() => setConsultMode('quick')} className={`px-3 py-1 text-xs rounded-md transition-colors ${consultMode === 'quick' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}>
              QuickConsult
            </button>
            <button onClick={() => setConsultMode('deep')} className={`px-3 py-1 text-xs rounded-md transition-colors ${consultMode === 'deep' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}>
              DeepConsult
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FiMessageSquareIcon size={40} className="mx-auto mb-4 opacity-30" />
              <p className="text-sm font-medium">Zahajte konzultaci</p>
              <p className="text-xs mt-1">Zadejte klinicky dotaz nize</p>
              <div className="mt-6 flex justify-center gap-3">
                <div className="text-left p-3 rounded-lg border border-border bg-card max-w-[200px]">
                  <p className="text-[10px] font-medium mb-1">QuickConsult</p>
                  <p className="text-[10px] text-muted-foreground">200-400 znaku, ~30s cteni. Pro rychle fakticke dotazy.</p>
                </div>
                <div className="text-left p-3 rounded-lg border border-border bg-card max-w-[200px]">
                  <p className="text-[10px] font-medium mb-1">DeepConsult</p>
                  <p className="text-[10px] text-muted-foreground">1000-2500 znaku, 3-5 min. Hloubkova analyza s guidelines.</p>
                </div>
              </div>
              <div className="mt-6 max-w-md mx-auto">
                <p className="text-[10px] font-medium mb-2 text-left">Priklad dotazu:</p>
                <div className="space-y-1.5">
                  {[
                    'Jake jsou moznosti eskalace lecby u DM2 pri nedostatecne kompenzaci na metforminu?',
                    'Diferencialni diagnostika bolesti na hrudi u 74lete zeny s normalnim EKG',
                    'Interakce warfarinu s novymi ATB — co zkontrolovat?',
                  ].map((q, qi) => (
                    <button
                      key={qi}
                      onClick={() => { setInput(q); setConsultMode(qi === 1 ? 'deep' : 'quick') }}
                      className="w-full text-left p-2 rounded-lg border border-border bg-card hover:bg-secondary transition-colors text-xs"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-xl px-4 py-3 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}>
                {msg.role === 'user' ? (
                  <div>
                    <p className="text-sm">{msg.content}</p>
                    {msg.consultMode && <p className="text-[10px] opacity-70 mt-1">{msg.consultMode === 'deep' ? 'DeepConsult' : 'QuickConsult'}</p>}
                  </div>
                ) : msg.parsed?.main_recommendation ? (
                  <div className="space-y-3">
                    {/* Urgency banner */}
                    {msg.parsed?.urgency && (() => {
                      const uc = getUrgencyConfig(msg.parsed.urgency)
                      const isUrgent = uc === URGENCY_CONFIG.URGENTNI
                      return (
                        <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${uc.color} ${isUrgent ? 'animate-pulse' : ''}`}>
                          {uc.icon}
                          <span className="text-[11px] font-semibold">{uc.label}</span>
                          {uc.action && <span className="text-[11px] font-bold ml-auto">{uc.action}</span>}
                        </div>
                      )
                    })()}

                    {/* Format type badge */}
                    {msg.parsed?.format_type && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{msg.parsed.format_type}</Badge>
                        <FiClock size={10} className="text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">
                          {(msg.parsed.format_type ?? '').toLowerCase().includes('deep') ? '3-5 min cteni' : '~30s cteni'}
                        </span>
                      </div>
                    )}

                    {/* Main recommendation */}
                    <div className="text-sm">{renderMarkdown(msg.parsed.main_recommendation)}</div>

                    {/* Key points */}
                    {Array.isArray(msg.parsed?.key_points) && msg.parsed.key_points.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Klicove body:</p>
                        <ul className="space-y-0.5">{msg.parsed.key_points.map((kp, ki) => <li key={ki} className="text-xs ml-3 list-disc">{kp}</li>)}</ul>
                      </div>
                    )}

                    {/* Patient context */}
                    {msg.parsed?.patient_context_summary && (
                      <div className="text-xs bg-secondary rounded-lg p-2">{renderMarkdown(msg.parsed.patient_context_summary)}</div>
                    )}

                    {/* Clinical analysis (DeepConsult) */}
                    {msg.parsed?.clinical_analysis && (
                      <div><p className="text-xs font-medium text-muted-foreground mb-1">Klinicka analyza:</p>{renderMarkdown(msg.parsed.clinical_analysis)}</div>
                    )}

                    {/* Differential diagnosis */}
                    {Array.isArray(msg.parsed?.differential_diagnosis) && msg.parsed.differential_diagnosis.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Diferencialni diagnoza:</p>
                        <ul className="space-y-0.5">{msg.parsed.differential_diagnosis.map((d, di) => <li key={di} className="text-xs ml-3 list-disc">{d}</li>)}</ul>
                      </div>
                    )}

                    {/* Recommended approach */}
                    {msg.parsed?.recommended_approach && (
                      <div><p className="text-xs font-medium text-muted-foreground mb-1">Doporuceny postup:</p>{renderMarkdown(msg.parsed.recommended_approach)}</div>
                    )}

                    {/* Pharmacotherapy */}
                    {msg.parsed?.pharmacotherapy && (
                      <div><p className="text-xs font-medium text-muted-foreground mb-1">Farmakoterapie:</p>{renderMarkdown(msg.parsed.pharmacotherapy)}</div>
                    )}

                    {/* Warnings */}
                    {Array.isArray(msg.parsed?.warnings) && msg.parsed.warnings.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                        <p className="text-xs font-medium text-red-800 mb-1 flex items-center gap-1"><FiAlertTriangle size={12} /> Varovani:</p>
                        {msg.parsed.warnings.map((w, wi) => <p key={wi} className="text-xs text-red-700">{w}</p>)}
                      </div>
                    )}

                    {/* Citations with confidence tiers */}
                    {Array.isArray(msg.parsed?.citations) && msg.parsed.citations.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {msg.parsed.citations.map((c, ci) => (
                          <span key={ci} className="inline-flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded cursor-default" title={c?.text ?? ''}>
                            [{c?.id ?? ci + 1}]
                            <ConfidenceBadge tier={c?.confidence_tier} />
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Disclaimer - always shown */}
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                        <FiShield size={10} />
                        {msg.parsed?.disclaimer || SAFETY_DISCLAIMER}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm">{renderMarkdown(msg.content)}</div>
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                        <FiShield size={10} />
                        {SAFETY_DISCLAIMER}
                      </p>
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground mt-2">{new Date(msg.timestamp).toLocaleTimeString('cs-CZ')}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-xl px-4 py-3 min-w-[280px]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {consultMode === 'deep' ? 'Provadim hloubkovou analyzu...' : 'Analyzuji...'}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] text-muted-foreground">Clinical Coordinator — orchestrace</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: '300ms' }} />
                    <span className="text-[10px] text-muted-foreground">Patient Context Agent — nacitani dat pacienta</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" style={{ animationDelay: '600ms' }} />
                    <span className="text-[10px] text-muted-foreground">Medical Knowledge Agent — vyhledavani dukazu</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Auto-capture banner */}
        {Array.isArray(pendingCaptures) && pendingCaptures.length > 0 && (
          <div className="px-4 py-2 bg-blue-50 border-t border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <FiActivity size={14} className="text-blue-700" />
              <span className="text-xs font-medium text-blue-800 flex-1">Nova klinicka data detekovana ({pendingCaptures.length})</span>
              <Button size="sm" variant="default" onClick={handleSaveCaptures} className="h-7 text-xs"><FiCheck size={12} className="mr-1" />Ulozit vse</Button>
              <Button size="sm" variant="ghost" onClick={() => setPendingCaptures([])} className="h-7 text-xs"><FiX size={12} /></Button>
            </div>
            <div className="space-y-1">
              {pendingCaptures.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs bg-white/60 rounded px-2 py-1.5">
                  <Badge variant="outline" className="text-[9px] py-0 shrink-0">{item?.type ?? 'data'}</Badge>
                  <input
                    className="flex-1 bg-transparent border-none outline-none text-xs"
                    value={item?.display ?? ''}
                    onChange={(e) => {
                      const updated = [...(pendingCaptures ?? [])]
                      if (updated[idx]) updated[idx] = { ...updated[idx], display: e.target.value }
                      setPendingCaptures(updated)
                    }}
                  />
                  {item?.value && (
                    <input
                      className="w-24 bg-transparent border-b border-blue-200 outline-none text-xs text-muted-foreground"
                      value={item.value}
                      onChange={(e) => {
                        const updated = [...(pendingCaptures ?? [])]
                        if (updated[idx]) updated[idx] = { ...updated[idx], value: e.target.value }
                        setPendingCaptures(updated)
                      }}
                    />
                  )}
                  <button
                    onClick={() => {
                      const updated = (pendingCaptures ?? []).filter((_, i) => i !== idx)
                      setPendingCaptures(updated)
                    }}
                    className="p-0.5 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors"
                  >
                    <FiX size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-border bg-card">
          <div className="flex items-end gap-2">
            <Textarea
              placeholder={consultMode === 'deep' ? 'Zadejte klinicky dotaz pro hloubkovou analyzu...' : 'Zadejte klinicky dotaz...'}
              className="min-h-[44px] max-h-32 resize-none text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            />
            <Button onClick={handleSend} disabled={loading || !input.trim()} size="sm" className="h-11 px-4">
              <FiSend size={16} />
            </Button>
          </div>
          <p className="text-[9px] text-muted-foreground mt-1.5 flex items-center gap-1">
            <FiShield size={8} /> AI asistent neposkytuje diagnozy. Informace jsou pouze orientacni.
          </p>
        </div>
      </div>

      {/* Right sidebar - Citations */}
      <div className="w-56 border-l border-border bg-card overflow-y-auto p-3 hidden xl:block">
        <h3 className="text-xs font-medium text-muted-foreground mb-3">Zdroje a citace</h3>
        {Array.isArray(lastCitations) && lastCitations.length > 0 ? lastCitations.map((c, ci) => (
          <Card key={ci} className="mb-2">
            <CardContent className="p-2">
              <div className="flex items-start gap-1.5 mb-1">
                <span className="text-[10px] font-mono text-muted-foreground">[{c?.id ?? ci + 1}]</span>
                <p className="text-xs font-medium flex-1">{c?.text ?? `Zdroj ${ci + 1}`}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                <ConfidenceBadge tier={c?.confidence_tier} />
                {c?.pmid && <a href={`https://pubmed.ncbi.nlm.nih.gov/${c.pmid}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline">PMID: {c.pmid}</a>}
                {c?.doi && <a href={`https://doi.org/${c.doi}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline">DOI</a>}
              </div>
            </CardContent>
          </Card>
        )) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Zdroje se zobrazi po konzultaci</p>
            <div className="p-2 rounded-lg border border-border">
              <p className="text-[10px] font-medium mb-1">Urovne dukazu:</p>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <ConfidenceBadge tier="A" />
                  <span className="text-[10px] text-muted-foreground">RCT / meta-analyza</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ConfidenceBadge tier="B" />
                  <span className="text-[10px] text-muted-foreground">Kohorta / guidelines</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ConfidenceBadge tier="C" />
                  <span className="text-[10px] text-muted-foreground">Kazuistiky / expert</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FiMessageSquareIcon(props: { size: number; className?: string }) {
  return (
    <svg width={props.size} height={props.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}
