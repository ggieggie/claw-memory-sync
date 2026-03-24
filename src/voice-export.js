/**
 * Task 2: Export Voice Bot memories from LanceDB → md files
 * Searches for voice-bot scoped memories and appends to daily md.
 */
import { readFile, appendFile, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { CONFIG } from './config.js';
import { searchMemories } from './cli.js';
import { loadState, saveState } from './state.js';
import { log } from './logger.js';

function todayStr() {
  const d = new Date();
  return d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }); // YYYY-MM-DD
}

export async function exportVoiceMemories(dryRun = false) {
  const state = await loadState();
  const lastExport = state.lastVoiceExport || '2020-01-01T00:00:00Z';
  const exportedIds = new Set(state.exportedVoiceIds || []);

  // Search for recent voice bot memories
  let memories;
  try {
    // Voice Botはglobalスコープに保存しているため、globalで検索
    // metadata.source === 'voice-bot' でフィルタする
    memories = await searchMemories('voice conversation', {
      scope: CONFIG.globalScope,
      limit: 50,
    });
  } catch (e) {
    log(`ERROR recalling voice memories: ${e.message}`);
    return 0;
  }

  if (!Array.isArray(memories) || memories.length === 0) {
    log('voice-export: No voice memories found');
    return 0;
  }

  // Filter out already-exported
  const newMemories = memories.filter(m => {
    const id = m.id || m.memoryId;
    return id && !exportedIds.has(id);
  });

  if (newMemories.length === 0) {
    log('voice-export: No new voice memories to export');
    return 0;
  }

  const mdPath = resolve(CONFIG.memoryDir, `${todayStr()}.md`);

  if (!dryRun) {
    // Check if file exists, append header if new section needed
    let existingContent = '';
    try {
      existingContent = await readFile(mdPath, 'utf-8');
    } catch { /* file doesn't exist yet */ }

    let append = '';
    if (!existingContent.includes('## Voice Bot 会話ログ')) {
      append += `\n## Voice Bot 会話ログ (自動同期)\n`;
    }

    for (const m of newMemories) {
      const id = m.id || m.memoryId;
      const text = m.text || m.content || JSON.stringify(m);
      const ts = m.createdAt || m.timestamp || new Date().toISOString();
      append += `- [${ts}] ${text}\n`;
      exportedIds.add(id);
    }

    if (existingContent) {
      await appendFile(mdPath, append);
    } else {
      await writeFile(mdPath, `# ${todayStr()}\n${append}`);
    }

    state.exportedVoiceIds = [...exportedIds].slice(-500); // Keep last 500
    state.lastVoiceExport = new Date().toISOString();
    await saveState(state);
  } else {
    for (const m of newMemories) {
      log(`[DRY] Would export voice memory: ${(m.text || '').slice(0, 80)}...`);
    }
  }

  log(`voice-export: ${newMemories.length} voice memories exported to ${mdPath}`);
  return newMemories.length;
}
