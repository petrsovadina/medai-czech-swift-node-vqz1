import { NextRequest, NextResponse } from 'next/server';

const OPENFDA_BASE = 'https://api.fda.gov';

interface AdverseEvent {
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

async function searchAdverseEvents(
  drugName: string,
  limit: number = 10
): Promise<{ events: AdverseEvent[]; total: number }> {
  const url = `${OPENFDA_BASE}/drug/event.json?search=patient.drug.medicinalproduct:"${encodeURIComponent(drugName)}"&limit=${Math.min(limit, 20)}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) return { events: [], total: 0 };
    throw new Error(`OpenFDA error: ${res.status}`);
  }
  const data = await res.json();

  const events: AdverseEvent[] = (data.results || []).map((r: any) => {
    const seriousReasons: string[] = [];
    if (r.seriousnessdeath === '1') seriousReasons.push('Smrt');
    if (r.seriousnesslifethreatening === '1') seriousReasons.push('Ohrožení života');
    if (r.seriousnesshospitalization === '1') seriousReasons.push('Hospitalizace');
    if (r.seriousnessdisabling === '1') seriousReasons.push('Invalidita');

    const drugs = (r.patient?.drug || []).slice(0, 5).map((d: any) => ({
      name: d.medicinalproduct || '',
      indication: d.drugindication || '',
      role: d.drugcharacterization === '1' ? 'Podezřelý' : d.drugcharacterization === '2' ? 'Souběžný' : 'Interakční',
    }));

    const reactions = (r.patient?.reaction || []).slice(0, 10).map((rx: any) => rx.reactionmeddrapt || '');

    return {
      reportId: r.safetyreportid || '',
      receiveDate: r.receivedate || '',
      serious: r.serious === '1',
      seriousReasons,
      patientAge: r.patient?.patientonsetage ? `${r.patient.patientonsetage} ${r.patient.patientonsetageunit === '801' ? 'let' : ''}` : 'Neuvedeno',
      patientSex: r.patient?.patientsex === '1' ? 'Muž' : r.patient?.patientsex === '2' ? 'Žena' : 'Neuvedeno',
      drugs,
      reactions,
      outcome: r.patient?.patientdeath ? 'Smrt' : 'Jiný',
    };
  });

  return { events, total: data.meta?.results?.total || events.length };
}

async function searchDrugLabels(drugName: string) {
  const url = `${OPENFDA_BASE}/drug/label.json?search=openfda.brand_name:"${encodeURIComponent(drugName)}"+openfda.generic_name:"${encodeURIComponent(drugName)}"&limit=3`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`OpenFDA label error: ${res.status}`);
  }
  const data = await res.json();
  return (data.results || []).map((r: any) => ({
    brandName: r.openfda?.brand_name?.[0] || '',
    genericName: r.openfda?.generic_name?.[0] || '',
    manufacturer: r.openfda?.manufacturer_name?.[0] || '',
    indications: (r.indications_and_usage || []).join(' ').substring(0, 500),
    warnings: (r.warnings || []).join(' ').substring(0, 500),
    interactions: (r.drug_interactions || []).join(' ').substring(0, 500),
    contraindications: (r.contraindications || []).join(' ').substring(0, 500),
  }));
}

export async function POST(request: NextRequest) {
  try {
    const { action, drugName, limit } = await request.json();
    if (!drugName) {
      return NextResponse.json({ success: false, error: 'Drug name required' }, { status: 400 });
    }

    if (action === 'labels') {
      const labels = await searchDrugLabels(drugName);
      return NextResponse.json({ success: true, data: { labels } });
    }

    const result = await searchAdverseEvents(drugName, limit);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
