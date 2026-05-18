import { NextResponse } from 'next/server';
import { runCurationCycle } from '@/lib/curation';
import { logError } from '@/lib/logger';

// This endpoint is meant to be called by a cron scheduler (like Google Cloud Scheduler) daily.
// It explicitly runs the curation cycle in the background and returns a simple status.
export async function GET(request: Request) {
  // You can add authorization checks here, e.g., verify a secret token
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await runCurationCycle();
    return NextResponse.json({ 
      success: true, 
      message: 'Background curation completed successfully.',
      timestamp: new Date().toISOString(),
      summary: data.summary
    });
  } catch (error: any) {
    logError("GET /api/cron/curate", error);
    return NextResponse.json({ 
      success: false, 
      error: 'Scheduled job failed', 
      details: error.message 
    }, { status: 500 });
  }
}
