import { NextResponse } from 'next/server';
import { runCurationCycle, getCuratedData } from '@/lib/curation';
import { logError } from '@/lib/logger';

// Fetch the existing curated data from our mock database
export async function GET() {
  try {
    const data = getCuratedData();
    if (data) {
      return NextResponse.json({ success: true, ...data });
    } else {
      return NextResponse.json({ success: true, articles: [], message: 'No data available yet.' });
    }
  } catch (error: any) {
    logError("GET /api/curate", error);
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 });
  }
}

// Trigger manual curation cycle
export async function POST() {
  try {
    const data = await runCurationCycle();
    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    logError("POST /api/curate", error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to curate' }, { status: 500 });
  }
}

