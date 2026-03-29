'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
import { AuthProvider, ProtectedRoute, LoginForm, RegisterForm, UserMenu } from 'lyzr-architect/client'
import { FiShield, FiUser, FiSearch } from 'react-icons/fi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import Sidebar, { type ScreenType } from './sections/Sidebar'
import Dashboard from './sections/Dashboard'
import PatientConsultation from './sections/PatientConsultation'
import LiteratureSearch from './sections/LiteratureSearch'
import DrugSearch from './sections/DrugSearch'
import ClinicalTrialsSearch from './sections/ClinicalTrialsSearch'
import AdverseEventsSearch from './sections/AdverseEventsSearch'
import KnowledgeBaseExplorer from './sections/KnowledgeBaseExplorer'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Neco se pokazilo</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button onClick={() => this.setState({ hasError: false, error: '' })} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">Zkusit znovu</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-3">
            <span className="text-primary-foreground text-lg font-bold">CM</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Czech MedAI</h1>
          <p className="text-sm text-muted-foreground mt-1">Klinicky AI asistent</p>
        </div>
        {mode === 'login' ? (
          <LoginForm onSwitchToRegister={() => setMode('register')} />
        ) : (
          <RegisterForm onSwitchToLogin={() => setMode('login')} />
        )}
      </div>
    </div>
  )
}

function AdminPanel() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filterAction, setFilterAction] = useState('')

  useEffect(() => { loadLogs() }, [])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/audit-logs')
      const data = await res.json()
      if (data?.success && Array.isArray(data.data)) setLogs(data.data)
    } catch { /* ignore */ }
    setLoading(false)
  }

  const filtered = filterAction ? logs.filter((l: any) => (l?.action ?? '').includes(filterAction)) : logs

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <FiShield size={20} />
          <h1 className="text-2xl font-semibold tracking-tight">Administrace</h1>
        </div>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Audit log</CardTitle>
              <div className="relative w-48">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                <Input placeholder="Filtr akci..." className="pl-9 h-8 text-xs" value={filterAction} onChange={(e) => setFilterAction(e.target.value)} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}</div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Zadne zaznamy</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Cas</TableHead>
                    <TableHead className="text-xs">Akce</TableHead>
                    <TableHead className="text-xs">Typ</TableHead>
                    <TableHead className="text-xs">ID zdroje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 50).map((log: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{log?.createdAt ? new Date(log.createdAt).toLocaleString('cs-CZ') : '-'}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{log?.action ?? '-'}</Badge></TableCell>
                      <TableCell className="text-xs">{log?.resource_type ?? '-'}</TableCell>
                      <TableCell className="text-xs font-mono">{(log?.resource_id ?? '-').slice(0, 12)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function AppHeader() {
  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground text-xs font-bold">CM</span>
        </div>
        <span className="font-semibold text-sm tracking-tight hidden sm:inline">Czech MedAI</span>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="text-xs hidden sm:inline-flex">Klinicky asistent</Badge>
        <UserMenu />
      </div>
    </header>
  )
}

export default function Page() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ProtectedRoute unauthenticatedFallback={<AuthScreen />}>
          <AppContent />
        </ProtectedRoute>
      </AuthProvider>
    </ErrorBoundary>
  )
}

function AppContent() {
  const [screen, setScreen] = useState<ScreenType>('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [patients, setPatients] = useState<any[]>([])
  const [patientsLoading, setPatientsLoading] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)

  useEffect(() => { loadPatients() }, [])

  const loadPatients = async () => {
    setPatientsLoading(true)
    try {
      const res = await fetch('/api/patients')
      const data = await res.json()
      if (data?.success && Array.isArray(data.data)) setPatients(data.data)
    } catch { /* ignore */ }
    setPatientsLoading(false)
  }

  const handleSelectPatient = (id: string) => {
    setSelectedPatientId(id)
    setScreen('consultation')
  }

  return (
    <div className="min-h-screen gradient-bg text-foreground flex flex-col">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentScreen={screen}
          onNavigate={(s) => { setScreen(s); if (s !== 'consultation') setSelectedPatientId(null) }}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        {screen === 'dashboard' && (
          <Dashboard patients={patients} onSelectPatient={handleSelectPatient} onRefreshPatients={loadPatients} loading={patientsLoading} />
        )}
        {screen === 'consultation' && selectedPatientId && (
          <PatientConsultation patientId={selectedPatientId} onBack={() => { setScreen('dashboard'); setSelectedPatientId(null) }} />
        )}
        {screen === 'consultation' && !selectedPatientId && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <FiUser size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Vyberte pacienta z dashboardu</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setScreen('dashboard')}>Prejit na dashboard</Button>
            </div>
          </div>
        )}
        {screen === 'literature' && <LiteratureSearch />}
        {screen === 'drugs' && <DrugSearch />}
        {screen === 'trials' && <ClinicalTrialsSearch />}
        {screen === 'adverse' && <AdverseEventsSearch />}
        {screen === 'knowledge-base' && <KnowledgeBaseExplorer />}
        {screen === 'admin' && <AdminPanel />}
      </div>
    </div>
  )
}
