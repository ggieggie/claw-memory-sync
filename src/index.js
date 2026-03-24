#!/usr/bin/env node
/**
 * claw-memory-sync — Periodic memory synchronization
 *
 * Tasks:
 * 1. md-ingest: memory/*.md + TOOLS.md → LanceDB (new chunks only)
 * 2. voice-export: Voice Bot LanceDB memories → daily md files
 * 3. dedup: Remove near-duplicate memories
 *
 * Usage:
 *   node src/index.js              # Run all tasks
 *   node src/index.js --dry-run    # Preview changes
 *   node src/index.js --task md    # Run specific task
 *   node src/index.js --task voice # Run specific task
 *   node src/index.js --task dedup # Run specific task
 */
import { ingestMdFiles } from './md-ingest.js';
import { exportVoiceMemories } from './voice-export.js';
import { deduplicateMemories } from './dedup.js';
import { log } from './logger.js';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const taskArg = args.find((a, i) => args[i - 1] === '--task');

async function main() {
  const startTime = Date.now();
  log(`=== memory-sync started ${dryRun ? '(DRY RUN)' : ''} ===`);

  const tasks = taskArg ? [taskArg] : ['md', 'voice', 'dedup'];
  const results = {};

  for (const task of tasks) {
    try {
      switch (task) {
        case 'md':
          results.mdIngest = await ingestMdFiles(dryRun);
          break;
        case 'voice':
          results.voiceExport = await exportVoiceMemories(dryRun);
          break;
        case 'dedup':
          results.dedup = await deduplicateMemories(dryRun);
          break;
        default:
          log(`Unknown task: ${task}`);
      }
    } catch (e) {
      log(`ERROR in task ${task}: ${e.message}`);
      results[task] = `error: ${e.message}`;
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`=== memory-sync completed in ${elapsed}s | ${JSON.stringify(results)} ===`);
}

main().catch(e => {
  log(`FATAL: ${e.message}`);
  process.exit(1);
});
