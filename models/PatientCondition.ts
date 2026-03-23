import { initDB, createModel } from 'lyzr-architect';
let _model: any = null;
export default async function getPatientConditionModel() {
  if (!_model) {
    await initDB();
    _model = createModel('PatientCondition', {
      patient_id: { type: String, required: true },
      code: { type: String },
      display: { type: String },
      clinical_status: { type: String },
      onset_date: { type: String },
      severity_weight: { type: Number },
      recorded_by: { type: String },
    });
  }
  return _model;
}
