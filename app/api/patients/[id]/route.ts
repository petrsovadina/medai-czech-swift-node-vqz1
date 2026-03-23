import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from 'lyzr-architect';

import getPatientModel from '@/models/Patient';
import getPatientConditionModel from '@/models/PatientCondition';
import getPatientMedicationModel from '@/models/PatientMedication';
import getPatientObservationModel from '@/models/PatientObservation';
import getPatientAllergyModel from '@/models/PatientAllergy';
import getPatientEncounterModel from '@/models/PatientEncounter';

async function handler(req: NextRequest, context: any) {
  try {
    const id = context?.params?.id;
    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

    const Patient = await getPatientModel();
    const patient = await Patient.findById(id);
    if (!patient) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const [conditions, medications, observations, allergies, encounters] = await Promise.all([
      (await getPatientConditionModel()).find({ patient_id: id }),
      (await getPatientMedicationModel()).find({ patient_id: id }),
      (await getPatientObservationModel()).find({ patient_id: id }),
      (await getPatientAllergyModel()).find({ patient_id: id }),
      (await getPatientEncounterModel()).find({ patient_id: id }),
    ]);

    return NextResponse.json({
      success: true,
      data: { patient, conditions, medications, observations, allergies, encounters },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}

const protectedHandler = authMiddleware(handler);
export const GET = protectedHandler;
