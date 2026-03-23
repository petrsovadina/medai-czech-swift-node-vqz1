'use client'

import React, { useState } from 'react'
import { FiSearch, FiExternalLink, FiMapPin, FiUsers, FiCalendar, FiAlertCircle } from 'react-icons/fi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useClinicalTrials, type ClinicalTrial } from '@/lib/biomedicalApi'

const STATUS_OPTIONS = [
  { value: '', label: 'Vsechny stavy' },
  { value: 'RECRUITING', label: 'Nabira pacientov' },
  { value: 'ACTIVE_NOT_RECRUITING', label: 'Aktivni (nenabira)' },
  { value: 'COMPLETED', label: 'Dokonceno' },
  { value: 'NOT_YET_RECRUITING', label: 'Zatim nenabira' },
  { value: 'SUSPENDED', label: 'Pozastaveno' },
  { value: 'TERMINATED', label: 'Ukonceno' },
  { value: 'WITHDRAWN', label: 'Stazeno' },
]

function statusBadgeClass(status?: string): string {
  const s = (status ?? '').toUpperCase()
  if (s.includes('RECRUIT') && !s.includes('NOT')) return 'bg-green-100 text-green-800 border-green-200'
  if (s.includes('COMPLETED')) return 'bg-blue-100 text-blue-800 border-blue-200'
  if (s.includes('ACTIVE')) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  if (s.includes('SUSPEND') || s.includes('TERMINAT') || s.includes('WITHDRAWN')) return 'bg-red-100 text-red-800 border-red-200'
  return 'bg-gray-100 text-gray-700 border-gray-200'
}

function phaseBadgeClass(phase?: string): string {
  const p = (phase ?? '').toLowerCase()
  if (p.includes('4')) return 'bg-purple-100 text-purple-800'
  if (p.includes('3')) return 'bg-indigo-100 text-indigo-800'
  if (p.includes('2')) return 'bg-blue-100 text-blue-800'
  if (p.includes('1')) return 'bg-teal-100 text-teal-800'
  return 'bg-gray-100 text-gray-700'
}

const SAMPLE_TRIALS: ClinicalTrial[] = [
  {
    nctId: 'NCT05123456', title: 'Randomizovana studie ucinnosti noveho inhibitoru SGLT2 u pacientu s diabetem 2. typu', status: 'RECRUITING',
    phase: 'Phase 3', conditions: ['Diabetes mellitus 2. typu', 'Diabeticka nefropatie'], interventions: ['SGLT2 inhibitor XYZ 10mg', 'Placebo'],
    sponsor: 'Univerzita Karlova', startDate: '2025-03-01', completionDate: '2027-06-30', enrollment: 450,
    locations: ['Praha - VFN', 'Brno - FN u sv. Anny', 'Olomouc - FN'], url: 'https://clinicaltrials.gov/study/NCT05123456',
  },
  {
    nctId: 'NCT05234567', title: 'Vliv telemediciny na adherenci k lecbe u pacientu s hypertenze', status: 'ACTIVE_NOT_RECRUITING',
    phase: 'Phase 4', conditions: ['Arterialni hypertenze'], interventions: ['Telemedicinski program', 'Standardni pece'],
    sponsor: 'IKEM Praha', startDate: '2024-01-15', completionDate: '2026-01-15', enrollment: 200,
    locations: ['Praha - IKEM'], url: 'https://clinicaltrials.gov/study/NCT05234567',
  },
  {
    nctId: 'NCT05345678', title: 'Hodnoceni bezpecnosti biologicke lecby u revmatoidni artritidy', status: 'COMPLETED',
    phase: 'Phase 2', conditions: ['Revmatoidni artritida'], interventions: ['Biologicky lek ABC', 'Methotrexat'],
    sponsor: 'Revmatologicky ustav', startDate: '2022-06-01', completionDate: '2024-12-01', enrollment: 120,
    locations: ['Praha - Revmatologicky ustav', 'Plzen - FN'], url: 'https://clinicaltrials.gov/study/NCT05345678',
  },
]

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="h-4 bg-muted rounded animate-pulse w-1/4" />
        <div className="h-5 bg-muted rounded animate-pulse w-3/4" />
        <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
        <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
      </CardContent>
    </Card>
  )
}

export default function ClinicalTrialsSearch() {
  const [queryText, setQueryText] = useState('')
  const [condition, setCondition] = useState('')
  const [intervention, setIntervention] = useState('')
  const [statusFilter, setStatusFilter] = useState('__all__')
  const [showSample, setShowSample] = useState(false)

  const { trials, totalCount, loading, error, search } = useClinicalTrials()

  const displayTrials = showSample ? SAMPLE_TRIALS : trials
  const displayTotal = showSample ? SAMPLE_TRIALS.length : totalCount

  const handleSearch = async () => {
    if (loading) return
    if (!queryText.trim() && !condition.trim() && !intervention.trim()) return
    await search({
      query: queryText.trim() || undefined,
      condition: condition.trim() || undefined,
      intervention: intervention.trim() || undefined,
      status: (statusFilter && statusFilter !== '__all__') ? statusFilter : undefined,
      pageSize: 20,
    })
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <FiSearch size={24} />
              Klinicke studie
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Vyhledavani v registru ClinicalTrials.gov</p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="sample-ct" className="text-xs text-muted-foreground">Vzorova data</Label>
            <Switch id="sample-ct" checked={showSample} onCheckedChange={setShowSample} />
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1 block">Hledany vyraz</Label>
                <Input placeholder="Napr. diabetes, onkologie, kardiovaskulrni..." value={queryText} onChange={(e) => setQueryText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }} />
              </div>
              <Button onClick={handleSearch} disabled={loading || (!queryText.trim() && !condition.trim() && !intervention.trim() && !showSample)}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Hledam...
                  </span>
                ) : (
                  <span className="flex items-center gap-2"><FiSearch size={16} />Vyhledat studie</span>
                )}
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Onemocneni</Label>
                <Input placeholder="Napr. hypertenze" value={condition} onChange={(e) => setCondition(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Intervence</Label>
                <Input placeholder="Napr. metformin" value={intervention} onChange={(e) => setIntervention(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Stav studie</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Vsechny stavy" /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value || '__all__'}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex items-center gap-2">
            <FiAlertCircle size={16} />
            Chyba pri vyhledavani: {error}
          </div>
        )}

        {loading && !showSample && (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {displayTrials.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Celkem: {displayTotal} studii</p>
            {displayTrials.map((trial: ClinicalTrial, idx: number) => (
              <Card key={trial?.nctId ?? idx} className="transition-shadow hover:shadow-md">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <Badge variant="outline" className="text-[10px] shrink-0 font-mono">{trial?.nctId ?? '-'}</Badge>
                    <div className="flex gap-1 shrink-0">
                      {trial?.status && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusBadgeClass(trial.status)}`}>
                          {STATUS_OPTIONS.find((o) => o.value === trial.status)?.label ?? trial.status}
                        </span>
                      )}
                      {trial?.phase && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${phaseBadgeClass(trial.phase)}`}>{trial.phase}</span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold mb-2">{trial?.title ?? 'Bez nazvu'}</h3>

                  {Array.isArray(trial?.conditions) && trial.conditions.length > 0 && (
                    <div className="mb-2">
                      <span className="text-xs font-medium text-muted-foreground">Onemocneni: </span>
                      <span className="text-xs">{trial.conditions.join(', ')}</span>
                    </div>
                  )}

                  {Array.isArray(trial?.interventions) && trial.interventions.length > 0 && (
                    <div className="mb-2">
                      <span className="text-xs font-medium text-muted-foreground">Intervence: </span>
                      <span className="text-xs">{trial.interventions.join(', ')}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                    {trial?.sponsor && (
                      <span className="flex items-center gap-1"><FiUsers size={12} /> {trial.sponsor}</span>
                    )}
                    {(trial?.enrollment != null) && (
                      <span className="flex items-center gap-1"><FiUsers size={12} /> {trial.enrollment} ucastniku</span>
                    )}
                    {trial?.startDate && (
                      <span className="flex items-center gap-1"><FiCalendar size={12} /> Zahajeni: {trial.startDate}</span>
                    )}
                    {trial?.completionDate && (
                      <span className="flex items-center gap-1"><FiCalendar size={12} /> Ukonceni: {trial.completionDate}</span>
                    )}
                  </div>

                  {Array.isArray(trial?.locations) && trial.locations.length > 0 && (
                    <div className="mt-2 flex items-start gap-1">
                      <FiMapPin size={12} className="text-muted-foreground mt-0.5 shrink-0" />
                      <span className="text-xs text-muted-foreground">{trial.locations.join(' | ')}</span>
                    </div>
                  )}

                  {trial?.url && (
                    <a href={trial.url} target="_blank" rel="noopener noreferrer" className="mt-2 text-xs text-blue-600 hover:underline flex items-center gap-1 inline-flex">
                      <FiExternalLink size={12} /> Zobrazit na ClinicalTrials.gov
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && displayTrials.length === 0 && !error && (
          <div className="text-center py-16 text-muted-foreground">
            <FiSearch size={40} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm">Zadejte hledany vyraz pro vyhledavani studii</p>
            <p className="text-xs mt-1">Prohledame registr ClinicalTrials.gov</p>
          </div>
        )}
      </div>
    </div>
  )
}
