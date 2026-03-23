'use client'

import React from 'react'
import { FiHome, FiMessageSquare, FiSearch, FiShield, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { Button } from '@/components/ui/button'

export type ScreenType = 'dashboard' | 'consultation' | 'literature' | 'admin'

interface SidebarProps {
  currentScreen: ScreenType
  onNavigate: (screen: ScreenType) => void
  collapsed: boolean
  onToggle: () => void
}

const NAV_ITEMS: { id: ScreenType; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <FiHome size={20} /> },
  { id: 'consultation', label: 'Konzultace', icon: <FiMessageSquare size={20} /> },
  { id: 'literature', label: 'Literatura', icon: <FiSearch size={20} /> },
  { id: 'admin', label: 'Administrace', icon: <FiShield size={20} /> },
]

export default function Sidebar({ currentScreen, onNavigate, collapsed, onToggle }: SidebarProps) {
  return (
    <div className={`flex flex-col border-r border-border bg-card h-full transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`}>
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-semibold">CM</span>
            </div>
            <span className="font-semibold text-sm tracking-tight">Czech MedAI</span>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={onToggle} className="p-1 h-8 w-8">
          {collapsed ? <FiChevronRight size={16} /> : <FiChevronLeft size={16} />}
        </Button>
      </div>
      <nav className="flex-1 py-3 px-2 space-y-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${currentScreen === item.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-border">
        {!collapsed && (
          <div className="text-xs text-muted-foreground text-center">
            v1.0 Clinical AI
          </div>
        )}
      </div>
    </div>
  )
}
