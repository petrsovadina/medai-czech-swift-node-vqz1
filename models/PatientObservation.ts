import { initDB, createModel } from 'lyzr-architect';
let _model: any = null;
export default async function getPatientObservationModel() {
  if (!_model) {
    await initDB();
    _model = createModel('PatientObservation', {
      patient_id: { type: String, required: true },
      code: { type: String },
      display: { type: String },
      value: { type: String },
      unit: { type: String },
      effective_date: { type: String },
      recorded_by: { type: String },
    });
  }
  return _model;
}
