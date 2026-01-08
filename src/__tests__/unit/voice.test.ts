/**
 * Voice module tests
 *
 * Tests for voice transcription import functionality.
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import dayjs from 'dayjs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  generateVoiceNoteFilename,
  getPendingCount,
  importAllTranscriptions,
  importTranscription,
  listTranscriptions,
} from '../../lib/voice'
import type { AbsolutePath, RelativePath, VaultCommanderConfig } from '../../types'

describe('voice', () => {
  let testDir: string
  let vaultDir: string
  let voiceDir: string
  let mockConfig: VaultCommanderConfig

  beforeEach(() => {
    testDir = join(tmpdir(), `vault-commander-voice-test-${Date.now()}`)
    vaultDir = join(testDir, 'vault')
    voiceDir = join(testDir, 'voice')

    mkdirSync(join(vaultDir, 'Inbox'), { recursive: true })
    mkdirSync(voiceDir, { recursive: true })

    mockConfig = {
      vaultPath: vaultDir as AbsolutePath,
      dailyNotePath: 'Journal/Daily' as RelativePath,
      dailyNoteFormat: 'YYYY-MM-DD-ddd',
      inboxPath: 'Inbox' as RelativePath,
      sections: {
        schedule: '## Schedule',
        tasks: '## Tasks',
        running: '## Running',
        meetingNotes: '## Meeting Notes',
        voiceNotes: '## Voice Notes',
        notes: '## Notes',
        eveningReview: '## Evening Review',
      },
      voicePath: voiceDir as AbsolutePath,
    }
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('generateVoiceNoteFilename', () => {
    it('should generate filename with voice prefix', () => {
      const date = dayjs('2026-01-07 10:30:45')
      const filename = generateVoiceNoteFilename(date)
      expect(filename).toBe('voice-2026-01-07-103045.md')
    })

    it('should use current date when no date provided', () => {
      const filename = generateVoiceNoteFilename()
      expect(filename).toMatch(/^voice-\d{4}-\d{2}-\d{2}-\d{6}\.md$/)
    })
  })

  describe('listTranscriptions', () => {
    it('should list txt and md files', () => {
      writeFileSync(join(voiceDir, 'note1.txt'), 'First transcription')
      writeFileSync(join(voiceDir, 'note2.md'), 'Second transcription')
      writeFileSync(join(voiceDir, 'note3.wav'), 'Not a transcription')

      const files = listTranscriptions(voiceDir)

      expect(files).toHaveLength(2)
      expect(files.map((f) => f.filename)).toContain('note1.txt')
      expect(files.map((f) => f.filename)).toContain('note2.md')
    })

    it('should ignore hidden files', () => {
      writeFileSync(join(voiceDir, '.hidden.txt'), 'Hidden file')
      writeFileSync(join(voiceDir, 'visible.txt'), 'Visible file')

      const files = listTranscriptions(voiceDir)

      expect(files).toHaveLength(1)
      expect(files[0].filename).toBe('visible.txt')
    })

    it('should ignore imported files (prefixed with .imported-)', () => {
      writeFileSync(join(voiceDir, '.imported-old.txt'), 'Already imported')
      writeFileSync(join(voiceDir, 'new.txt'), 'New transcription')

      const files = listTranscriptions(voiceDir)

      expect(files).toHaveLength(1)
      expect(files[0].filename).toBe('new.txt')
    })

    it('should return empty array for non-existent directory', () => {
      const files = listTranscriptions('/nonexistent')
      expect(files).toEqual([])
    })

    it('should include file content', () => {
      writeFileSync(join(voiceDir, 'test.txt'), 'Test transcription content')

      const files = listTranscriptions(voiceDir)

      expect(files[0].content).toBe('Test transcription content')
    })
  })

  describe('importTranscription', () => {
    it('should create vault note with proper format', () => {
      const transcriptionContent = 'This is my voice note content'
      writeFileSync(join(voiceDir, 'test.txt'), transcriptionContent)

      const transcriptions = listTranscriptions(voiceDir)
      const result = importTranscription(mockConfig, transcriptions[0])

      expect(result.noteFilename).toMatch(/^voice-\d{4}-\d{2}-\d{2}-\d{6}\.md$/)

      // Check the created file
      const createdContent = readFileSync(result.notePath, 'utf-8')
      expect(createdContent).toContain('(voice)')
      expect(createdContent).toContain(transcriptionContent)
      expect(createdContent).toContain('[[')
    })

    it('should archive source file after import', () => {
      writeFileSync(join(voiceDir, 'test.txt'), 'Content')

      const transcriptions = listTranscriptions(voiceDir)
      importTranscription(mockConfig, transcriptions[0])

      // Original file should be renamed
      expect(existsSync(join(voiceDir, 'test.txt'))).toBe(false)
      expect(existsSync(join(voiceDir, '.imported-test.txt'))).toBe(true)
    })

    it('should not archive when archiveAfterImport is false', () => {
      writeFileSync(join(voiceDir, 'test.txt'), 'Content')

      const transcriptions = listTranscriptions(voiceDir)
      importTranscription(mockConfig, transcriptions[0], false)

      // Original file should still exist
      expect(existsSync(join(voiceDir, 'test.txt'))).toBe(true)
    })
  })

  describe('importAllTranscriptions', () => {
    it('should import all pending transcriptions', () => {
      writeFileSync(join(voiceDir, 'note1.txt'), 'First note')
      writeFileSync(join(voiceDir, 'note2.txt'), 'Second note')
      writeFileSync(join(voiceDir, 'note3.txt'), 'Third note')

      const { results, errors } = importAllTranscriptions(mockConfig, voiceDir)

      expect(results).toHaveLength(3)
      expect(errors).toHaveLength(0)

      // All originals should be archived
      expect(existsSync(join(voiceDir, 'note1.txt'))).toBe(false)
      expect(existsSync(join(voiceDir, 'note2.txt'))).toBe(false)
      expect(existsSync(join(voiceDir, 'note3.txt'))).toBe(false)

      // All should have .imported- prefix
      expect(existsSync(join(voiceDir, '.imported-note1.txt'))).toBe(true)
      expect(existsSync(join(voiceDir, '.imported-note2.txt'))).toBe(true)
      expect(existsSync(join(voiceDir, '.imported-note3.txt'))).toBe(true)
    })

    it('should return empty results when no transcriptions', () => {
      const { results, errors } = importAllTranscriptions(mockConfig, voiceDir)
      expect(results).toEqual([])
      expect(errors).toEqual([])
    })
  })

  describe('getPendingCount', () => {
    it('should return count of pending transcriptions', () => {
      writeFileSync(join(voiceDir, 'a.txt'), 'A')
      writeFileSync(join(voiceDir, 'b.txt'), 'B')
      writeFileSync(join(voiceDir, '.imported-c.txt'), 'C')

      const count = getPendingCount(voiceDir)
      expect(count).toBe(2)
    })

    it('should return 0 for empty directory', () => {
      const count = getPendingCount(voiceDir)
      expect(count).toBe(0)
    })
  })
})
