'use client'

import React, { useState, useEffect } from 'react'
import { FiPlus, FiSearch, FiActivity, FiUsers, FiChevronRight } from 'react-icons/fi'
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

export default function Dashboard({ patients, onSelectPatient, onRefreshPatients, loading }: DashboardProps) {
  const [search, setSearch] = useState('')
  const [showSample, setShowSample] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [newHash, setNewHash] = useState('')
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const displayPatients = showSample ? SAMPLE_PATIENTS : patients
  const filtered = displayPatients.filter((p) => {
    const name = p?.display_name ?? p?.patient_hash ?? ''
    return name.toLowerCase().includes(search.toLowerCase())
  })

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
              <div className="p-2 rounded-lg bg-secondary"><FiActivity size={20} className="text-muted-foreground" /></div>
              <div>
                <p className="text-2xl font-semibold">{showSample ? 5 : 0}</p>
                <p className="text-xs text-muted-foreground">Dnesni konzultace</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary"><FiSearch size={20} className="text-muted-foreground" /></div>
              <div>
                <p className="text-2xl font-semibold">{showSample ? 12 : 0}</p>
                <p className="text-xs text-muted-foreground">Hledani literatury</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                <button
                  key={p._id}
                  onClick={() => { if (!showSample) onSelectPatient(p._id) }}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium">{p?.display_name || p?.patient_hash || 'Bez jmena'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p?.createdAt ? new Date(p.createdAt).toLocaleDateString('cs-CZ') : ''}
                    </p>
                  </div>
                  <FiChevronRight size={16} className="text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
