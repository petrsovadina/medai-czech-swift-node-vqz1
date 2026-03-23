import { initDB, createModel } from 'lyzr-architect';
let _model: any = null;
export default async function getPatientMedicationModel() {
  if (!_model) {
    await initDB();
    _model = createModel('PatientMedication', {
      patient_id: { type: String, required: true },
      medication_code: { type: String },
      display: { type: String },
      dosage: { type: String },
      status: { type: String },
      authored_on: { type: String },
      recorded_by: { type: String },
    });
  }
  return _model;
}
