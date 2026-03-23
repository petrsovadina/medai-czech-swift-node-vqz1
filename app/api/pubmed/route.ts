import { NextRequest, NextResponse } from 'next/server';

const EUTILS_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

interface PubMedArticle {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  abstract: string;
  doi: string;
}

async function searchPubMed(query: string, maxResults: number = 10): Promise<PubMedArticle[]> {
  const searchUrl = `${EUTILS_BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&retmode=json&sort=relevance`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();

  const ids = searchData?.esearchresult?.idlist || [];
  if (ids.length === 0) return [];

  const fetchUrl = `${EUTILS_BASE}/efetch.fcgi?db=pubmed&id=${ids.join(',')}&retmode=xml`;
  const fetchRes = await fetch(fetchUrl);
  const xmlText = await fetchRes.text();

  const articles: PubMedArticle[] = [];
  const articleRegex = /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g;
  let match;

  while ((match = articleRegex.exec(xmlText)) !== null) {
    const xml = match[1];
    const getTag = (tag: string) => {
      const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
      return m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
    };

    const pmidMatch = xml.match(/<PMID[^>]*>(\d+)<\/PMID>/);
    const titleMatch = xml.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/);
    const journalMatch = xml.match(/<Title>([\s\S]*?)<\/Title>/);
    const yearMatch = xml.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/);
    const abstractMatch = xml.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g);
    const doiMatch = xml.match(/<ArticleId IdType="doi">([\s\S]*?)<\/ArticleId>/);

    const authorMatches = [...xml.matchAll(/<Author[\s\S]*?<LastName>(.*?)<\/LastName>[\s\S]*?<Initials>(.*?)<\/Initials>/g)];
    const authors = authorMatches.map(a => `${a[1]} ${a[2]}`).slice(0, 5).join(', ');

    let abstractText = '';
    if (abstractMatch) {
      abstractText = abstractMatch.map(a => a.replace(/<[^>]+>/g, '').trim()).join(' ');
    }

    articles.push({
      pmid: pmidMatch?.[1] || '',
      title: (titleMatch?.[1] || '').replace(/<[^>]+>/g, '').trim(),
      authors: authors || 'Unknown',
      journal: (journalMatch?.[1] || '').trim(),
      year: yearMatch?.[1] || '',
      abstract: abstractText.substring(0, 1000),
      doi: (doiMatch?.[1] || '').trim(),
    });
  }

  return articles;
}

export async function POST(request: NextRequest) {
  try {
    const { query, maxResults = 10 } = await request.json();
    if (!query) {
      return NextResponse.json({ success: false, error: 'Query required' }, { status: 400 });
    }

    const articles = await searchPubMed(query, Math.min(maxResults, 20));
    return NextResponse.json({ success: true, data: { articles, total: articles.length } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
