/**
 * Configuration module for Vault Commander
 *
 * Loads preferences from Raycast and provides default values.
 * Designed for extensibility - future phases add API keys here.
 *
 * @module config
 */

import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { getPreferenceValues } from '@raycast/api'
import type {
  AbsolutePath,
  Preferences,
  RelativePath,
  SectionConfig,
  VaultCommanderConfig,
} from '../types'

/**
 * Default section headers matching user's existing vault structure.
 * All 7 sections from daily note template.
 */
export const DEFAULT_SECTIONS: SectionConfig = {
  schedule: '## Schedule',
  tasks: '## Tasks',
  running: '## Running',
  meetingNotes: '## Meeting Notes',
  voiceNotes: '## Voice Notes',
  notes: '## Notes',
  eveningReview: '## Evening Review',
}

/**
 * Expand ~ to home directory in path.
 * Returns an AbsolutePath branded type.
 */
export const expandPath = (path: string): AbsolutePath => {
  if (path.startsWith('~')) {
    return path.replace('~', homedir()) as AbsolutePath
  }
  return resolve(path) as AbsolutePath
}

/**
 * Get configuration from Raycast preferences with defaults.
 *
 * Exported for use by all commands and for Phase 2+ extensions.
 */
export const getConfig = (): VaultCommanderConfig => {
  const prefs = getPreferenceValues<Preferences>()

  return {
    // Core paths (Phase 1)
    vaultPath: expandPath(prefs.vaultPath),
    dailyNotePath: 'Journal/Daily' as RelativePath,
    dailyNoteFormat: 'YYYY-MM-DD-ddd',
    inboxPath: 'Inbox' as RelativePath,
    sections: DEFAULT_SECTIONS,

    // Phase 2 - Claude API
    claudeApiKey: prefs.claudeApiKey,

    // Phase 3 - Todoist API
    todoistApiKey: prefs.todoistApiKey,

    // Phase 4 - Voice & Automation
    voicePath: prefs.voicePath ? expandPath(prefs.voicePath) : undefined,
    meetingPath: prefs.meetingPath ? expandPath(prefs.meetingPath) : undefined,
    scriptsPath: prefs.scriptsPath ? expandPath(prefs.scriptsPath) : undefined,
  }
}

/**
 * Get the vault name from path (for Obsidian URI)
 */
export const getVaultName = (vaultPath: string): string => {
  const segments = vaultPath.split('/').filter(Boolean)
  return segments[segments.length - 1] || 'vault'
}

// Re-export types for convenience
export type { VaultCommanderConfig, SectionConfig, SectionKey } from '../types'
