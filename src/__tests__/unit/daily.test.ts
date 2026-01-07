import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'
import { DEFAULT_SECTIONS } from '../../lib/config'
import {
  formatDailyNoteDate,
  getDailyNoteInfo,
  getDailyNoteLink,
  getDailyNotePath,
  getDailyNoteRelativePath,
  getDailyNoteTemplate,
  getTimestamp,
} from '../../lib/daily'
import type { AbsolutePath, RelativePath, VaultCommanderConfig, WikiLink } from '../../types'

const createTestConfig = (overrides?: Partial<VaultCommanderConfig>): VaultCommanderConfig => ({
  vaultPath: '/Users/test/vault' as AbsolutePath,
  dailyNotePath: 'Journal/Daily' as RelativePath,
  dailyNoteFormat: 'YYYY-MM-DD-ddd',
  inboxPath: 'Inbox' as RelativePath,
  sections: DEFAULT_SECTIONS,
  ...overrides,
})

describe('daily', () => {
  // Fixed test date: January 15, 2026 at 2:35pm
  const testDate = dayjs('2026-01-15 14:35:00')

  describe('getDailyNoteTemplate', () => {
    it('should return template with all 7 sections', () => {
      const template = getDailyNoteTemplate()
      const sections = [
        '## Schedule',
        '## Tasks',
        '## Running',
        '## Meeting Notes',
        '## Voice Notes',
        '## Notes',
        '## Evening Review',
      ]

      for (const section of sections) {
        expect(template).toContain(section)
      }
    })

    it('should have sections separated by blank lines', () => {
      const template = getDailyNoteTemplate()
      // Each section should end with blank line before next section
      expect(template.split('\n\n').length).toBeGreaterThanOrEqual(7)
    })
  })

  describe('formatDailyNoteDate', () => {
    it('should format date with default format', () => {
      const result = formatDailyNoteDate(testDate)
      expect(result).toBe('2026-01-15-Thu')
    })

    it('should use custom format', () => {
      const result = formatDailyNoteDate(testDate, 'YYYY-MM-DD')
      expect(result).toBe('2026-01-15')
    })

    it('should work with Date object', () => {
      // Use explicit time to avoid timezone shifts
      const date = new Date('2026-01-15T12:00:00')
      const result = formatDailyNoteDate(date, 'YYYY-MM-DD')
      expect(result).toBe('2026-01-15')
    })
  })

  describe('getDailyNoteLink', () => {
    it('should return wikilink format', () => {
      const result = getDailyNoteLink(testDate)
      expect(result).toBe('[[2026-01-15-Thu]]')
    })

    it('should return WikiLink type', () => {
      const result: WikiLink = getDailyNoteLink(testDate)
      expect(result).toMatch(/^\[\[.*\]\]$/)
    })
  })

  describe('getTimestamp', () => {
    it('should format timestamp as h:mma', () => {
      const result = getTimestamp(testDate)
      expect(result).toBe('2:35pm')
    })

    it('should handle AM times', () => {
      const amDate = dayjs('2026-01-15 09:15:00')
      expect(getTimestamp(amDate)).toBe('9:15am')
    })

    it('should handle midnight', () => {
      const midnight = dayjs('2026-01-15 00:00:00')
      expect(getTimestamp(midnight)).toBe('12:00am')
    })

    it('should handle noon', () => {
      const noon = dayjs('2026-01-15 12:00:00')
      expect(getTimestamp(noon)).toBe('12:00pm')
    })
  })

  describe('getDailyNotePath', () => {
    it('should construct full path', () => {
      const config = createTestConfig()
      const result = getDailyNotePath(config, testDate)

      expect(result).toBe('/Users/test/vault/Journal/Daily/2026-01-15-Thu.md')
    })

    it('should use config dailyNoteFormat', () => {
      const config = createTestConfig({ dailyNoteFormat: 'YYYY-MM-DD' })
      const result = getDailyNotePath(config, testDate)

      expect(result).toBe('/Users/test/vault/Journal/Daily/2026-01-15.md')
    })
  })

  describe('getDailyNoteInfo', () => {
    it('should return daily note metadata', () => {
      const config = createTestConfig()
      const result = getDailyNoteInfo(config, testDate)

      expect(result).toEqual({
        dateString: '2026-01-15-Thu',
        path: '/Users/test/vault/Journal/Daily/2026-01-15-Thu.md',
        exists: false, // File doesn't exist in test
      })
    })
  })

  describe('getDailyNoteRelativePath', () => {
    it('should return path without .md extension', () => {
      const config = createTestConfig()
      const result = getDailyNoteRelativePath(config, testDate)

      expect(result).toBe('Journal/Daily/2026-01-15-Thu')
    })

    it('should be suitable for Obsidian URI', () => {
      const config = createTestConfig()
      const result = getDailyNoteRelativePath(config, testDate)

      // Should not have .md extension (Obsidian adds it)
      expect(result).not.toContain('.md')
    })
  })
})
