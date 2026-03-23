import { NextRequest, NextResponse } from 'next/server';

const SUKL_MCP_ENDPOINT = 'https://sukl-mcp.vercel.app/mcp';

async function callSuklMcp(method: string, params: Record<string, any> = {}) {
  const response = await fetch(SUKL_MCP_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: method,
        arguments: params,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`SUKL MCP error: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || 'SUKL MCP error');
  }
  return data.result;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tool, params } = body;

    const validTools = [
      'search-medicine',
      'get-medicine-details',
      'check-availability',
      'find-pharmacies',
      'get-atc-info',
      'get-reimbursement',
      'get-pil-content',
      'get-spc-content',
      'batch-check-availability',
    ];

    if (!validTools.includes(tool)) {
      return NextResponse.json(
        { success: false, error: `Invalid tool: ${tool}. Valid: ${validTools.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await callSuklMcp(tool, params || {});
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'SUKL API error' },
      { status: 500 }
    );
  }
}
