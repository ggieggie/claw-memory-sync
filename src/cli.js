/**
 * Wrapper around OpenClaw memory-pro CLI (memory-lancedb-pro plugin)
 *
 * Available commands: search, list, delete, delete-bulk, import, export, stats
 * Note: No direct "store" command. Use "import" with a temp JSON file.
 */
import { exec as execCb } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

function run(cmd, timeout = 30000) {
  return new Promise((resolve, reject) => {
    execCb(cmd, { timeout, maxBuffer: 1024 * 1024, shell: true }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`CLI error: ${err.message}\nstderr: ${stderr}`));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

/**
 * Store a memory via import (writes temp JSON, imports, cleans up)
 */
export async function storeMemory(text, opts = {}) {
  const scope = opts.scope || 'global';
  const category = opts.category || 'fact';
  const importance = opts.importance || 0.6;

  const entry = {
    text,
    category,
    importance,
    createdAt: new Date().toISOString(),
    metadata: { source: 'memory-sync' },
  };

  const tmpFile = resolve(tmpdir(), `memory-sync-${randomUUID()}.json`);
  try {
    await writeFile(tmpFile, JSON.stringify([entry]));
    await run(`openclaw memory-pro import "${tmpFile}" --scope ${scope}`);
  } finally {
    try { await unlink(tmpFile); } catch {}
  }
}

/**
 * Batch store multiple memories at once (more efficient)
 * Uses the export/import format: { version: "1.0", memories: [...] }
 */
export async function storeMemories(entries, scope = 'global') {
  if (!entries.length) return;

  const memories = entries.map(e => ({
    id: randomUUID(),
    text: e.text,
    category: e.category || 'fact',
    scope,
    importance: e.importance || 0.6,
    timestamp: Date.now(),
    metadata: JSON.stringify(e.metadata || {}),
  }));

  const exportFormat = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    count: memories.length,
    memories,
  };

  const tmpFile = resolve(tmpdir(), `memory-sync-batch-${randomUUID()}.json`);
  try {
    await writeFile(tmpFile, JSON.stringify(exportFormat));
    await run(`openclaw memory-pro import "${tmpFile}" --scope ${scope}`, 120000);
  } finally {
    try { await unlink(tmpFile); } catch {}
  }
}

/**
 * Search memories via memory-pro CLI
 * @returns {Promise<Array>}
 */
export async function searchMemories(query, opts = {}) {
  const scope = opts.scope ? `--scope ${opts.scope}` : '';
  const limit = opts.limit || 10;
  const cmd = `openclaw memory-pro search ${JSON.stringify(query)} ${scope} --limit ${limit} --json`;
  const out = await run(cmd, 60000);
  try {
    return JSON.parse(out);
  } catch {
    return out.split('\n').filter(Boolean).map(line => {
      try { return JSON.parse(line); } catch { return { text: line }; }
    });
  }
}

/**
 * List memories with filters
 */
export async function listMemories(opts = {}) {
  let cmd = 'openclaw memory-pro list --json';
  if (opts.scope) cmd += ` --scope ${opts.scope}`;
  if (opts.limit) cmd += ` --limit ${opts.limit}`;
  const out = await run(cmd, 60000);
  try { return JSON.parse(out); } catch { return []; }
}

/**
 * Delete a memory by ID
 */
export async function deleteMemory(memoryId) {
  return run(`openclaw memory-pro delete ${memoryId}`);
}

/**
 * Get stats
 */
export async function getStats() {
  const out = await run('openclaw memory-pro stats --json');
  try { return JSON.parse(out); } catch { return out; }
}
