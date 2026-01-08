/**
 * Meeting notes import for Vault Commander
 *
 * Handles importing meeting notes from Granola and similar apps.
 * Notes are imported to the Meeting Notes section of the daily note.
 *
 * @module meeting
 */

import { existsSync, readdirSync, renameSync, statSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import dayjs from 'dayjs'
import type { VaultCommanderConfig } from '../types'
import { getTimestamp } from './daily'
import { appendToSection, ensureDailyNote, readFile } from './vault'

/** Supported meeting note file extensions */
const MEETING_EXTENSIONS = ['.md', '.txt']

/** Prefix for archived files */
const IMPORTED_PREFIX = '.imported-'

/**
 * Meeting note file metadata
 */
export interface MeetingNoteFile {
  /** Original filename */
  readonly filename: string
  /** Full path to file */
  readonly path: string
  /** File content */
  readonly content: string
  /** File modification time */
  readonly timestamp: Date
  /** Extracted title (first line or filename) */
  readonly title: string
}

/**
 * Result of importing a meeting note
 */
export interface MeetingImportResult {
  /** Original meeting note file */
  readonly source: MeetingNoteFile
  /** Daily note path where content was appended */
  readonly dailyNotePath: string
}

/**
 * Result of bulk importing meeting notes (partial success support)
 */
export interface BulkMeetingImportResult {
  /** Successfully imported notes */
  readonly results: MeetingImportResult[]
  /** Failed imports with error details */
  readonly errors: ReadonlyArray<{ note: MeetingNoteFile; error: Error }>
}

/**
 * Extract title from meeting note content
 */
const extractTitle = (content: string, filename: string): string => {
  // Try to get title from first line (skip empty lines and headers)
  const lines = content.split('\n').filter((line) => line.trim())
  const firstLine = lines[0] || ''

  // If it's a markdown header, extract the text
  const headerMatch = firstLine.match(/^#+\s*(.+)/)
  if (headerMatch) {
    return headerMatch[1].trim()
  }

  // If first line is reasonable length, use it as title
  if (firstLine.length > 0 && firstLine.length < 100) {
    return firstLine.trim()
  }

  // Fall back to filename without extension
  return filename.replace(/\.(md|txt)$/i, '')
}

/**
 * List meeting note files from a directory
 */
export const listMeetingNotes = (sourcePath: string): MeetingNoteFile[] => {
  try {
    const files = readdirSync(sourcePath)

    return files
      .filter((filename) => {
        if (filename.startsWith('.')) return false
        const ext = extname(filename).toLowerCase()
        return MEETING_EXTENSIONS.includes(ext)
      })
      .map((filename) => {
        const filePath = join(sourcePath, filename)
        const stats = statSync(filePath)
        const content = readFile(filePath)

        return {
          filename,
          path: filePath,
          content,
          timestamp: stats.mtime,
          title: extractTitle(content, filename),
        }
      })
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  } catch {
    return []
  }
}

/**
 * Format meeting note content for daily note
 */
export const formatMeetingContent = (
  note: MeetingNoteFile,
  config: VaultCommanderConfig
): string => {
  const timestamp = dayjs(note.timestamp)
  const timeStr = getTimestamp(timestamp)

  // Format: ### Meeting Title (time)\n\nContent
  return `### ${note.title} (${timeStr})\n\n${note.content.trim()}\n`
}

/**
 * Import a meeting note to today's daily note
 */
export const importMeetingNote = (
  config: VaultCommanderConfig,
  note: MeetingNoteFile,
  archiveAfterImport = true
): MeetingImportResult => {
  // Ensure daily note exists
  const dailyNotePath = ensureDailyNote(config)

  // Format the content
  const formattedContent = formatMeetingContent(note, config)

  // Append to Meeting Notes section
  appendToSection(dailyNotePath, config.sections.meetingNotes, formattedContent)

  // Archive source file
  if (archiveAfterImport) {
    const archivePath = join(dirname(note.path), `${IMPORTED_PREFIX}${note.filename}`)
    if (existsSync(archivePath)) {
      throw new Error(`Archive file already exists: ${archivePath}`)
    }
    renameSync(note.path, archivePath)
  }

  return {
    source: note,
    dailyNotePath,
  }
}

/**
 * Import all meeting notes from a directory
 * Returns partial success: both imported results and any errors
 */
export const importAllMeetingNotes = (
  config: VaultCommanderConfig,
  sourcePath: string,
  archiveAfterImport = true
): BulkMeetingImportResult => {
  const notes = listMeetingNotes(sourcePath)
  const results: MeetingImportResult[] = []
  const errors: Array<{ note: MeetingNoteFile; error: Error }> = []

  for (const note of notes) {
    try {
      results.push(importMeetingNote(config, note, archiveAfterImport))
    } catch (error) {
      errors.push({ note, error: error as Error })
    }
  }

  return { results, errors }
}

/**
 * Get count of pending meeting notes
 */
export const getPendingMeetingCount = (sourcePath: string): number =>
  listMeetingNotes(sourcePath).length
