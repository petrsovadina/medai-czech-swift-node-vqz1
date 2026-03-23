import { initDB, createModel } from 'lyzr-architect';
let _model: any = null;
export default async function getPatientModel() {
  if (!_model) {
    await initDB();
    _model = createModel('Patient', {
      patient_hash: { type: String, required: true },
      display_name: { type: String, default: '' },
      created_by_user_id: { type: String },
    });
  }
  return _model;
}
