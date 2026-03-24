/**
 * Task 1: Ingest md files → LanceDB
 * Reads memory/*.md and TOOLS.md, chunks them, and batch-imports new content.
 */
import { readdir, readFile } from 'fs/promises';
import { resolve } from 'path';
import { createHash } from 'crypto';
import { CONFIG } from './config.js';
import { storeMemories } from './cli.js';
import { loadState, saveState } from './state.js';
import { log } from './logger.js';

function chunkText(text, maxChars = CONFIG.mdChunkMaxChars) {
  const sections = text.split(/\n## /);
  const chunks = [];

  for (let i = 0; i < sections.length; i++) {
    let section = i === 0 ? sections[i] : '## ' + sections[i];
    section = section.trim();
    if (!section) continue;

    if (section.length <= maxChars) {
      chunks.push(section);
    } else {
      const paragraphs = section.split(/\n\n/);
      let current = '';
      for (const p of paragraphs) {
        if (current.length + p.length + 2 > maxChars && current) {
          chunks.push(current.trim());
          current = p;
        } else {
          current += (current ? '\n\n' : '') + p;
        }
      }
      if (current.trim()) chunks.push(current.trim());
    }
  }
  return chunks.filter(c => c.length > 20);
}

function hashChunk(chunk) {
  return createHash('sha256').update(chunk).digest('hex').slice(0, 16);
}

export async function ingestMdFiles(dryRun = false) {
  const state = await loadState();
  const ingestedHashes = new Set(state.ingestedChunkHashes || []);
  const newEntries = [];

  // Collect files
  const files = [];
  try {
    const memFiles = await readdir(CONFIG.memoryDir);
    for (const f of memFiles) {
      if (f.endsWith('.md')) {
        files.push({ path: resolve(CONFIG.memoryDir, f), source: `memory/${f}` });
      }
    }
  } catch {}

  files.push({ path: CONFIG.toolsMd, source: 'TOOLS.md' });

  for (const { path, source } of files) {
    let content;
    try { content = await readFile(path, 'utf-8'); } catch { continue; }

    const chunks = chunkText(content);
    for (const chunk of chunks) {
      const hash = hashChunk(chunk);
      if (ingestedHashes.has(hash)) continue;

      newEntries.push({
        text: `[source:${source}] ${chunk}`,
        category: 'fact',
        importance: 0.6,
        createdAt: new Date().toISOString(),
        metadata: { source, hash },
      });
      ingestedHashes.add(hash);
    }
  }

  if (newEntries.length === 0) {
    log('md-ingest: No new chunks to ingest');
    return 0;
  }

  if (!dryRun) {
    try {
      await storeMemories(newEntries, CONFIG.globalScope);
      state.ingestedChunkHashes = [...ingestedHashes];
      state.lastMdIngest = new Date().toISOString();
      await saveState(state);
    } catch (e) {
      log(`ERROR batch import: ${e.message}`);
      return 0;
    }
  } else {
    for (const e of newEntries) {
      log(`[DRY] Would ingest: ${e.text.slice(0, 80)}...`);
    }
  }

  log(`md-ingest: ${newEntries.length} new chunks ingested from ${files.length} files`);
  return newEntries.length;
}
