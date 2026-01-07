import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import dayjs from 'dayjs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SECTIONS } from '../../lib/config'
import {
  appendToSection,
  buildObsidianUri,
  createCaptureNote,
  ensureDailyNote,
  ensureDirectory,
  fileExists,
  generateCaptureFilename,
  readFile,
  writeFile,
} from '../../lib/vault'
import type { AbsolutePath, RelativePath, VaultCommanderConfig } from '../../types'

const createTestConfig = (vaultPath: string): VaultCommanderConfig => ({
  vaultPath: vaultPath as AbsolutePath,
  dailyNotePath: 'Journal/Daily' as RelativePath,
  dailyNoteFormat: 'YYYY-MM-DD-ddd',
  inboxPath: 'Inbox' as RelativePath,
  sections: DEFAULT_SECTIONS,
})

describe('vault', () => {
  let testDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `vault-commander-test-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('ensureDirectory', () => {
    it('should create directory if it does not exist', () => {
      const newDir = join(testDir, 'new-dir')
      ensureDirectory(newDir)
      expect(existsSync(newDir)).toBe(true)
    })

    it('should create nested directories recursively', () => {
      const nestedDir = join(testDir, 'a', 'b', 'c')
      ensureDirectory(nestedDir)
      expect(existsSync(nestedDir)).toBe(true)
    })

    it('should not error if directory already exists', () => {
      ensureDirectory(testDir)
      expect(existsSync(testDir)).toBe(true)
    })
  })

  describe('writeFile', () => {
    it('should write content to file', () => {
      const filePath = join(testDir, 'test.md')
      writeFile(filePath, 'Hello World')

      expect(readFileSync(filePath, 'utf-8')).toBe('Hello World')
    })

    it('should create parent directories if needed', () => {
      const filePath = join(testDir, 'nested', 'dir', 'test.md')
      writeFile(filePath, 'Content')

      expect(existsSync(filePath)).toBe(true)
    })
  })

  describe('readFile', () => {
    it('should read file content', () => {
      const filePath = join(testDir, 'test.md')
      writeFileSync(filePath, 'Test content', 'utf-8')

      expect(readFile(filePath)).toBe('Test content')
    })
  })

  describe('fileExists', () => {
    it('should return true for existing file', () => {
      const filePath = join(testDir, 'test.md')
      writeFileSync(filePath, 'Content', 'utf-8')

      expect(fileExists(filePath)).toBe(true)
    })

    it('should return false for non-existing file', () => {
      expect(fileExists(join(testDir, 'nonexistent.md'))).toBe(false)
    })
  })

  describe('generateCaptureFilename', () => {
    it('should generate filename with timestamp', () => {
      const date = dayjs('2026-01-15 14:35:42')
      const filename = generateCaptureFilename(date)

      expect(filename).toBe('capture-2026-01-15-143542.md')
    })

    it('should have .md extension', () => {
      const filename = generateCaptureFilename()
      expect(filename).toMatch(/\.md$/)
    })
  })

  describe('createCaptureNote', () => {
    it('should create note with backlink and timestamp', () => {
      const config = createTestConfig(testDir)
      const date = dayjs('2026-01-15 14:35:00')

      const result = createCaptureNote(config, 'My thought', date)

      expect(result.filename).toBe('capture-2026-01-15-143500.md')
      expect(result.path).toContain('Inbox')
      expect(result.dailyNoteLink).toBe('[[2026-01-15-Thu]]')
      expect(result.timestamp).toBe('2:35pm')
      expect(result.content).toContain('[[2026-01-15-Thu]] - 2:35pm')
      expect(result.content).toContain('My thought')
    })

    it('should actually write the file', () => {
      const config = createTestConfig(testDir)
      const date = dayjs('2026-01-15 14:35:00')

      const result = createCaptureNote(config, 'Test content', date)

      expect(existsSync(result.path)).toBe(true)
      expect(readFileSync(result.path, 'utf-8')).toContain('Test content')
    })
  })

  describe('ensureDailyNote', () => {
    it('should create daily note if not exists', () => {
      const config = createTestConfig(testDir)
      const date = dayjs('2026-01-15')

      const path = ensureDailyNote(config, date)

      expect(existsSync(path)).toBe(true)
      const content = readFileSync(path, 'utf-8')
      expect(content).toContain('## Schedule')
      expect(content).toContain('## Tasks')
    })

    it('should not overwrite existing daily note', () => {
      const config = createTestConfig(testDir)
      const date = dayjs('2026-01-15')

      // Create daily note directory and file
      const dailyDir = join(testDir, 'Journal', 'Daily')
      mkdirSync(dailyDir, { recursive: true })
      const notePath = join(dailyDir, '2026-01-15-Thu.md')
      writeFileSync(notePath, 'Existing content', 'utf-8')

      ensureDailyNote(config, date)

      // Should keep existing content
      expect(readFileSync(notePath, 'utf-8')).toBe('Existing content')
    })
  })

  describe('appendToSection', () => {
    const testContent = `## Schedule

## Tasks

## Notes
`

    it('should append content below section header', () => {
      const filePath = join(testDir, 'daily.md')
      writeFileSync(filePath, testContent, 'utf-8')

      appendToSection(filePath, '## Tasks', '- [ ] New task')

      const result = readFileSync(filePath, 'utf-8')
      expect(result).toContain('## Tasks\n- [ ] New task')
    })

    it('should throw if section not found', () => {
      const filePath = join(testDir, 'daily.md')
      writeFileSync(filePath, testContent, 'utf-8')

      expect(() => {
        appendToSection(filePath, '## NonExistent', 'content')
      }).toThrow('Section "## NonExistent" not found')
    })

    it('should preserve other sections', () => {
      const filePath = join(testDir, 'daily.md')
      writeFileSync(filePath, testContent, 'utf-8')

      appendToSection(filePath, '## Tasks', '- Task item')

      const result = readFileSync(filePath, 'utf-8')
      expect(result).toContain('## Schedule')
      expect(result).toContain('## Notes')
    })
  })

  describe('buildObsidianUri', () => {
    it('should build correct URI format', () => {
      const uri = buildObsidianUri('my-vault', 'Journal/Daily/2026-01-15')

      expect(uri).toBe('obsidian://open?vault=my-vault&file=Journal%2FDaily%2F2026-01-15')
    })

    it('should encode special characters', () => {
      const uri = buildObsidianUri('My Vault', 'Notes/Test & Demo')

      expect(uri).toContain(encodeURIComponent('My Vault'))
      expect(uri).toContain(encodeURIComponent('Notes/Test & Demo'))
    })
  })
})
