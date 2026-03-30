'use client'

import React, { useState, useEffect } from 'react'
import { FiPlus, FiSearch, FiActivity, FiUsers, FiChevronRight, FiClock, FiMessageSquare, FiBookOpen, FiDownload, FiTrash2, FiShield } from 'react-icons/fi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface PatientRecord {
  _id: string
  display_name?: string
  patient_hash?: string
  createdAt?: string
}

interface SessionRecord {
  _id?: string
  patient_id?: string
  query?: string
  response_summary?: string
  consult_mode?: string
  urgency?: string
  citations_count?: number
  timestamp?: string
  createdAt?: string
}

interface DashboardProps {
  patients: PatientRecord[]
  onSelectPatient: (id: string) => void
  onRefreshPatients: () => void
  loading: boolean
}

const SAMPLE_PATIENTS: PatientRecord[] = [
  { _id: 's1', display_name: 'Pacient A-7291', patient_hash: 'hash1', createdAt: '2026-03-22T10:00:00Z' },
  { _id: 's2', display_name: 'Pacient B-4538', patient_hash: 'hash2', createdAt: '2026-03-21T14:30:00Z' },
  { _id: 's3', display_name: 'Pacient C-1203', patient_hash: 'hash3', createdAt: '2026-03-20T09:15:00Z' },
]

function urgencyBadge(urgency?: string) {
  const val = (urgency ?? '').toUpperCase()
  if (val.includes('URGENT')) return <Badge className="text-[9px] py-0 bg-red-100 text-red-800 border-red-200" variant="outline">URGENTNI</Badge>
  if (val.includes('VYSOK') || val.includes('HIGH')) return <Badge className="text-[9px] py-0 bg-orange-100 text-orange-800 border-orange-200" variant="outline">VYSOKA</Badge>
  if (val.includes('STANDARD')) return <Badge className="text-[9px] py-0 bg-blue-100 text-blue-700 border-blue-200" variant="outline">STANDARD</Badge>
  return <Badge className="text-[9px] py-0" variant="outline">INFO</Badge>
}

export default function Dashboard({ patients, onSelectPatient, onRefreshPatients, loading }: DashboardProps) {
  const [search, setSearch] = useState('')
  const [showSample, setShowSample] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [newHash, setNewHash] = useState('')
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)

  useEffect(() => { loadSessions() }, [])

  const loadSessions = async () => {
    setSessionsLoading(true)
    try {
      const res = await fetch('/api/session-history')
      const data = await res.json()
      if (data?.success && Array.isArray(data.data)) {
        setSessions(data.data.slice(0, 20))
      }
    } catch { /* ignore */ }
    setSessionsLoading(false)
  }

  const displayPatients = showSample ? SAMPLE_PATIENTS : patients
  const filtered = displayPatients.filter((p) => {
    const name = p?.display_name ?? p?.patient_hash ?? ''
    return name.toLowerCase().includes(search.toLowerCase())
  })

  // Stats
  const today = new Date().toISOString().split('T')[0]
  const todaySessions = sessions.filter((s) => {
    const ts = s?.timestamp ?? s?.createdAt ?? ''
    return ts.startsWith(today)
  })
  const totalCitations = sessions.reduce((acc, s) => acc + (s?.citations_count ?? 0), 0)

  const handleCreate = async () => {
    if (!newHash.trim()) { setError('Identifikator je povinny'); return }
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_hash: newHash, display_name: newName || `Pacient ${newHash.slice(0, 6)}` }),
      })
      const data = await res.json()
      if (data?.success) {
        setModalOpen(false)
        setNewHash('')
        setNewName('')
        onRefreshPatients()
      } else {
        setError(data?.error ?? 'Chyba pri vytvareni pacienta')
      }
    } catch {
      setError('Sitova chyba')
    } finally {
      setCreating(false)
    }
  }

  const [gdprAction, setGdprAction] = useState<{ type: 'export' | 'delete'; id: string; name: string } | null>(null)
  const [gdprLoading, setGdprLoading] = useState(false)
  const [gdprResult, setGdprResult] = useState<string | null>(null)

  // Get patient name by id
  const getPatientName = (pid?: string) => {
    if (!pid) return 'Neznamy'
    const p = patients.find((pt) => pt._id === pid)
    return p?.display_name ?? p?.patient_hash?.slice(0, 8) ?? pid.slice(0, 8)
  }

  const handleGdprExport = async (patientId: string) => {
    setGdprLoading(true)
    try {
      const res = await fetch(`/api/patients/${patientId}/gdpr`)
      const data = await res.json()
      if (data?.success) {
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `patient_export_${patientId.slice(0, 8)}_${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
        setGdprResult('Data uspesne exportovana')
      } else {
        setGdprResult(data?.error ?? 'Chyba pri exportu')
      }
    } catch {
      setGdprResult('Sitova chyba')
    }
    setGdprLoading(false)
    setGdprAction(null)
  }

  const handleGdprDelete = async (patientId: string) => {
    setGdprLoading(true)
    try {
      const res = await fetch(`/api/patients/${patientId}/gdpr`, { method: 'DELETE' })
      const data = await res.json()
      if (data?.success) {
        setGdprResult('Vsechna data pacienta byla smazana (GDPR pravo byt zapomenut)')
        onRefreshPatients()
      } else {
        setGdprResult(data?.error ?? 'Chyba pri mazani')
      }
    } catch {
      setGdprResult('Sitova chyba')
    }
    setGdprLoading(false)
    setGdprAction(null)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Prehled pacientu a konzultaci</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground">Vzorova data</Label>
            <Switch id="sample-toggle" checked={showSample} onCheckedChange={setShowSample} />
          </div>
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><FiPlus className="mr-1" size={16} /> Novy pacient</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novy pacient</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Rodne cislo / Hash *</Label>
                  <Input placeholder="Identifikator pacienta" value={newHash} onChange={(e) => setNewHash(e.target.value)} />
                </div>
                <div>
                  <Label>Zobrazovane jmeno</Label>
                  <Input placeholder="Volitelne" value={newName} onChange={(e) => setNewName(e.target.value)} />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button onClick={handleCreate} disabled={creating} className="w-full">
                  {creating ? 'Vytvari se...' : 'Vytvorit pacienta'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary"><FiUsers size={20} className="text-muted-foreground" /></div>
              <div>
                <p className="text-2xl font-semibold">{displayPatients.length}</p>
                <p className="text-xs text-muted-foreground">Celkem pacientu</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary"><FiMessageSquare size={20} className="text-muted-foreground" /></div>
              <div>
                <p className="text-2xl font-semibold">{todaySessions.length}</p>
                <p className="text-xs text-muted-foreground">Dnesni konzultace</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary"><FiActivity size={20} className="text-muted-foreground" /></div>
              <div>
                <p className="text-2xl font-semibold">{sessions.length}</p>
                <p className="text-xs text-muted-foreground">Celkem konzultaci</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary"><FiBookOpen size={20} className="text-muted-foreground" /></div>
              <div>
                <p className="text-2xl font-semibold">{totalCitations}</p>
                <p className="text-xs text-muted-foreground">Citaci celkem</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient list */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Pacienti</CardTitle>
                <div className="relative w-64">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                  <Input placeholder="Hledat pacienta..." className="pl-9 h-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading && !showSample ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FiUsers size={32} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Zadni pacienti nenalezeni</p>
                  <p className="text-xs mt-1">Vytvorte noveho pacienta pomoci tlacitka vyse</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map((p) => (
                    <div key={p._id} className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-secondary transition-colors">
                      <button
                        onClick={() => { if (!showSample) onSelectPatient(p._id) }}
                        className="flex-1 text-left"
                      >
                        <p className="text-sm font-medium">{p?.display_name || p?.patient_hash || 'Bez jmena'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {p?.createdAt ? new Date(p.createdAt).toLocaleDateString('cs-CZ') : ''}
                        </p>
                      </button>
                      {!showSample && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); setGdprAction({ type: 'export', id: p._id, name: p?.display_name ?? p._id.slice(0, 8) }) }}
                            className="p-1.5 rounded-md hover:bg-blue-100 text-muted-foreground hover:text-blue-700 transition-colors"
                            title="Exportovat data (GDPR)"
                          >
                            <FiDownload size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setGdprAction({ type: 'delete', id: p._id, name: p?.display_name ?? p._id.slice(0, 8) }) }}
                            className="p-1.5 rounded-md hover:bg-red-100 text-muted-foreground hover:text-red-700 transition-colors"
                            title="Smazat data (GDPR)"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      )}
                      <FiChevronRight size={16} className="text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent consultations */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FiClock size={16} />
                Posledni konzultace
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FiMessageSquare size={24} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs">Zatim zadne konzultace</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sessions.slice(0, 8).map((s, i) => (
                    <div key={i} className="p-2.5 rounded-lg border border-border hover:bg-secondary transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium truncate flex-1">{s?.query?.slice(0, 60) ?? 'Dotaz'}{(s?.query?.length ?? 0) > 60 ? '...' : ''}</p>
                        {urgencyBadge(s?.urgency)}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-muted-foreground">{getPatientName(s?.patient_id)}</span>
                        <span className="text-[10px] text-muted-foreground">|</span>
                        <Badge variant="outline" className="text-[9px] py-0">{s?.consult_mode === 'deep' ? 'Deep' : 'Quick'}</Badge>
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {s?.timestamp ? new Date(s.timestamp).toLocaleString('cs-CZ', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* GDPR result notice */}
      {gdprResult && (
        <div className="fixed bottom-4 right-4 z-50 bg-card border border-border rounded-xl shadow-lg p-4 max-w-sm">
          <div className="flex items-start gap-2">
            <FiShield size={16} className="text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm">{gdprResult}</p>
              <button onClick={() => setGdprResult(null)} className="text-xs text-muted-foreground hover:text-foreground mt-2">Zavrit</button>
            </div>
          </div>
        </div>
      )}

      {/* GDPR confirmation dialog */}
      <Dialog open={!!gdprAction} onOpenChange={(open) => { if (!open) setGdprAction(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {gdprAction?.type === 'export' ? 'Export dat pacienta (GDPR)' : 'Smazat data pacienta (GDPR)'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {gdprAction?.type === 'export' ? (
              <div>
                <p className="text-sm">Exportovat vsechna data pacienta <strong>{gdprAction.name}</strong> ve formatu JSON (FHIR HL7 CZ Core)?</p>
                <p className="text-xs text-muted-foreground mt-2">Zahrnuje: diagnozy, medikace, alergie, observace, navstevy a historii konzultaci. Pravo na prenositelnost udaju (cl. 20 GDPR).</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-destructive font-medium">Trvale smazat vsechna data pacienta <strong>{gdprAction?.name}</strong>?</p>
                <p className="text-xs text-muted-foreground mt-2">Bude smazano: diagnozy, medikace, alergie, observace, navstevy, historie konzultaci. Audit logy budou anonymizovany. Tuto akci nelze vzit zpet. Pravo byt zapomenut (cl. 17 GDPR).</p>
              </div>
            )}
            <div className="flex gap-2">
              {gdprAction?.type === 'export' ? (
                <Button onClick={() => gdprAction && handleGdprExport(gdprAction.id)} disabled={gdprLoading} className="flex-1">
                  <FiDownload size={14} className="mr-1" /> {gdprLoading ? 'Exportuji...' : 'Exportovat'}
                </Button>
              ) : (
                <Button onClick={() => gdprAction && handleGdprDelete(gdprAction.id)} disabled={gdprLoading} variant="destructive" className="flex-1">
                  <FiTrash2 size={14} className="mr-1" /> {gdprLoading ? 'Mazani...' : 'Smazat trvale'}
                </Button>
              )}
              <Button variant="outline" onClick={() => setGdprAction(null)} disabled={gdprLoading}>Zrusit</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
