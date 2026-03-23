import { initDB, createModel } from 'lyzr-architect';
let _model: any = null;
export default async function getAuditLogModel() {
  if (!_model) {
    await initDB();
    _model = createModel('AuditLog', {
      user_id: { type: String },
      action: { type: String, required: true },
      resource_type: { type: String },
      resource_id: { type: String },
      timestamp: { type: String },
      anonymized_query_hash: { type: String },
    });
  }
  return _model;
}
