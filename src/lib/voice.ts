/**
 * Voice transcription import for Vault Commander
 *
 * Handles importing voice transcriptions from Superwhisper and similar apps.
 * Files are imported to the Inbox folder as atomic notes.
 *
 * @module voice
 */

import { readdirSync, renameSync, statSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import dayjs from 'dayjs'
import type { VaultCommanderConfig } from '../types'
import { getDailyNoteLink, getTimestamp } from './daily'
import { ensureDirectory, readFile, writeFile } from './vault'

/** Supported transcription file extensions */
const TRANSCRIPTION_EXTENSIONS = ['.txt', '.md']

/** Metadata prefix for imported files */
const IMPORTED_PREFIX = '.imported-'

/**
 * Voice transcription file metadata
 */
export interface TranscriptionFile {
  /** Original filename */
  readonly filename: string
  /** Full path to file */
  readonly path: string
  /** File content */
  readonly content: string
  /** File creation/modification time */
  readonly timestamp: Date
}

/**
 * Result of importing a transcription
 */
export interface ImportResult {
  /** Original transcription file */
  readonly source: TranscriptionFile
  /** Created vault note path */
  readonly notePath: string
  /** Created vault note filename */
  readonly noteFilename: string
}

/**
 * List transcription files from a directory
 */
export const listTranscriptions = (sourcePath: string): TranscriptionFile[] => {
  try {
    const files = readdirSync(sourcePath)

    return files
      .filter((filename) => {
        // Skip hidden files and already imported files
        if (filename.startsWith('.')) return false
        // Only include supported extensions
        const ext = extname(filename).toLowerCase()
        return TRANSCRIPTION_EXTENSIONS.includes(ext)
      })
      .map((filename) => {
        const filePath = join(sourcePath, filename)
        const stats = statSync(filePath)

        return {
          filename,
          path: filePath,
          content: readFile(filePath),
          timestamp: stats.mtime,
        }
      })
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  } catch {
    return []
  }
}

/**
 * Generate a voice note filename
 */
export const generateVoiceNoteFilename = (date: Date | dayjs.Dayjs = dayjs()): string =>
  `voice-${dayjs(date).format('YYYY-MM-DD-HHmmss')}.md`

/**
 * Import a single transcription to the vault
 */
export const importTranscription = (
  config: VaultCommanderConfig,
  transcription: TranscriptionFile,
  archiveAfterImport = true
): ImportResult => {
  const timestamp = dayjs(transcription.timestamp)
  const filename = generateVoiceNoteFilename(timestamp)
  const notePath = join(config.vaultPath, config.inboxPath, filename)
  const dailyNoteLink = getDailyNoteLink(timestamp, config.dailyNoteFormat)
  const timeStr = getTimestamp(timestamp)

  // Format note with metadata
  const noteContent = `${dailyNoteLink} - ${timeStr} (voice)\n\n${transcription.content.trim()}\n`

  // Write to vault
  writeFile(notePath, noteContent)

  // Archive the source file (rename with prefix) to prevent re-import
  if (archiveAfterImport) {
    const archivePath = join(
      dirname(transcription.path),
      `${IMPORTED_PREFIX}${transcription.filename}`
    )
    renameSync(transcription.path, archivePath)
  }

  return {
    source: transcription,
    notePath,
    noteFilename: filename,
  }
}

/**
 * Import all transcriptions from a directory
 */
export const importAllTranscriptions = (
  config: VaultCommanderConfig,
  sourcePath: string,
  archiveAfterImport = true
): ImportResult[] => {
  const transcriptions = listTranscriptions(sourcePath)
  return transcriptions.map((t) => importTranscription(config, t, archiveAfterImport))
}

/**
 * Get count of pending transcriptions
 */
export const getPendingCount = (sourcePath: string): number => listTranscriptions(sourcePath).length
