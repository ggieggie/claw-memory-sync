import { resolve } from 'path';
import { homedir } from 'os';

export const CONFIG = {
  // Paths
  workspacePath: resolve(homedir(), '.openclaw/workspace'),
  memoryDir: resolve(homedir(), '.openclaw/workspace/memory'),
  toolsMd: resolve(homedir(), '.openclaw/workspace/TOOLS.md'),

  // OpenClaw CLI
  openclawBin: 'openclaw',

  // Sync settings
  mdChunkMaxChars: 1500,       // Max chars per chunk when ingesting md → LanceDB
  similarityThreshold: 0.92,   // Above this = duplicate
  oldMemoryDays: 30,           // Compress memories older than this
  maxRecallResults: 50,        // Max results when scanning for duplicates

  // Scopes
  globalScope: 'global',
  mainAgentScope: 'agent:main',
  voiceBotScope: 'agent:voice-bot',

  // State file
  stateFile: resolve(homedir(), '.openclaw/workspace/memory/memory-sync-state.json'),

  // Log
  logFile: resolve(homedir(), '.openclaw/workspace/memory/memory-sync.log'),
};
