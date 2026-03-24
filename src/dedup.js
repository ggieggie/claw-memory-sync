/**
 * Task 3: Deduplicate similar memories in LanceDB
 * Scans for near-duplicate memories and merges them.
 */
import { CONFIG } from './config.js';
import { searchMemories, deleteMemory, storeMemory } from './cli.js';
import { log } from './logger.js';

/**
 * Simple similarity check: if two memories share >70% of words, consider them near-dupes
 */
function wordOverlap(a, b) {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++;
  }
  return overlap / Math.max(wordsA.size, wordsB.size);
}

export async function deduplicateMemories(dryRun = false) {
  // Sample some memories with common queries
  const queries = ['設定', '会話', 'API', '実装', 'discord', 'slack', 'memory'];
  const seen = new Map(); // id → memory
  let dupeCount = 0;

  for (const q of queries) {
    let results;
    try {
      results = await searchMemories(q, { limit: 20 });
    } catch { continue; }

    if (!Array.isArray(results)) continue;

    for (const m of results) {
      const id = m.id || m.memoryId;
      const text = m.text || m.content || '';
      if (!id || !text) continue;

      // Check against already-seen memories
      let isDupe = false;
      for (const [existingId, existingText] of seen) {
        if (existingId === id) { isDupe = true; break; }
        const overlap = wordOverlap(text, existingText);
        if (overlap > CONFIG.similarityThreshold) {
          // Keep the longer one, delete the shorter
          if (!dryRun) {
            const deleteId = text.length >= existingText.length ? existingId : id;
            try {
              await deleteMemory(deleteId);
              dupeCount++;
              log(`dedup: Removed duplicate ${deleteId.slice(0, 8)}... (overlap: ${(overlap * 100).toFixed(0)}%)`);
            } catch (e) {
              log(`ERROR deleting dupe ${deleteId}: ${e.message}`);
            }
          } else {
            log(`[DRY] Would remove duplicate (overlap: ${(overlap * 100).toFixed(0)}%)`);
            dupeCount++;
          }
          isDupe = true;
          break;
        }
      }

      if (!isDupe) {
        seen.set(id, text);
      }
    }
  }

  log(`dedup: ${dupeCount} duplicates removed`);
  return dupeCount;
}
