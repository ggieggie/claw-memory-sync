import { appendFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { CONFIG } from './config.js';

export function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}`;
  console.log(line);
  // Also append to log file (fire and forget)
  mkdir(dirname(CONFIG.logFile), { recursive: true })
    .then(() => appendFile(CONFIG.logFile, line + '\n'))
    .catch(() => {});
}
