'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { FiDatabase, FiSearch, FiBookOpen, FiTag, FiArrowLeft, FiExternalLink, FiInfo, FiAlertCircle, FiChevronRight, FiFilter, FiGrid } from 'react-icons/fi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  useKnowledgeBase,
  DOMAIN_LABELS,
  TYPE_LABELS,
  TYPE_COLORS,
  DOMAIN_COLORS,
  type KnowledgeUnit,
} from '@/lib/knowledgeBase'

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="h-5 bg-muted rounded animate-pulse w-2/3" />
        <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
        <div className="h-4 bg-muted rounded animate-pulse w-full" />
        <div className="h-3 bg-muted rounded animate-pulse w-1/3" />
      </CardContent>
    </Card>
  )
}

function formatContentKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

function renderContentValue(value: unknown, depth: number = 0): React.ReactNode {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    return <p className="text-sm text-foreground/80 whitespace-pre-wrap">{value}</p>
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return <p className="text-sm text-foreground/80">{String(value)}</p>
  }
  if (Array.isArray(value)) {
    return (
      <ul className="list-disc list-inside space-y-1 ml-2">
        {value.map((item, i) => (
          <li key={i} className="text-sm text-foreground/80">
            {typeof item === 'object' && item !== null ? (
              <div className="ml-2 mt-1">{renderContentValue(item, depth + 1)}</div>
            ) : (
              String(item)
            )}
          </li>
        ))}
      </ul>
    )
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    return (
      <div className={`space-y-2 ${depth > 0 ? 'ml-3 pl-3 border-l-2 border-border' : ''}`}>
        {entries.map(([k, v]) => (
          <div key={k}>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{formatContentKey(k)}</span>
            <div className="mt-0.5">{renderContentValue(v, depth + 1)}</div>
          </div>
        ))}
      </div>
    )
  }
  return <p className="text-sm">{String(value)}</p>
}

const DOMAIN_ICONS: Record<string, React.ReactNode> = {
  uhrady: <FiDatabase size={16} />,
  provoz: <FiGrid size={16} />,
  compliance: <FiFilter size={16} />,
  'financni-rizika': <FiAlertCircle size={16} />,
  legislativa: <FiBookOpen size={16} />,
}

export default function KnowledgeBaseExplorer() {
  const {
    results,
    stats,
    loading,
    error,
    selectedUnit,
    relatedUnits,
    loadStats,
    search,
    selectUnit,
    clearSelection,
  } = useKnowledgeBase()

  const [query, setQuery] = useState('')
  const [domainFilter, setDomainFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [initialLoaded, setInitialLoaded] = useState(false)

  useEffect(() => {
    loadStats()
    search({ limit: 50 }).then(() => setInitialLoaded(true))
  }, [loadStats, search])

  const handleSearch = useCallback(() => {
    const params: Record<string, string | number> = { limit: 50 }
    if (query.trim()) params.q = query.trim()
    if (domainFilter) params.domain = domainFilter
    if (typeFilter) params.type = typeFilter
    search(params)
  }, [query, domainFilter, typeFilter, search])

  const handleDomainClick = useCallback((domain: string) => {
    setDomainFilter(domain)
    setQuery('')
    setTypeFilter('')
    search({ domain, limit: 50 })
  }, [search])

  const handleBack = useCallback(() => {
    clearSelection()
  }, [clearSelection])

  const handleRelatedClick = useCallback((id: string) => {
    selectUnit(id)
  }, [selectUnit])

  // Detail view
  if (selectedUnit) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2 text-muted-foreground hover:text-foreground">
            <FiArrowLeft size={16} />
            Zpet na vysledky
          </Button>

          {loading ? (
            <div className="space-y-4">
              <div className="h-8 bg-muted rounded animate-pulse w-2/3" />
              <div className="h-4 bg-muted rounded animate-pulse w-full" />
              <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            </div>
          ) : (
            <>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight mb-3">{selectedUnit?.title ?? 'Bez nazvu'}</h1>
                <div className="flex flex-wrap gap-2">
                  <Badge className={`text-xs border ${TYPE_COLORS[selectedUnit?.type ?? ''] ?? 'bg-gray-100 text-gray-800'}`}>
                    {TYPE_LABELS[selectedUnit?.type ?? ''] ?? selectedUnit?.type ?? ''}
                  </Badge>
                  <Badge className={`text-xs border ${DOMAIN_COLORS[selectedUnit?.domain ?? ''] ?? 'bg-gray-100 text-gray-800'}`}>
                    {DOMAIN_LABELS[selectedUnit?.domain ?? ''] ?? selectedUnit?.domain ?? ''}
                  </Badge>
                  {selectedUnit?.version && (
                    <Badge variant="outline" className="text-xs">{selectedUnit.version}</Badge>
                  )}
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FiInfo size={16} />
                    Popis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground/80 leading-relaxed">{selectedUnit?.description ?? ''}</p>
                </CardContent>
              </Card>

              {selectedUnit?.content && typeof selectedUnit.content === 'object' && Object.keys(selectedUnit.content).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FiBookOpen size={16} />
                      Obsah
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(selectedUnit.content).map(([key, value]) => (
                      <div key={key} className="pb-3 border-b border-border last:border-0 last:pb-0">
                        <h4 className="text-sm font-semibold mb-1.5">{formatContentKey(key)}</h4>
                        {renderContentValue(value)}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {selectedUnit?.applicability && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Platnost a aplikovatelnost</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Array.isArray(selectedUnit.applicability?.specialties) && selectedUnit.applicability.specialties.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Specializace</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {selectedUnit.applicability.specialties.map((s, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-6 text-sm">
                      {selectedUnit.applicability?.valid_from && (
                        <div>
                          <span className="text-xs text-muted-foreground">Platne od:</span>
                          <p className="font-medium">{selectedUnit.applicability.valid_from}</p>
                        </div>
                      )}
                      {selectedUnit.applicability?.valid_to && (
                        <div>
                          <span className="text-xs text-muted-foreground">Platne do:</span>
                          <p className="font-medium">{selectedUnit.applicability.valid_to}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedUnit?.source && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Zdroj</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{selectedUnit.source?.name ?? ''}</span>
                      {selectedUnit.source?.url && (
                        <a href={selectedUnit.source.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                          <FiExternalLink size={14} />
                          Otevrit
                        </a>
                      )}
                    </div>
                    {selectedUnit.source?.retrieved_at && (
                      <p className="text-xs text-muted-foreground mt-1">Ziskano: {selectedUnit.source.retrieved_at}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {Array.isArray(selectedUnit?.tags) && selectedUnit.tags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FiTag size={16} />
                      Stitky
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedUnit.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {Array.isArray(relatedUnits) && relatedUnits.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Souvisejici jednotky</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {relatedUnits.map((ru) => (
                      <button
                        key={ru?.id ?? Math.random()}
                        onClick={() => handleRelatedClick(ru?.id ?? '')}
                        className="w-full text-left p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors flex items-center justify-between group"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{ru?.title ?? ''}</p>
                          <div className="flex gap-1.5 mt-1">
                            <Badge className={`text-[10px] border ${TYPE_COLORS[ru?.type ?? ''] ?? ''}`}>
                              {TYPE_LABELS[ru?.type ?? ''] ?? ru?.type ?? ''}
                            </Badge>
                            <Badge className={`text-[10px] border ${DOMAIN_COLORS[ru?.domain ?? ''] ?? ''}`}>
                              {DOMAIN_LABELS[ru?.domain ?? ''] ?? ru?.domain ?? ''}
                            </Badge>
                          </div>
                        </div>
                        <FiChevronRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0 ml-2" />
                      </button>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  // List view
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <FiDatabase size={22} />
          <h1 className="text-2xl font-semibold tracking-tight">Znalostni baze</h1>
        </div>

        {/* Stats Dashboard */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="bg-card/80 backdrop-blur border border-border/60">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Celkem jednotek</p>
              </CardContent>
            </Card>
            {Object.entries(DOMAIN_LABELS).map(([key, label]) => {
              const count = stats?.domains?.[key] ?? 0
              return (
                <Card
                  key={key}
                  className="bg-card/80 backdrop-blur border border-border/60 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleDomainClick(key)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="flex justify-center mb-1.5 text-muted-foreground">{DOMAIN_ICONS[key] ?? <FiDatabase size={16} />}</div>
                    <p className="text-xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
        {!stats && !error && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="h-8 bg-muted rounded animate-pulse mx-auto w-12 mb-2" />
                  <div className="h-3 bg-muted rounded animate-pulse mx-auto w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Search & Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  placeholder="Hledat v bazi znalosti..."
                  className="pl-10"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
                />
              </div>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value)}
              >
                <option value="">Vsechny domeny</option>
                {Object.entries(DOMAIN_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">Vsechny typy</option>
                {Object.entries(TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <Button onClick={handleSearch} className="gap-2">
                <FiSearch size={16} />
                Hledat
              </Button>
            </div>
            {(domainFilter || typeFilter || query) && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="text-xs text-muted-foreground">Aktivni filtry:</span>
                {query && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    Hledani: {query}
                    <button onClick={() => { setQuery(''); }} className="ml-1 hover:text-foreground">&times;</button>
                  </Badge>
                )}
                {domainFilter && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    {DOMAIN_LABELS[domainFilter] ?? domainFilter}
                    <button onClick={() => setDomainFilter('')} className="ml-1 hover:text-foreground">&times;</button>
                  </Badge>
                )}
                {typeFilter && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    {TYPE_LABELS[typeFilter] ?? typeFilter}
                    <button onClick={() => setTypeFilter('')} className="ml-1 hover:text-foreground">&times;</button>
                  </Badge>
                )}
                <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => { setQuery(''); setDomainFilter(''); setTypeFilter(''); search({ limit: 50 }) }}>
                  Zrusit vse
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Card className="border-destructive/50">
            <CardContent className="p-4 flex items-center gap-3 text-destructive">
              <FiAlertCircle size={20} />
              <div>
                <p className="text-sm font-medium">Chyba pri nacitani znalostni baze</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Nacitam...</p>
            {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && initialLoaded && Array.isArray(results) && results.length === 0 && (
          <div className="text-center py-16">
            <FiSearch size={40} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Zadne vysledky</p>
            <p className="text-xs text-muted-foreground mt-1">Zkuste upravit vyhledavaci dotaz nebo filtry</p>
          </div>
        )}

        {/* Results */}
        {!loading && Array.isArray(results) && results.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-3">{results.length} vysledku</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {results.map((unit) => (
                <Card
                  key={unit?.id ?? Math.random()}
                  className="cursor-pointer hover:shadow-md transition-shadow group"
                  onClick={() => { if (unit?.id) selectUnit(unit.id) }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-sm font-semibold leading-tight flex-1 group-hover:text-primary transition-colors line-clamp-2">{unit?.title ?? 'Bez nazvu'}</h3>
                      <FiChevronRight size={16} className="text-muted-foreground flex-shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <Badge className={`text-[10px] border ${TYPE_COLORS[unit?.type ?? ''] ?? 'bg-gray-100 text-gray-800'}`}>
                        {TYPE_LABELS[unit?.type ?? ''] ?? unit?.type ?? ''}
                      </Badge>
                      <Badge className={`text-[10px] border ${DOMAIN_COLORS[unit?.domain ?? ''] ?? 'bg-gray-100 text-gray-800'}`}>
                        {DOMAIN_LABELS[unit?.domain ?? ''] ?? unit?.domain ?? ''}
                      </Badge>
                      {unit?.version && (
                        <Badge variant="outline" className="text-[10px]">{unit.version}</Badge>
                      )}
                    </div>
                    {unit?.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{unit.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(unit?.tags) && unit.tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">{tag}</span>
                        ))}
                        {Array.isArray(unit?.tags) && unit.tags.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">+{unit.tags.length - 3}</span>
                        )}
                      </div>
                      {unit?.source?.name && (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{unit.source.name}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
