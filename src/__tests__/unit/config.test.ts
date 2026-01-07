import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SECTIONS, expandPath, getConfig, getVaultName } from '../../lib/config'
import type { AbsolutePath } from '../../types'

describe('config', () => {
  describe('expandPath', () => {
    it('should expand ~ to home directory', () => {
      const result = expandPath('~/Documents/vault')
      expect(result).not.toContain('~')
      expect(result).toMatch(/^\//)
    })

    it('should resolve relative paths to absolute', () => {
      const result = expandPath('vault')
      expect(result).toMatch(/^\//)
    })

    it('should keep absolute paths unchanged', () => {
      const result = expandPath('/Users/test/vault')
      expect(result).toBe('/Users/test/vault')
    })

    it('should return AbsolutePath branded type', () => {
      const result: AbsolutePath = expandPath('~/vault')
      expect(typeof result).toBe('string')
    })
  })

  describe('getVaultName', () => {
    it('should extract vault name from path', () => {
      expect(getVaultName('/Users/test/vault')).toBe('vault')
    })

    it('should handle paths with trailing slash', () => {
      expect(getVaultName('/Users/test/my-vault/')).toBe('my-vault')
    })

    it('should return "vault" as fallback for edge cases', () => {
      expect(getVaultName('')).toBe('vault')
    })
  })

  describe('DEFAULT_SECTIONS', () => {
    it('should have all 7 sections', () => {
      const sections = Object.keys(DEFAULT_SECTIONS)
      expect(sections).toHaveLength(7)
    })

    it('should have correct section headers', () => {
      expect(DEFAULT_SECTIONS.schedule).toBe('## Schedule')
      expect(DEFAULT_SECTIONS.tasks).toBe('## Tasks')
      expect(DEFAULT_SECTIONS.running).toBe('## Running')
      expect(DEFAULT_SECTIONS.meetingNotes).toBe('## Meeting Notes')
      expect(DEFAULT_SECTIONS.voiceNotes).toBe('## Voice Notes')
      expect(DEFAULT_SECTIONS.notes).toBe('## Notes')
      expect(DEFAULT_SECTIONS.eveningReview).toBe('## Evening Review')
    })

    it('should all be H2 headers', () => {
      for (const header of Object.values(DEFAULT_SECTIONS)) {
        expect(header).toMatch(/^## /)
      }
    })
  })

  describe('getConfig', () => {
    beforeEach(() => {
      vi.resetAllMocks()
    })

    it('should return config with all required fields', () => {
      const config = getConfig()

      expect(config).toHaveProperty('vaultPath')
      expect(config).toHaveProperty('dailyNotePath')
      expect(config).toHaveProperty('dailyNoteFormat')
      expect(config).toHaveProperty('inboxPath')
      expect(config).toHaveProperty('sections')
    })

    it('should have correct default values', () => {
      const config = getConfig()

      expect(config.dailyNotePath).toBe('Journal/Daily')
      expect(config.dailyNoteFormat).toBe('YYYY-MM-DD-ddd')
      expect(config.inboxPath).toBe('Inbox')
    })

    it('should include all sections', () => {
      const config = getConfig()

      expect(config.sections).toEqual(DEFAULT_SECTIONS)
    })
  })
})
