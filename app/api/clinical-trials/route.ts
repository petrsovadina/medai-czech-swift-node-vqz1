import { NextRequest, NextResponse } from 'next/server';

const CT_API = 'https://clinicaltrials.gov/api/v2';

interface ClinicalTrial {
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

async function searchTrials(
  query: string,
  condition?: string,
  intervention?: string,
  status?: string,
  pageSize: number = 10
): Promise<{ trials: ClinicalTrial[]; totalCount: number }> {
  const params = new URLSearchParams();
  if (query) params.set('query.term', query);
  if (condition) params.set('query.cond', condition);
  if (intervention) params.set('query.intr', intervention);
  if (status) params.set('filter.overallStatus', status);
  params.set('pageSize', String(Math.min(pageSize, 20)));
  params.set('format', 'json');
  params.set('fields', 'NCTId,BriefTitle,OverallStatus,Phase,Condition,InterventionName,LeadSponsorName,StartDate,PrimaryCompletionDate,EnrollmentCount,LocationCity,LocationCountry');

  const res = await fetch(`${CT_API}/studies?${params.toString()}`);
  if (!res.ok) throw new Error(`ClinicalTrials.gov API error: ${res.status}`);
  const data = await res.json();

  const studies = data.studies || [];
  const trials: ClinicalTrial[] = studies.map((study: any) => {
    const proto = study.protocolSection || {};
    const id = proto.identificationModule || {};
    const status_m = proto.statusModule || {};
    const design = proto.designModule || {};
    const cond = proto.conditionsModule || {};
    const arms = proto.armsInterventionsModule || {};
    const sponsor = proto.sponsorCollaboratorsModule || {};
    const contacts = proto.contactsLocationsModule || {};

    const locations = (contacts.locations || [])
      .slice(0, 3)
      .map((l: any) => `${l.city || ''}, ${l.country || ''}`.trim());

    return {
      nctId: id.nctId || '',
      title: id.briefTitle || '',
      status: status_m.overallStatus || '',
      phase: (design.phases || []).join(', ') || 'N/A',
      conditions: (cond.conditions || []).slice(0, 5),
      interventions: ((arms.interventions || []).map((i: any) => i.name)).slice(0, 5),
      sponsor: sponsor.leadSponsor?.name || '',
      startDate: status_m.startDateStruct?.date || '',
      completionDate: status_m.primaryCompletionDateStruct?.date || '',
      enrollment: design.enrollmentInfo?.count || 0,
      locations,
      url: `https://clinicaltrials.gov/study/${id.nctId || ''}`,
    };
  });

  return { trials, totalCount: data.totalCount || trials.length };
}

export async function POST(request: NextRequest) {
  try {
    const { query, condition, intervention, status, pageSize } = await request.json();
    if (!query && !condition && !intervention) {
      return NextResponse.json({ success: false, error: 'Provide query, condition, or intervention' }, { status: 400 });
    }

    const result = await searchTrials(query, condition, intervention, status, pageSize);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
