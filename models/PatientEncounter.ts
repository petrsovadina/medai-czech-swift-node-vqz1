import { initDB, createModel } from 'lyzr-architect';
let _model: any = null;
export default async function getPatientEncounterModel() {
  if (!_model) {
    await initDB();
    _model = createModel('PatientEncounter', {
      patient_id: { type: String, required: true },
      encounter_type: { type: String },
      period_start: { type: String },
      period_end: { type: String },
      reason: { type: String },
      session_notes: { type: String },
      recorded_by: { type: String },
    });
  }
  return _model;
}
