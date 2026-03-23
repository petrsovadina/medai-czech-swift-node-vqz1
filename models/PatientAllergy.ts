import { initDB, createModel } from 'lyzr-architect';
let _model: any = null;
export default async function getPatientAllergyModel() {
  if (!_model) {
    await initDB();
    _model = createModel('PatientAllergy', {
      patient_id: { type: String, required: true },
      substance_code: { type: String },
      display: { type: String },
      criticality: { type: String },
      reaction: { type: String },
      recorded_by: { type: String },
    });
  }
  return _model;
}
