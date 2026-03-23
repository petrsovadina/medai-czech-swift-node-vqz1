'use client';

import { useState, useCallback, useEffect } from 'react';

// Knowledge Unit types matching the klinicka-knowledge-base schema
export interface KnowledgeUnit {
  id: string;
  type: 'rule' | 'exception' | 'risk' | 'anti_pattern' | 'condition' | 'definition';
  domain: 'uhrady' | 'provoz' | 'compliance' | 'financni-rizika' | 'legislativa';
  title: string;
  description: string;
  version: string;
  source: {
    name: string;
    url: string;
    retrieved_at: string;
  };
  content: Record<string, any>;
  applicability: {
    specialties: string[];
    valid_from: string;
    valid_to?: string | null;
  };
  related_units?: string[];
  tags?: string[];
}

export interface KBStats {
  total: number;
  domains: Record<string, number>;
  types: Record<string, number>;
}

// Domain labels in Czech
export const DOMAIN_LABELS: Record<string, string> = {
  uhrady: 'Uhrady',
  provoz: 'Provoz',
  compliance: 'Compliance',
  'financni-rizika': 'Financni rizika',
  legislativa: 'Legislativa',
};

// Type labels in Czech
export const TYPE_LABELS: Record<string, string> = {
  rule: 'Pravidlo',
  exception: 'Vyjimka',
  risk: 'Riziko',
  anti_pattern: 'Anti-pattern',
  condition: 'Podminka',
  definition: 'Definice',
};

// Type colors for badges
export const TYPE_COLORS: Record<string, string> = {
  rule: 'bg-blue-100 text-blue-800 border-blue-200',
  exception: 'bg-amber-100 text-amber-800 border-amber-200',
  risk: 'bg-red-100 text-red-800 border-red-200',
  anti_pattern: 'bg-orange-100 text-orange-800 border-orange-200',
  condition: 'bg-purple-100 text-purple-800 border-purple-200',
  definition: 'bg-green-100 text-green-800 border-green-200',
};

// Domain colors
export const DOMAIN_COLORS: Record<string, string> = {
  uhrady: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  provoz: 'bg-teal-100 text-teal-800 border-teal-200',
  compliance: 'bg-slate-100 text-slate-800 border-slate-200',
  'financni-rizika': 'bg-rose-100 text-rose-800 border-rose-200',
  legislativa: 'bg-cyan-100 text-cyan-800 border-cyan-200',
};

export async function searchKnowledgeBase(params: {
  q?: string;
  domain?: string;
  type?: string;
  specialty?: string;
  limit?: number;
}): Promise<{ results: KnowledgeUnit[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set('q', params.q);
  if (params.domain) searchParams.set('domain', params.domain);
  if (params.type) searchParams.set('type', params.type);
  if (params.specialty) searchParams.set('specialty', params.specialty);
  if (params.limit) searchParams.set('limit', String(params.limit));

  const res = await fetch(`/api/knowledge-base?${searchParams.toString()}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return { results: data.data.results, total: data.data.total };
}

export async function getKnowledgeUnit(id: string): Promise<{ unit: KnowledgeUnit; relatedUnits: KnowledgeUnit[] }> {
  const res = await fetch(`/api/knowledge-base?id=${encodeURIComponent(id)}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function getKBStats(): Promise<KBStats> {
  const res = await fetch('/api/knowledge-base?stats=true');
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export function useKnowledgeBase() {
  const [results, setResults] = useState<KnowledgeUnit[]>([]);
  const [stats, setStats] = useState<KBStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<KnowledgeUnit | null>(null);
  const [relatedUnits, setRelatedUnits] = useState<KnowledgeUnit[]>([]);

  const loadStats = useCallback(async () => {
    try {
      const s = await getKBStats();
      setStats(s);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  const search = useCallback(async (params: Parameters<typeof searchKnowledgeBase>[0]) => {
    setLoading(true);
    setError(null);
    try {
      const data = await searchKnowledgeBase(params);
      setResults(data.results);
      return data;
    } catch (e: any) {
      setError(e.message);
      return { results: [], total: 0 };
    } finally {
      setLoading(false);
    }
  }, []);

  const selectUnit = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getKnowledgeUnit(id);
      setSelectedUnit(data.unit);
      setRelatedUnits(data.relatedUnits);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedUnit(null);
    setRelatedUnits([]);
  }, []);

  return {
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
  };
}
