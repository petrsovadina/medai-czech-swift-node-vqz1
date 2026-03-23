'use client';

import { useState, useCallback } from 'react';

// ========== SUKL API ==========
export interface SuklMedicine {
  name?: string;
  sukl_code?: string;
  active_ingredient?: string;
  atc_code?: string;
  form?: string;
  strength?: string;
  holder?: string;
  registration_status?: string;
  [key: string]: any;
}

export interface SuklReimbursement {
  sukl_code?: string;
  reimbursement_group?: string;
  max_price?: string;
  copayment?: string;
  [key: string]: any;
}

export async function callSuklApi(tool: string, params: Record<string, any> = {}) {
  const res = await fetch('/api/sukl', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool, params }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'SUKL API error');
  return data.data;
}

export function useSuklSearch() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchMedicine = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await callSuklApi('search-medicine', { query });
      const content = data?.content;
      let parsed: any[] = [];
      if (Array.isArray(content)) {
        for (const item of content) {
          if (item.type === 'text' && item.text) {
            try {
              const p = JSON.parse(item.text);
              parsed = Array.isArray(p) ? p : Array.isArray(p.results) ? p.results : [p];
            } catch {
              parsed = [{ raw: item.text }];
            }
          }
        }
      }
      setResults(parsed);
      return parsed;
    } catch (e: any) {
      setError(e.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getMedicineDetails = useCallback(async (suklCode: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await callSuklApi('get-medicine-details', { sukl_code: suklCode });
      const content = data?.content;
      if (Array.isArray(content) && content[0]?.text) {
        try { return JSON.parse(content[0].text); } catch { return content[0].text; }
      }
      return data;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getReimbursement = useCallback(async (suklCode: string) => {
    try {
      const data = await callSuklApi('get-reimbursement', { sukl_code: suklCode });
      const content = data?.content;
      if (Array.isArray(content) && content[0]?.text) {
        try { return JSON.parse(content[0].text); } catch { return content[0].text; }
      }
      return data;
    } catch {
      return null;
    }
  }, []);

  const checkAvailability = useCallback(async (suklCode: string) => {
    try {
      const data = await callSuklApi('check-availability', { sukl_code: suklCode });
      const content = data?.content;
      if (Array.isArray(content) && content[0]?.text) {
        try { return JSON.parse(content[0].text); } catch { return content[0].text; }
      }
      return data;
    } catch {
      return null;
    }
  }, []);

  const getSpcContent = useCallback(async (suklCode: string) => {
    try {
      const data = await callSuklApi('get-spc-content', { sukl_code: suklCode });
      const content = data?.content;
      if (Array.isArray(content) && content[0]?.text) {
        try { return JSON.parse(content[0].text); } catch { return content[0].text; }
      }
      return data;
    } catch {
      return null;
    }
  }, []);

  return { results, loading, error, searchMedicine, getMedicineDetails, getReimbursement, checkAvailability, getSpcContent };
}

// ========== PubMed API ==========
export interface PubMedArticle {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  abstract: string;
  doi: string;
}

export async function searchPubMed(query: string, maxResults: number = 10): Promise<PubMedArticle[]> {
  const res = await fetch('/api/pubmed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, maxResults }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'PubMed error');
  return data.data?.articles || [];
}

export function usePubMed() {
  const [articles, setArticles] = useState<PubMedArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, maxResults = 10) => {
    setLoading(true);
    setError(null);
    try {
      const results = await searchPubMed(query, maxResults);
      setArticles(results);
      return results;
    } catch (e: any) {
      setError(e.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { articles, loading, error, search };
}

// ========== Clinical Trials API ==========
export interface ClinicalTrial {
  nctId: string;
  title: string;
  status: string;
  phase: string;
  conditions: string[];
  interventions: string[];
  sponsor: string;
  startDate: string;
  completionDate: string;
  enrollment: number;
  locations: string[];
  url: string;
}

export async function searchClinicalTrials(params: {
  query?: string;
  condition?: string;
  intervention?: string;
  status?: string;
  pageSize?: number;
}): Promise<{ trials: ClinicalTrial[]; totalCount: number }> {
  const res = await fetch('/api/clinical-trials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Clinical trials error');
  return data.data;
}

export function useClinicalTrials() {
  const [trials, setTrials] = useState<ClinicalTrial[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (params: Parameters<typeof searchClinicalTrials>[0]) => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchClinicalTrials(params);
      setTrials(result.trials);
      setTotalCount(result.totalCount);
      return result;
    } catch (e: any) {
      setError(e.message);
      return { trials: [], totalCount: 0 };
    } finally {
      setLoading(false);
    }
  }, []);

  return { trials, totalCount, loading, error, search };
}

// ========== OpenFDA API ==========
export interface AdverseEvent {
  reportId: string;
  receiveDate: string;
  serious: boolean;
  seriousReasons: string[];
  patientAge: string;
  patientSex: string;
  drugs: { name: string; indication: string; role: string }[];
  reactions: string[];
  outcome: string;
}

export async function searchAdverseEvents(drugName: string, limit = 10): Promise<{ events: AdverseEvent[]; total: number }> {
  const res = await fetch('/api/openfda', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'events', drugName, limit }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'OpenFDA error');
  return data.data;
}

export async function getDrugLabels(drugName: string) {
  const res = await fetch('/api/openfda', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'labels', drugName }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'OpenFDA label error');
  return data.data?.labels || [];
}

export function useAdverseEvents() {
  const [events, setEvents] = useState<AdverseEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (drugName: string, limit = 10) => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchAdverseEvents(drugName, limit);
      setEvents(result.events);
      setTotal(result.total);
      return result;
    } catch (e: any) {
      setError(e.message);
      return { events: [], total: 0 };
    } finally {
      setLoading(false);
    }
  }, []);

  return { events, total, loading, error, search };
}
