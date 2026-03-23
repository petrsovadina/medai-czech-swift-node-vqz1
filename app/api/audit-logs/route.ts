import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware, getCurrentUserId } from 'lyzr-architect';
import getAuditLogModel from '@/models/AuditLog';

async function handler(req: NextRequest) {
  try {
    const Model = await getAuditLogModel();
    if (req.method === 'GET') {
      const data = await Model.find({}).sort({ createdAt: -1 }).limit(100);
      return NextResponse.json({ success: true, data });
    }
    if (req.method === 'POST') {
      const body = await req.json();
      const doc = await Model.create({ ...body, owner_user_id: getCurrentUserId() });
      return NextResponse.json({ success: true, data: doc });
    }
    return NextResponse.json({ success: false, error: 'Method not allowed' }, { status: 405 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}

const protectedHandler = authMiddleware(handler);
export const GET = protectedHandler;
export const POST = protectedHandler;
