'use client'

import React, { useState } from 'react'
import { FiSearch, FiBookOpen, FiExternalLink } from 'react-icons/fi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { callAIAgent } from '@/lib/aiAgent'

const AGENT_ID = '69c1bbbe715110120e535d80'

interface Study {
  title?: string
  authors?: string
  journal?: string
  year?: string
  study_design?: string
  sample_size?: string
  key_findings?: string
  limitations?: string
  clinical_implications?: string
  pmid?: string
  doi?: string
}

interface LitResponse {
  topic?: string
  search_strategy?: string
  overall_summary?: string
  studies?: Study[]
  conflicting_evidence?: string
  total_studies_found?: string
}

const SAMPLE_RESULT: LitResponse = {
  topic: 'Lecba fibrilace sini u starsich pacientu',
  search_strategy: 'PubMed, Cochrane Library, 2020-2026',
  overall_summary: 'Aktualni evidence podporuje pouziti DOAC pred warfarinem u starsich pacientu s fibrilaci sini. Riziko krvaceni je nutne individualne zhodnotit.',
  studies: [
    { title: 'ELDERCARE-AF: Low-dose edoxaban in elderly patients with atrial fibrillation', authors: 'Okumura K, et al.', journal: 'N Engl J Med', year: '2020', study_design: 'RCT', sample_size: '984', key_findings: 'Nizka davka edoxabanu (15mg) snizila riziko iktu a systemove embolie u pacientu nad 80 let.', limitations: 'Pouze japonska populace.', clinical_implications: 'Zvazit nizkou davku DOAC u krehkych starsich pacientu.', pmid: '32865376', doi: '10.1056/NEJMoa2012883' },
    { title: 'Apixaban vs warfarin u pacientu nad 75 let: subanalyza ARISTOTLE', authors: 'Halvorsen S, et al.', journal: 'Eur Heart J', year: '2021', study_design: 'RCT subanalyza', sample_size: '5678', key_findings: 'Apixaban ukazal konzistentni benefit oproti warfarinu bez ohledu na vek.', limitations: 'Post-hoc analyza.', clinical_implications: 'Apixaban je bezpecna volba i u starsich pacientu.', pmid: '33245100', doi: '10.1093/eurheartj/ehab123' },
  ],
  conflicting_evidence: 'Nektera data naznacuji vyssi riziko GI krvaceni u dabigatranu ve srovnani s apixabanem u pacientu nad 80 let.',
  total_studies_found: '47',
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

function designBadgeColor(design?: string): string {
  const d = (design ?? '').toLowerCase()
  if (d.includes('sr') || d.includes('systematic') || d.includes('meta')) return 'bg-purple-100 text-purple-800'
  if (d.includes('rct') || d.includes('random')) return 'bg-green-100 text-green-800'
  if (d.includes('kohort') || d.includes('cohort')) return 'bg-blue-100 text-blue-800'
  return 'bg-gray-100 text-gray-700'
}

export default function LiteratureSearch() {
  const [topic, setTopic] = useState('')
  const [timeFilter, setTimeFilter] = useState('5')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<LitResponse | null>(null)
  const [showSample, setShowSample] = useState(false)
  const [error, setError] = useState('')
  const [activeAgent, setActiveAgent] = useState('')

  const displayResult = showSample ? SAMPLE_RESULT : result
  const studies = Array.isArray(displayResult?.studies) ? displayResult.studies : []

  const handleSearch = async () => {
    if (!topic.trim() || loading) return
    setLoading(true)
    setError('')
    setActiveAgent(AGENT_ID)

    try {
      const msg = `Vyhledej studie na tema: ${topic}. Casovy filtr: poslednich ${timeFilter} let.`
      const res = await callAIAgent(msg, AGENT_ID)

      if (res?.success) {
        const raw = res?.response?.result
        let parsed: LitResponse = {}
        if (typeof raw === 'string') {
          try { parsed = JSON.parse(raw) } catch { parsed = { overall_summary: raw } }
        } else if (raw && typeof raw === 'object') {
          parsed = raw as LitResponse
        }
        setResult(parsed)
      } else {
        setError(res?.error ?? 'Chyba pri vyhledavani')
      }
    } catch {
      setError('Sitova chyba')
    }
    setLoading(false)
    setActiveAgent('')
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Vyhledavani literatury</h1>
            <p className="text-sm text-muted-foreground mt-1">Prohledejte medicinske studie a evidence</p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="sample-lit" className="text-xs text-muted-foreground">Vzorova data</Label>
            <Switch id="sample-lit" checked={showSample} onCheckedChange={setShowSample} />
          </div>
        </div>

        {/* Search bar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1 block">Tema</Label>
                <Input placeholder="Napr. Lecba fibrilace sini u starsich pacientu..." value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }} />
              </div>
              <div className="w-40">
                <Label className="text-xs text-muted-foreground mb-1 block">Obdobi</Label>
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Posledni rok</SelectItem>
                    <SelectItem value="3">Posledni 3 roky</SelectItem>
                    <SelectItem value="5">Posledni 5 let</SelectItem>
                    <SelectItem value="10">Posledni 10 let</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSearch} disabled={loading || (!topic.trim() && !showSample)}>
                {loading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />Hledam...</span> : <span className="flex items-center gap-2"><FiSearch size={16} />Vyhledat</span>}
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{error}</div>}

        {/* Results */}
        {displayResult && (
          <div className="space-y-4">
            {displayResult?.overall_summary && (
              <Card>
                <CardHeader><CardTitle className="text-base">Celkove shrnutí</CardTitle></CardHeader>
                <CardContent>{renderMarkdown(displayResult.overall_summary)}</CardContent>
              </Card>
            )}

            {displayResult?.search_strategy && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FiBookOpen size={14} />
                <span>Strategie: {displayResult.search_strategy}</span>
                {displayResult?.total_studies_found && <Badge variant="outline" className="text-[10px]">{displayResult.total_studies_found} studii</Badge>}
              </div>
            )}

            {studies.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Studie ({studies.length})</h3>
                {studies.map((s, si) => (
                  <Card key={si}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h4 className="text-sm font-semibold flex-1">{s?.title ?? 'Bez nazvu'}</h4>
                        {s?.study_design && <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${designBadgeColor(s.study_design)}`}>{s.study_design}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{s?.authors ?? ''} {s?.journal ? `- ${s.journal}` : ''} {s?.year ? `(${s.year})` : ''}</p>
                      {s?.sample_size && <p className="text-xs mb-2"><span className="font-medium">Velikost vzorku:</span> {s.sample_size}</p>}
                      {s?.key_findings && <div className="mb-2"><p className="text-xs font-medium text-muted-foreground mb-0.5">Klicove nalezy:</p><p className="text-sm">{s.key_findings}</p></div>}
                      {s?.limitations && <div className="mb-2"><p className="text-xs font-medium text-muted-foreground mb-0.5">Omezeni:</p><p className="text-xs text-muted-foreground">{s.limitations}</p></div>}
                      {s?.clinical_implications && <div className="mb-2 bg-secondary rounded-lg p-2"><p className="text-xs font-medium mb-0.5">Klinicke implikace:</p><p className="text-xs">{s.clinical_implications}</p></div>}
                      <div className="flex gap-3 mt-2">
                        {s?.pmid && <a href={`https://pubmed.ncbi.nlm.nih.gov/${s.pmid}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1"><FiExternalLink size={10} />PMID: {s.pmid}</a>}
                        {s?.doi && <a href={`https://doi.org/${s.doi}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1"><FiExternalLink size={10} />DOI</a>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {displayResult?.conflicting_evidence && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="pt-4">
                  <p className="text-xs font-medium text-orange-800 mb-1">Konfliktni evidence:</p>
                  <p className="text-sm text-orange-700">{displayResult.conflicting_evidence}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {!displayResult && !loading && (
          <div className="text-center py-16 text-muted-foreground">
            <FiSearch size={40} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm">Zadejte tema pro vyhledavani</p>
            <p className="text-xs mt-1">Prohledame PubMed a dalsi databaze</p>
          </div>
        )}

        {activeAgent && (
          <div className="mt-6 p-3 rounded-lg bg-secondary">
            <p className="text-xs text-muted-foreground">Aktivni agent: Literature Research Agent</p>
            <div className="w-full h-1 bg-muted rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse w-2/3" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
