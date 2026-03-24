import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { CONFIG } from './config.js';

export async function loadState() {
  try {
    const raw = await readFile(CONFIG.stateFile, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function saveState(state) {
  await mkdir(dirname(CONFIG.stateFile), { recursive: true });
  await writeFile(CONFIG.stateFile, JSON.stringify(state, null, 2));
}
