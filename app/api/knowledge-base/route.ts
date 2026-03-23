import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Knowledge Unit types from klinicka-knowledge-base schema
interface KnowledgeUnit {
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

// Cache the knowledge base in memory
let cachedUnits: KnowledgeUnit[] | null = null;

function loadKnowledgeBase(): KnowledgeUnit[] {
  if (cachedUnits) return cachedUnits;

  const filePath = path.join(process.cwd(), 'data', 'knowledge_base.jsonl');
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  cachedUnits = lines.map(line => {
    try {
      return JSON.parse(line) as KnowledgeUnit;
    } catch {
      return null;
    }
  }).filter(Boolean) as KnowledgeUnit[];

  return cachedUnits;
}

function searchUnits(
  units: KnowledgeUnit[],
  query: string,
  domain?: string,
  type?: string,
  specialty?: string,
  limit: number = 20
): KnowledgeUnit[] {
  let filtered = [...units];

  // Filter by domain
  if (domain && domain !== 'all') {
    filtered = filtered.filter(u => u.domain === domain);
  }

  // Filter by type
  if (type && type !== 'all') {
    filtered = filtered.filter(u => u.type === type);
  }

  // Filter by specialty
  if (specialty && specialty !== 'all') {
    filtered = filtered.filter(u =>
      u.applicability.specialties.includes('all') ||
      u.applicability.specialties.includes(specialty)
    );
  }

  // Text search
  if (query && query.trim()) {
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 1);

    const scored = filtered.map(unit => {
      let score = 0;
      const titleLower = unit.title.toLowerCase();
      const descLower = unit.description.toLowerCase();
      const tagsJoined = (unit.tags || []).join(' ').toLowerCase();
      const contentStr = JSON.stringify(unit.content).toLowerCase();

      // Exact title match bonus
      if (titleLower.includes(queryLower)) score += 10;

      // Term matching
      for (const term of queryTerms) {
        if (titleLower.includes(term)) score += 5;
        if (descLower.includes(term)) score += 3;
        if (tagsJoined.includes(term)) score += 4;
        if (contentStr.includes(term)) score += 1;
      }

      return { unit, score };
    });

    filtered = scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(s => s.unit);
  }

  return filtered.slice(0, limit);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const domain = searchParams.get('domain') || 'all';
    const type = searchParams.get('type') || 'all';
    const specialty = searchParams.get('specialty') || 'all';
    const unitId = searchParams.get('id');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const statsOnly = searchParams.get('stats') === 'true';

    const units = loadKnowledgeBase();

    // Get specific unit by ID
    if (unitId) {
      const unit = units.find(u => u.id === unitId);
      if (!unit) {
        return NextResponse.json({ success: false, error: 'Jednotka nenalezena' }, { status: 404 });
      }
      // Get related units
      const relatedUnits = (unit.related_units || [])
        .map(rid => units.find(u => u.id === rid))
        .filter(Boolean);
      return NextResponse.json({ success: true, data: { unit, relatedUnits } });
    }

    // Stats endpoint
    if (statsOnly) {
      const domainCounts: Record<string, number> = {};
      const typeCounts: Record<string, number> = {};
      for (const u of units) {
        domainCounts[u.domain] = (domainCounts[u.domain] || 0) + 1;
        typeCounts[u.type] = (typeCounts[u.type] || 0) + 1;
      }
      return NextResponse.json({
        success: true,
        data: {
          total: units.length,
          domains: domainCounts,
          types: typeCounts,
        },
      });
    }

    // Search
    const results = searchUnits(units, query, domain, type, specialty, limit);
    return NextResponse.json({
      success: true,
      data: {
        results,
        total: results.length,
        query,
        filters: { domain, type, specialty },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
