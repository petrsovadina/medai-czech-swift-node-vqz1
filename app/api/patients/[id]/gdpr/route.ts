import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware, getCurrentUserId } from 'lyzr-architect';

import getPatientModel from '@/models/Patient';
import getPatientConditionModel from '@/models/PatientCondition';
import getPatientMedicationModel from '@/models/PatientMedication';
import getPatientObservationModel from '@/models/PatientObservation';
import getPatientAllergyModel from '@/models/PatientAllergy';
import getPatientEncounterModel from '@/models/PatientEncounter';
import getSessionHistoryModel from '@/models/SessionHistory';
import getAuditLogModel from '@/models/AuditLog';

// GET /api/patients/[id]/gdpr — Export all patient data (GDPR portability)
async function getHandler(req: NextRequest, context: any) {
  try {
    const id = context?.params?.id;
    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

    const Patient = await getPatientModel();
    const patient = await Patient.findById(id);
    if (!patient) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const [conditions, medications, observations, allergies, encounters, sessions] = await Promise.all([
      (await getPatientConditionModel()).find({ patient_id: id }),
      (await getPatientMedicationModel()).find({ patient_id: id }),
      (await getPatientObservationModel()).find({ patient_id: id }),
      (await getPatientAllergyModel()).find({ patient_id: id }),
      (await getPatientEncounterModel()).find({ patient_id: id }),
      (await getSessionHistoryModel()).find({ patient_id: id }),
    ]);

    const exportData = {
      export_date: new Date().toISOString(),
      export_type: 'GDPR_DATA_PORTABILITY',
      format: 'FHIR_HL7_CZ_CORE',
      patient: {
        display_name: patient.display_name,
        patient_hash: patient.patient_hash,
        created_at: patient.createdAt,
      },
      clinical_data: {
        conditions: Array.isArray(conditions) ? conditions.map((c: any) => ({
          code: c?.code, display: c?.display, clinical_status: c?.clinical_status, onset_date: c?.onset_date,
        })) : [],
        medications: Array.isArray(medications) ? medications.map((m: any) => ({
          medication_code: m?.medication_code, display: m?.display, dosage: m?.dosage, status: m?.status,
        })) : [],
        observations: Array.isArray(observations) ? observations.map((o: any) => ({
          code: o?.code, display: o?.display, value: o?.value, unit: o?.unit, effective_date: o?.effective_date,
        })) : [],
        allergies: Array.isArray(allergies) ? allergies.map((a: any) => ({
          substance_code: a?.substance_code, display: a?.display, criticality: a?.criticality, reaction: a?.reaction,
        })) : [],
        encounters: Array.isArray(encounters) ? encounters.map((e: any) => ({
          encounter_type: e?.encounter_type, reason: e?.reason, date: e?.date, notes: e?.notes,
        })) : [],
      },
      consultation_history: Array.isArray(sessions) ? sessions.map((s: any) => ({
        query: s?.query, response_summary: s?.response_summary, consult_mode: s?.consult_mode,
        urgency: s?.urgency, timestamp: s?.timestamp,
      })) : [],
      metadata: {
        total_conditions: Array.isArray(conditions) ? conditions.length : 0,
        total_medications: Array.isArray(medications) ? medications.length : 0,
        total_observations: Array.isArray(observations) ? observations.length : 0,
        total_allergies: Array.isArray(allergies) ? allergies.length : 0,
        total_encounters: Array.isArray(encounters) ? encounters.length : 0,
        total_consultations: Array.isArray(sessions) ? sessions.length : 0,
      },
    };

    // Audit log for data export
    const AuditLog = await getAuditLogModel();
    await AuditLog.create({
      user_id: getCurrentUserId(),
      action: 'gdpr_data_export',
      resource_type: 'patient',
      resource_id: id,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, data: exportData });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}

// DELETE /api/patients/[id]/gdpr — Delete all patient data (GDPR right to be forgotten)
async function deleteHandler(req: NextRequest, context: any) {
  try {
    const id = context?.params?.id;
    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

    const Patient = await getPatientModel();
    const patient = await Patient.findById(id);
    if (!patient) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    // Cascade delete all related data
    const [condRes, medRes, obsRes, allergyRes, encRes, sessRes] = await Promise.all([
      (await getPatientConditionModel()).deleteMany({ patient_id: id }),
      (await getPatientMedicationModel()).deleteMany({ patient_id: id }),
      (await getPatientObservationModel()).deleteMany({ patient_id: id }),
      (await getPatientAllergyModel()).deleteMany({ patient_id: id }),
      (await getPatientEncounterModel()).deleteMany({ patient_id: id }),
      (await getSessionHistoryModel()).deleteMany({ patient_id: id }),
    ]);

    // Anonymize audit logs (don't delete — needed for compliance)
    const AuditLog = await getAuditLogModel();
    await AuditLog.updateMany(
      { resource_id: id, resource_type: 'patient' },
      { $set: { resource_id: 'DELETED', anonymized_query_hash: 'gdpr_deleted' } }
    );

    // Delete the patient record
    await Patient.findByIdAndDelete(id);

    // Create final audit log for deletion
    await AuditLog.create({
      user_id: getCurrentUserId(),
      action: 'gdpr_data_deletion',
      resource_type: 'patient',
      resource_id: 'DELETED',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: {
        deleted: true,
        summary: {
          conditions_deleted: condRes?.deletedCount ?? 0,
          medications_deleted: medRes?.deletedCount ?? 0,
          observations_deleted: obsRes?.deletedCount ?? 0,
          allergies_deleted: allergyRes?.deletedCount ?? 0,
          encounters_deleted: encRes?.deletedCount ?? 0,
          sessions_deleted: sessRes?.deletedCount ?? 0,
          audit_logs_anonymized: true,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}

const protectedGet = authMiddleware(getHandler);
const protectedDelete = authMiddleware(deleteHandler);
export const GET = protectedGet;
export const DELETE = protectedDelete;
