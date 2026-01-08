/**
 * Meeting module tests
 *
 * Tests for meeting notes import functionality.
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import dayjs from 'dayjs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SECTIONS } from '../../lib/config'
import {
  formatMeetingContent,
  getPendingMeetingCount,
  importAllMeetingNotes,
  importMeetingNote,
  listMeetingNotes,
} from '../../lib/meeting'
import type { AbsolutePath, RelativePath, VaultCommanderConfig } from '../../types'

describe('meeting', () => {
  let testDir: string
  let vaultDir: string
  let meetingDir: string
  let mockConfig: VaultCommanderConfig

  beforeEach(() => {
    testDir = join(tmpdir(), `vault-commander-meeting-test-${Date.now()}`)
    vaultDir = join(testDir, 'vault')
    meetingDir = join(testDir, 'meetings')

    mkdirSync(join(vaultDir, 'Inbox'), { recursive: true })
    mkdirSync(join(vaultDir, 'Journal', 'Daily'), { recursive: true })
    meetingDir = join(testDir, 'meetings')
    mkdirSync(meetingDir, { recursive: true })

    mockConfig = {
      vaultPath: vaultDir as AbsolutePath,
      dailyNotePath: 'Journal/Daily' as RelativePath,
      dailyNoteFormat: 'YYYY-MM-DD-ddd',
      inboxPath: 'Inbox' as RelativePath,
      sections: DEFAULT_SECTIONS,
      meetingPath: meetingDir as AbsolutePath,
    }
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('listMeetingNotes', () => {
    it('should list md and txt files', () => {
      writeFileSync(join(meetingDir, 'meeting1.md'), '# Team Standup\nNotes here')
      writeFileSync(join(meetingDir, 'meeting2.txt'), 'Client Call\nDiscussion points')
      writeFileSync(join(meetingDir, 'recording.wav'), 'audio data')

      const files = listMeetingNotes(meetingDir)

      expect(files).toHaveLength(2)
      expect(files.map((f) => f.filename)).toContain('meeting1.md')
      expect(files.map((f) => f.filename)).toContain('meeting2.txt')
    })

    it('should extract title from markdown header', () => {
      writeFileSync(join(meetingDir, 'test.md'), '# Sprint Planning\n\nAgenda items...')

      const files = listMeetingNotes(meetingDir)

      expect(files[0].title).toBe('Sprint Planning')
    })

    it('should extract title from first line if no header', () => {
      writeFileSync(join(meetingDir, 'test.txt'), 'Weekly Review\nNotes follow...')

      const files = listMeetingNotes(meetingDir)

      expect(files[0].title).toBe('Weekly Review')
    })

    it('should use filename if no clear title', () => {
      writeFileSync(join(meetingDir, 'notes.md'), `\n\n\n${'x'.repeat(200)}`)

      const files = listMeetingNotes(meetingDir)

      expect(files[0].title).toBe('notes')
    })

    it('should ignore hidden files', () => {
      writeFileSync(join(meetingDir, '.hidden.md'), 'Hidden')
      writeFileSync(join(meetingDir, 'visible.md'), 'Visible')

      const files = listMeetingNotes(meetingDir)

      expect(files).toHaveLength(1)
      expect(files[0].filename).toBe('visible.md')
    })

    it('should return empty array for non-existent directory', () => {
      const files = listMeetingNotes('/nonexistent')
      expect(files).toEqual([])
    })
  })

  describe('formatMeetingContent', () => {
    it('should format with title and timestamp', () => {
      const note = {
        filename: 'test.md',
        path: '/path/test.md',
        content: 'Meeting notes content',
        timestamp: new Date('2026-01-07T14:30:00'),
        title: 'Team Standup',
      }

      const formatted = formatMeetingContent(note, mockConfig)

      expect(formatted).toContain('### Team Standup')
      expect(formatted).toContain('Meeting notes content')
      expect(formatted).toMatch(/\d{1,2}:\d{2}(am|pm)/)
    })
  })

  describe('importMeetingNote', () => {
    it('should append to Meeting Notes section in daily note', () => {
      // Create daily note with Meeting Notes section
      const today = dayjs().format('YYYY-MM-DD-ddd')
      const dailyNotePath = join(vaultDir, 'Journal', 'Daily', `${today}.md`)
      const template = `# ${today}\n\n## Schedule\n\n## Tasks\n\n## Running\n\n## Meeting Notes\n\n## Voice Notes\n\n## Notes\n\n## Evening Review\n`
      writeFileSync(dailyNotePath, template)

      // Create meeting note
      writeFileSync(join(meetingDir, 'standup.md'), '# Team Standup\n\nAttendees: Alice, Bob')

      const meetings = listMeetingNotes(meetingDir)
      const result = importMeetingNote(mockConfig, meetings[0])

      // Check content was appended
      const dailyContent = readFileSync(dailyNotePath, 'utf-8')
      expect(dailyContent).toContain('### Team Standup')
      expect(dailyContent).toContain('Attendees: Alice, Bob')

      // Check source was archived
      expect(existsSync(join(meetingDir, 'standup.md'))).toBe(false)
      expect(existsSync(join(meetingDir, '.imported-standup.md'))).toBe(true)
    })

    it('should not archive when archiveAfterImport is false', () => {
      const today = dayjs().format('YYYY-MM-DD-ddd')
      const dailyNotePath = join(vaultDir, 'Journal', 'Daily', `${today}.md`)
      const template = `# ${today}\n\n## Meeting Notes\n\n## Notes\n`
      writeFileSync(dailyNotePath, template)
      writeFileSync(join(meetingDir, 'test.md'), 'Test content')

      const meetings = listMeetingNotes(meetingDir)
      importMeetingNote(mockConfig, meetings[0], false)

      expect(existsSync(join(meetingDir, 'test.md'))).toBe(true)
    })
  })

  describe('importAllMeetingNotes', () => {
    it('should import all pending meeting notes', () => {
      const today = dayjs().format('YYYY-MM-DD-ddd')
      const dailyNotePath = join(vaultDir, 'Journal', 'Daily', `${today}.md`)
      const template = `# ${today}\n\n## Meeting Notes\n\n## Notes\n`
      writeFileSync(dailyNotePath, template)

      writeFileSync(join(meetingDir, 'meeting1.md'), '# First\nContent 1')
      writeFileSync(join(meetingDir, 'meeting2.md'), '# Second\nContent 2')

      const results = importAllMeetingNotes(mockConfig, meetingDir)

      expect(results).toHaveLength(2)

      // Both should be archived
      expect(existsSync(join(meetingDir, 'meeting1.md'))).toBe(false)
      expect(existsSync(join(meetingDir, 'meeting2.md'))).toBe(false)
      expect(existsSync(join(meetingDir, '.imported-meeting1.md'))).toBe(true)
      expect(existsSync(join(meetingDir, '.imported-meeting2.md'))).toBe(true)
    })

    it('should return empty array when no meeting notes', () => {
      const results = importAllMeetingNotes(mockConfig, meetingDir)
      expect(results).toEqual([])
    })
  })

  describe('getPendingMeetingCount', () => {
    it('should return count of pending meeting notes', () => {
      writeFileSync(join(meetingDir, 'a.md'), 'A')
      writeFileSync(join(meetingDir, 'b.md'), 'B')
      writeFileSync(join(meetingDir, '.imported-c.md'), 'C')

      const count = getPendingMeetingCount(meetingDir)
      expect(count).toBe(2)
    })

    it('should return 0 for empty directory', () => {
      const count = getPendingMeetingCount(meetingDir)
      expect(count).toBe(0)
    })
  })
})
