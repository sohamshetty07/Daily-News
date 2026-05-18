import fs from 'fs';
import path from 'path';

export function logError(context: string, error: any) {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.stack || error.message : String(error);
  const logMessage = `[${timestamp}] ERROR in ${context}:\n${errorMessage}\n\n`;
  
  console.error(logMessage);
  
  try {
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logFile = path.join(logDir, 'error.log');
    fs.appendFileSync(logFile, logMessage);
  } catch (fsError) {
    console.error('Failed to write to error log file:', fsError);
  }
}
