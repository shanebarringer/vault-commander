/**
 * Daily note utilities for Vault Commander
 *
 * Handles daily note path generation, template creation, and date formatting.
 * Template is exported separately for Phase 5 composability.
 *
 * @module daily
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import dayjs, { type Dayjs } from 'dayjs'
import type { DailyNote, VaultCommanderConfig, WikiLink } from '../types'

/**
 * Daily note template with all 7 sections.
 *
 * Exported separately from creation for Phase 5's vault brief/review
 * commands to compose custom daily note content.
 */
export const getDailyNoteTemplate = (): string => `## Schedule

## Tasks

## Running

## Meeting Notes

## Voice Notes

## Notes

## Evening Review
`

/**
 * Format a date for daily note filename
 */
export const formatDailyNoteDate = (
  date: Date | Dayjs = dayjs(),
  format = 'YYYY-MM-DD-ddd'
): string => dayjs(date).format(format)

/**
 * Get wikilink for a date (for backlinks in captures)
 */
export const getDailyNoteLink = (
  date: Date | Dayjs = dayjs(),
  format = 'YYYY-MM-DD-ddd'
): WikiLink => `[[${formatDailyNoteDate(date, format)}]]`

/**
 * Format timestamp for captures (e.g., "2:35pm")
 */
export const getTimestamp = (date: Date | Dayjs = dayjs()): string => dayjs(date).format('h:mma')

/**
 * Get full path to a daily note
 */
export const getDailyNotePath = (
  config: VaultCommanderConfig,
  date: Date | Dayjs = dayjs()
): string => {
  const dateString = formatDailyNoteDate(date, config.dailyNoteFormat)
  return join(config.vaultPath, config.dailyNotePath, `${dateString}.md`)
}

/**
 * Get daily note metadata including existence check
 */
export const getDailyNoteInfo = (
  config: VaultCommanderConfig,
  date: Date | Dayjs = dayjs()
): DailyNote => {
  const dateString = formatDailyNoteDate(date, config.dailyNoteFormat)
  const path = getDailyNotePath(config, date)

  return {
    dateString,
    path,
    exists: existsSync(path),
  }
}

/**
 * Get the relative path for Obsidian URI (without .md extension)
 */
export const getDailyNoteRelativePath = (
  config: VaultCommanderConfig,
  date: Date | Dayjs = dayjs()
): string => {
  const dateString = formatDailyNoteDate(date, config.dailyNoteFormat)
  return `${config.dailyNotePath}/${dateString}`
}
