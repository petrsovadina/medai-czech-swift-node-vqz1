'use client'

import React, { useState } from 'react'
import { FiSearch, FiAlertCircle, FiAlertTriangle, FiUser, FiChevronDown, FiChevronRight, FiFileText } from 'react-icons/fi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAdverseEvents, getDrugLabels, type AdverseEvent } from '@/lib/biomedicalApi'

const SAMPLE_EVENTS: AdverseEvent[] = [
  {
    reportId: 'CZ-2025-001234', receiveDate: '2025-11-15', serious: true,
    seriousReasons: ['Hospitalizace', 'Ohrozeni zivota'],
    patientAge: '67', patientSex: 'Zena',
    drugs: [
      { name: 'Warfarin', indication: 'Fibrilace sini', role: 'Suspect' },
      { name: 'Amiodarone', indication: 'Arytmie', role: 'Concomitant' },
    ],
    reactions: ['Gastrointestinalni krvaceni', 'Anemie', 'Hypotenze'],
    outcome: 'Uzdraveni',
  },
  {
    reportId: 'CZ-2025-001235', receiveDate: '2025-10-22', serious: false,
    seriousReasons: [],
    patientAge: '45', patientSex: 'Muz',
    drugs: [
      { name: 'Warfarin', indication: 'Hluboka zilni tromobza', role: 'Suspect' },
    ],
    reactions: ['Modrina', 'Krvaceni z nosu'],
    outcome: 'Uzdraveni bez nasledku',
  },
  {
    reportId: 'CZ-2025-001236', receiveDate: '2025-09-05', serious: true,
    seriousReasons: ['Umrti'],
    patientAge: '82', patientSex: 'Muz',
    drugs: [
      { name: 'Warfarin', indication: 'Chlopnova nahraza', role: 'Suspect' },
      { name: 'Aspirin', indication: 'Prevence', role: 'Interacting' },
    ],
    reactions: ['Intrakranialni krvaceni', 'Koma'],
    outcome: 'Umrti',
  },
]

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
        <div className="h-5 bg-muted rounded animate-pulse w-2/3" />
        <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
      </CardContent>
    </Card>
  )
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-1.5">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{line.slice(2)}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{line}</p>
      })}
    </div>
  )
}

export default function AdverseEventsSearch() {
  const [drugName, setDrugName] = useState('')
  const [showSample, setShowSample] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'events' | 'labels'>('events')
  const [labels, setLabels] = useState<any[]>([])
  const [labelsLoading, setLabelsLoading] = useState(false)
  const [labelsError, setLabelsError] = useState<string | null>(null)

  const { events, total, loading, error, search } = useAdverseEvents()

  const displayEvents = showSample ? SAMPLE_EVENTS : events
  const displayTotal = showSample ? 3 : total

  const seriousCount = displayEvents.filter((e) => e?.serious).length
  const deathCount = displayEvents.filter((e) => Array.isArray(e?.seriousReasons) && e.seriousReasons.some((r) => (r ?? '').toLowerCase().includes('smrt') || (r ?? '').toLowerCase().includes('death') || (r ?? '').toLowerCase().includes('umrti'))).length

  const handleSearch = async () => {
    if (!drugName.trim() || loading) return
    await search(drugName.trim())
  }

  const handleSearchLabels = async () => {
    if (!drugName.trim()) return
    setLabelsLoading(true)
    setLabelsError(null)
    try {
      const data = await getDrugLabels(drugName.trim())
      setLabels(Array.isArray(data) ? data : [])
    } catch (e: any) {
      setLabelsError(e?.message ?? 'Chyba pri nacitani stitku')
    }
    setLabelsLoading(false)
  }

  const handleTabChange = (tab: 'events' | 'labels') => {
    setActiveTab(tab)
    if (tab === 'labels' && labels.length === 0 && drugName.trim()) {
      handleSearchLabels()
    }
  }

  function roleColor(role?: string): string {
    const r = (role ?? '').toLowerCase()
    if (r.includes('suspect') || r.includes('podezr')) return 'bg-red-100 text-red-800'
    if (r.includes('interact')) return 'bg-orange-100 text-orange-800'
    return 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <FiAlertTriangle size={24} />
              Nezadouci ucinky
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Hlaseni nezadoucich ucinku leku (OpenFDA)</p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="sample-ae" className="text-xs text-muted-foreground">Vzorova data</Label>
            <Switch id="sample-ae" checked={showSample} onCheckedChange={setShowSample} />
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1 block">Nazev leku (anglicky)</Label>
                <Input
                  placeholder="Napr. Warfarin, Metformin, Ibuprofen..."
                  value={drugName}
                  onChange={(e) => setDrugName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
                />
              </div>
              <Button onClick={handleSearch} disabled={loading || (!drugName.trim() && !showSample)}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Hledam...
                  </span>
                ) : (
                  <span className="flex items-center gap-2"><FiSearch size={16} />Vyhledat nezadouci ucinky</span>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex items-center gap-2">
            <FiAlertCircle size={16} />
            Chyba pri vyhledavani: {error}
          </div>
        )}

        {(displayEvents.length > 0 || (activeTab === 'labels' && labels.length > 0)) && (
          <>
            {/* Tab switcher */}
            <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5 mb-4 w-fit">
              <button onClick={() => handleTabChange('events')} className={`px-4 py-1.5 text-xs rounded-md transition-colors ${activeTab === 'events' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}>
                Nezadouci ucinky
              </button>
              <button onClick={() => handleTabChange('labels')} className={`px-4 py-1.5 text-xs rounded-md transition-colors ${activeTab === 'labels' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}>
                Lekove informace
              </button>
            </div>

            {activeTab === 'events' && (
              <>
                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <Card>
                    <CardContent className="pt-4 pb-4 text-center">
                      <p className="text-2xl font-bold">{displayTotal}</p>
                      <p className="text-xs text-muted-foreground">Celkem hlaseni</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-4 text-center">
                      <p className="text-2xl font-bold text-orange-600">{seriousCount}</p>
                      <p className="text-xs text-muted-foreground">Zavaznych</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-4 text-center">
                      <p className="text-2xl font-bold text-red-600">{deathCount}</p>
                      <p className="text-xs text-muted-foreground">Umrti</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Event cards */}
                <div className="space-y-3">
                  {displayEvents.map((event, idx) => {
                    const id = event?.reportId ?? `event-${idx}`
                    const isExpanded = expandedId === id
                    return (
                      <Card key={id} className="transition-shadow hover:shadow-md">
                        <CardContent className="pt-4">
                          <div className="cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : id)}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] font-mono">{event?.reportId ?? '-'}</Badge>
                                <span className="text-xs text-muted-foreground">{event?.receiveDate ?? ''}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {event?.serious && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium bg-red-100 text-red-800 border-red-200">
                                    Zavazne
                                  </span>
                                )}
                                {isExpanded ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-1 mb-2">
                              {Array.isArray(event?.reactions) && event.reactions.map((r, ri) => (
                                <Badge key={ri} variant="secondary" className="text-[10px]">{r}</Badge>
                              ))}
                            </div>

                            <div className="flex gap-3 text-xs text-muted-foreground">
                              {event?.patientAge && <span className="flex items-center gap-1"><FiUser size={12} /> Vek: {event.patientAge}</span>}
                              {event?.patientSex && <span>Pohlavi: {event.patientSex}</span>}
                              {event?.outcome && <span>Vysledek: {event.outcome}</span>}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-border space-y-3">
                              {event?.serious && Array.isArray(event?.seriousReasons) && event.seriousReasons.length > 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                                  <p className="text-xs font-medium text-red-800 mb-1">Duvody zavaznosti:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {event.seriousReasons.map((r, ri) => (
                                      <Badge key={ri} variant="destructive" className="text-[10px]">{r}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {Array.isArray(event?.drugs) && event.drugs.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Leky:</p>
                                  <div className="space-y-1">
                                    {event.drugs.map((d, di) => (
                                      <div key={di} className="flex items-center gap-2 text-xs">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${roleColor(d?.role)}`}>{d?.role ?? '-'}</span>
                                        <span className="font-medium">{d?.name ?? '-'}</span>
                                        {d?.indication && <span className="text-muted-foreground">({d.indication})</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {Array.isArray(event?.reactions) && event.reactions.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Reakce (MedDRA):</p>
                                  <div className="flex flex-wrap gap-1">
                                    {event.reactions.map((r, ri) => (
                                      <Badge key={ri} variant="outline" className="text-[10px]">{r}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </>
            )}

            {activeTab === 'labels' && (
              <div className="space-y-4">
                {labelsLoading && (
                  <div className="space-y-3">
                    <SkeletonCard />
                    <SkeletonCard />
                  </div>
                )}
                {labelsError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex items-center gap-2">
                    <FiAlertCircle size={16} />
                    {labelsError}
                  </div>
                )}
                {!labelsLoading && labels.length === 0 && !labelsError && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FiFileText size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Zadne lekove informace nalezeny</p>
                  </div>
                )}
                {labels.map((lbl: any, li: number) => (
                  <Card key={li}>
                    <CardContent className="pt-4 space-y-3">
                      {lbl?.brand_name && <h3 className="text-sm font-semibold">{Array.isArray(lbl.brand_name) ? lbl.brand_name.join(', ') : lbl.brand_name}</h3>}
                      {lbl?.indications_and_usage && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Indikace:</p>
                          {renderMarkdown(Array.isArray(lbl.indications_and_usage) ? lbl.indications_and_usage.join('\n') : String(lbl.indications_and_usage ?? ''))}
                        </div>
                      )}
                      {lbl?.warnings && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <p className="text-xs font-medium text-orange-800 mb-1">Varovani:</p>
                          {renderMarkdown(Array.isArray(lbl.warnings) ? lbl.warnings.join('\n') : String(lbl.warnings ?? ''))}
                        </div>
                      )}
                      {lbl?.drug_interactions && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Lekove interakce:</p>
                          {renderMarkdown(Array.isArray(lbl.drug_interactions) ? lbl.drug_interactions.join('\n') : String(lbl.drug_interactions ?? ''))}
                        </div>
                      )}
                      {lbl?.contraindications && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-xs font-medium text-red-800 mb-1">Kontraindikace:</p>
                          {renderMarkdown(Array.isArray(lbl.contraindications) ? lbl.contraindications.join('\n') : String(lbl.contraindications ?? ''))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {loading && !showSample && activeTab === 'events' && (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {!loading && displayEvents.length === 0 && !error && activeTab === 'events' && (
          <div className="text-center py-16 text-muted-foreground">
            <FiAlertTriangle size={40} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm">Zadejte nazev leku pro vyhledani nezadoucich ucinku</p>
            <p className="text-xs mt-1">Prohledame databazi FDA (OpenFDA)</p>
          </div>
        )}
      </div>
    </div>
  )
}
