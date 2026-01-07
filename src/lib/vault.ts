/**
 * Vault file operations for Vault Commander
 *
 * Generic file operations designed for reuse across phases:
 * - Phase 1: Capture, daily notes, section append
 * - Phase 4: Voice capture will reuse writeFile, ensureDirectory
 *
 * @module vault
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { open } from '@raycast/api'
import dayjs, { type Dayjs } from 'dayjs'
import type { CaptureNote, VaultCommanderConfig } from '../types'
import { getVaultName } from './config'
import { getDailyNoteLink, getDailyNotePath, getDailyNoteTemplate, getTimestamp } from './daily'

/**
 * Ensure a directory exists, creating it recursively if needed
 */
export const ensureDirectory = (dirPath: string): void => {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true })
  }
}

/**
 * Write content to a file, creating parent directories if needed
 */
export const writeFile = (filePath: string, content: string): void => {
  ensureDirectory(dirname(filePath))
  writeFileSync(filePath, content, 'utf-8')
}

/**
 * Read file content as string
 */
export const readFile = (filePath: string): string => readFileSync(filePath, 'utf-8')

/**
 * Check if a file exists
 */
export const fileExists = (filePath: string): boolean => existsSync(filePath)

/**
 * Generate filename for a capture note
 */
export const generateCaptureFilename = (date: Date | Dayjs = dayjs()): string =>
  `capture-${dayjs(date).format('YYYY-MM-DD-HHmmss')}.md`

/**
 * Create an atomic capture note
 */
export const createCaptureNote = (
  config: VaultCommanderConfig,
  content: string,
  date: Date | Dayjs = dayjs()
): CaptureNote => {
  const filename = generateCaptureFilename(date)
  const path = join(config.vaultPath, config.inboxPath, filename)
  const dailyNoteLink = getDailyNoteLink(date, config.dailyNoteFormat)
  const timestamp = getTimestamp(date)

  // Format: [[YYYY-MM-DD-ddd]] - h:mma\n\nContent
  const noteContent = `${dailyNoteLink} - ${timestamp}\n\n${content}\n`

  writeFile(path, noteContent)

  return {
    filename,
    path,
    content: noteContent,
    dailyNoteLink,
    timestamp,
  }
}

/**
 * Ensure today's daily note exists, creating from template if needed
 */
export const ensureDailyNote = (
  config: VaultCommanderConfig,
  date: Date | Dayjs = dayjs()
): string => {
  const path = getDailyNotePath(config, date)

  if (!fileExists(path)) {
    const template = getDailyNoteTemplate()
    writeFile(path, template)
  }

  return path
}

/**
 * Append content below a section header in a file
 *
 * Finds the H2 header and inserts content directly below it,
 * before the next section or end of file.
 */
export const appendToSection = (filePath: string, sectionHeader: string, content: string): void => {
  const fileContent = readFile(filePath)
  const headerIndex = fileContent.indexOf(sectionHeader)

  if (headerIndex === -1) {
    throw new Error(`Section "${sectionHeader}" not found in file`)
  }

  // Find the end of the header line
  const afterHeader = headerIndex + sectionHeader.length
  let insertPoint = afterHeader

  // Find the newline after the header
  const nextNewline = fileContent.indexOf('\n', afterHeader)
  if (nextNewline !== -1) {
    insertPoint = nextNewline
  }

  // Insert content with proper newline
  const newContent = `${fileContent.slice(0, insertPoint)}\n${content}${fileContent.slice(insertPoint)}`

  writeFileSync(filePath, newContent, 'utf-8')
}

/**
 * Build Obsidian URI for opening a file
 */
export const buildObsidianUri = (vaultName: string, filePath: string): string =>
  `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(filePath)}`

/**
 * Open a file in Obsidian
 */
export const openInObsidian = async (vaultPath: string, relativePath: string): Promise<void> => {
  const vaultName = getVaultName(vaultPath)
  const uri = buildObsidianUri(vaultName, relativePath)
  await open(uri)
}

// Re-export commonly used functions from other modules for convenience
export { getConfig, getVaultName } from './config'
export { getDailyNotePath, getDailyNoteInfo, getDailyNoteRelativePath } from './daily'
