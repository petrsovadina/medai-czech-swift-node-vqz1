'use client'

import React, { useState } from 'react'
import { FiSearch, FiPackage, FiDollarSign, FiCheckCircle, FiExternalLink, FiInfo, FiAlertCircle, FiChevronDown, FiChevronRight, FiX } from 'react-icons/fi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useSuklSearch } from '@/lib/biomedicalApi'

const SAMPLE_RESULTS = [
  { name: 'IBUPROFEN AL 400', sukl_code: '0012345', active_ingredient: 'Ibuprofen', atc_code: 'M01AE01', form: 'Tableta', strength: '400 mg', holder: 'ALIUD PHARMA GmbH', registration_status: 'Registrovan' },
  { name: 'IBUPROFEN ZENTIVA 200 MG', sukl_code: '0012346', active_ingredient: 'Ibuprofen', atc_code: 'M01AE01', form: 'Potahovana tableta', strength: '200 mg', holder: 'Zentiva, k.s.', registration_status: 'Registrovan' },
  { name: 'IBALGIN 400', sukl_code: '0012347', active_ingredient: 'Ibuprofen', atc_code: 'M01AE01', form: 'Potahovana tableta', strength: '400 mg', holder: 'Sanofi, s.r.o.', registration_status: 'Registrovan' },
]

interface DrugDetail {
  [key: string]: any
}

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="h-5 bg-muted rounded animate-pulse w-2/3" />
        <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
        <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
      </CardContent>
    </Card>
  )
}

export default function DrugSearch() {
  const [query, setQuery] = useState('')
  const [showSample, setShowSample] = useState(false)
  const [expandedCode, setExpandedCode] = useState<string | null>(null)
  const [detailData, setDetailData] = useState<DrugDetail | null>(null)
  const [reimbursementData, setReimbursementData] = useState<any>(null)
  const [availabilityData, setAvailabilityData] = useState<any>(null)
  const [spcUrl, setSpcUrl] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [filterAtc, setFilterAtc] = useState('')
  const [filterIngredient, setFilterIngredient] = useState('')

  const { results, loading, error, searchMedicine, getMedicineDetails, getReimbursement, checkAvailability, getSpcContent } = useSuklSearch()

  const displayResults = showSample ? SAMPLE_RESULTS : results
  const filteredResults = displayResults.filter((r: any) => {
    if (filterAtc && !(r?.atc_code ?? '').toLowerCase().includes(filterAtc.toLowerCase())) return false
    if (filterIngredient && !(r?.active_ingredient ?? '').toLowerCase().includes(filterIngredient.toLowerCase())) return false
    return true
  })

  const handleSearch = async () => {
    if (!query.trim() || loading) return
    await searchMedicine(query.trim())
  }

  const handleExpand = async (item: any) => {
    const code = item?.sukl_code ?? ''
    if (expandedCode === code) {
      setExpandedCode(null)
      setDetailData(null)
      setReimbursementData(null)
      setAvailabilityData(null)
      setSpcUrl(null)
      return
    }
    setExpandedCode(code)
    setDetailData(null)
    setReimbursementData(null)
    setAvailabilityData(null)
    setSpcUrl(null)

    if (!code || showSample) return
    setDetailLoading(true)
    try {
      const [details, reimb, avail, spc] = await Promise.all([
        getMedicineDetails(code),
        getReimbursement(code),
        checkAvailability(code),
        getSpcContent(code),
      ])
      setDetailData(details)
      setReimbursementData(reimb)
      setAvailabilityData(avail)
      if (typeof spc === 'string' && spc.startsWith('http')) setSpcUrl(spc)
      else if (spc?.url) setSpcUrl(spc.url)
    } catch { /* handled by hook */ }
    setDetailLoading(false)
  }

  const renderDetailValue = (val: any): React.ReactNode => {
    if (val == null) return <span className="text-muted-foreground">-</span>
    if (typeof val === 'string') return <span className="text-sm">{val}</span>
    if (typeof val === 'number' || typeof val === 'boolean') return <span className="text-sm">{String(val)}</span>
    if (Array.isArray(val)) return <span className="text-sm">{val.join(', ')}</span>
    if (typeof val === 'object') return <pre className="text-xs bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(val, null, 2)}</pre>
    return <span className="text-sm">{String(val)}</span>
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <FiPackage size={24} />
              Lekovy vyhledavac
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Vyhledejte leky v databazi SUKL</p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="sample-drug" className="text-xs text-muted-foreground">Vzorova data</Label>
            <Switch id="sample-drug" checked={showSample} onCheckedChange={setShowSample} />
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1 block">Nazev leku nebo ucinne latky</Label>
                <Input
                  placeholder="Napr. Ibuprofen, Metformin, Warfarin..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
                />
              </div>
              <Button onClick={handleSearch} disabled={loading || (!query.trim() && !showSample)}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Hledam...
                  </span>
                ) : (
                  <span className="flex items-center gap-2"><FiSearch size={16} />Vyhledat lek</span>
                )}
              </Button>
            </div>
            {(displayResults.length > 0) && (
              <div className="flex gap-3 mt-4">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground mb-1 block">Filtr: ATC skupina</Label>
                  <Input placeholder="Napr. M01AE" value={filterAtc} onChange={(e) => setFilterAtc(e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground mb-1 block">Filtr: Ucinna latka</Label>
                  <Input placeholder="Napr. Ibuprofen" value={filterIngredient} onChange={(e) => setFilterIngredient(e.target.value)} className="h-8 text-xs" />
                </div>
              </div>
            )}
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

        {filteredResults.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{filteredResults.length} vysledku</p>
            {filteredResults.map((item: any, idx: number) => {
              const code = item?.sukl_code ?? `item-${idx}`
              const isExpanded = expandedCode === code
              return (
                <Card key={code} className="transition-shadow hover:shadow-md cursor-pointer">
                  <CardContent className="pt-4">
                    <div onClick={() => handleExpand(item)} className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold truncate">{item?.name ?? 'Neznamy lek'}</h3>
                          {item?.registration_status && (
                            <Badge variant="outline" className="text-[10px] shrink-0">{item.registration_status}</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {item?.active_ingredient && <span><strong>Ucinna latka:</strong> {item.active_ingredient}</span>}
                          {item?.atc_code && <span><strong>ATC:</strong> {item.atc_code}</span>}
                          {item?.form && <span><strong>Forma:</strong> {item.form}</span>}
                          {item?.strength && <span><strong>Sila:</strong> {item.strength}</span>}
                          {item?.holder && <span><strong>Drzitel:</strong> {item.holder}</span>}
                          {item?.sukl_code && <span><strong>SUKL:</strong> {item.sukl_code}</span>}
                        </div>
                      </div>
                      <div className="shrink-0 mt-1">
                        {isExpanded ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-border space-y-4">
                        {detailLoading && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                            Nacitam podrobnosti...
                          </div>
                        )}

                        {detailData && (
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><FiInfo size={12} /> Podrobnosti</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {Object.entries(detailData).filter(([k]) => !['content', 'raw'].includes(k)).slice(0, 12).map(([k, v]) => (
                                <div key={k} className="text-xs">
                                  <span className="font-medium text-muted-foreground">{k}: </span>
                                  {renderDetailValue(v)}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {reimbursementData && (
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><FiDollarSign size={12} /> Uhrada a cena</h4>
                            <div className="bg-secondary rounded-lg p-3">
                              {typeof reimbursementData === 'string' ? (
                                <p className="text-xs">{reimbursementData}</p>
                              ) : typeof reimbursementData === 'object' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {Object.entries(reimbursementData).filter(([k]) => !['content', 'raw'].includes(k)).slice(0, 8).map(([k, v]) => (
                                    <div key={k} className="text-xs">
                                      <span className="font-medium text-muted-foreground">{k}: </span>
                                      {renderDetailValue(v)}
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        )}

                        {availabilityData && (
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><FiCheckCircle size={12} /> Dostupnost</h4>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              {typeof availabilityData === 'string' ? (
                                <p className="text-xs text-green-800">{availabilityData}</p>
                              ) : typeof availabilityData === 'object' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {Object.entries(availabilityData).filter(([k]) => !['content', 'raw'].includes(k)).slice(0, 6).map(([k, v]) => (
                                    <div key={k} className="text-xs">
                                      <span className="font-medium text-green-700">{k}: </span>
                                      {renderDetailValue(v)}
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        )}

                        {spcUrl && (
                          <div>
                            <a href={spcUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                              <FiExternalLink size={12} /> Zobrazit SPC dokument
                            </a>
                          </div>
                        )}

                        {showSample && (
                          <div className="text-xs text-muted-foreground italic">Podrobnosti nejsou dostupne ve vzorovem rezimu.</div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {!loading && displayResults.length === 0 && !error && (
          <div className="text-center py-16 text-muted-foreground">
            <FiPackage size={40} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm">Zadejte nazev leku pro vyhledavani</p>
            <p className="text-xs mt-1">Prohledame databazi SUKL</p>
          </div>
        )}

        {!loading && displayResults.length > 0 && filteredResults.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FiAlertCircle size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Zadne vysledky odpovidaji filtru</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => { setFilterAtc(''); setFilterIngredient('') }}>
              <FiX size={14} className="mr-1" /> Zrusit filtry
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
