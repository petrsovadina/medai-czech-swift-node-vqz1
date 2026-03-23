import { initDB, createModel } from 'lyzr-architect';
let _model: any = null;
export default async function getSessionHistoryModel() {
  if (!_model) {
    await initDB();
    _model = createModel('SessionHistory', {
      patient_id: { type: String, required: true },
      user_id: { type: String },
      encounter_id: { type: String },
      messages_json: { type: String },
    });
  }
  return _model;
}
