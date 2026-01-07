import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildSearchIndex, getRelativeVaultPath, searchVault } from '../../lib/search'

describe('search', () => {
  let testDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `vault-search-test-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  const createTestFiles = () => {
    // Create some test markdown files
    writeFileSync(join(testDir, 'note1.md'), 'This is the first note about TypeScript', 'utf-8')
    writeFileSync(join(testDir, 'note2.md'), 'Second note covers JavaScript basics', 'utf-8')
    writeFileSync(join(testDir, 'readme.md'), 'Project readme with installation guide', 'utf-8')

    // Create nested directory
    mkdirSync(join(testDir, 'projects'), { recursive: true })
    writeFileSync(
      join(testDir, 'projects', 'vault-commander.md'),
      'Raycast extension for Obsidian',
      'utf-8'
    )

    // Hidden files should be ignored
    mkdirSync(join(testDir, '.hidden'), { recursive: true })
    writeFileSync(join(testDir, '.hidden', 'secret.md'), 'Hidden content', 'utf-8')
    writeFileSync(join(testDir, '.obsidian.md'), 'Should be ignored', 'utf-8')
  }

  describe('buildSearchIndex', () => {
    it('should index all markdown files', () => {
      createTestFiles()
      const index = buildSearchIndex(testDir)

      expect(index.length).toBe(4) // 4 visible .md files
    })

    it('should include filename without extension', () => {
      createTestFiles()
      const index = buildSearchIndex(testDir)

      const filenames = index.map((e) => e.filename)
      expect(filenames).toContain('note1')
      expect(filenames).toContain('note2')
      expect(filenames).toContain('readme')
      expect(filenames).toContain('vault-commander')
    })

    it('should include file content preview', () => {
      createTestFiles()
      const index = buildSearchIndex(testDir)

      const note1 = index.find((e) => e.filename === 'note1')
      expect(note1?.content).toContain('TypeScript')
    })

    it('should ignore hidden files and directories', () => {
      createTestFiles()
      const index = buildSearchIndex(testDir)

      const filenames = index.map((e) => e.filename)
      expect(filenames).not.toContain('secret')
      expect(filenames).not.toContain('.obsidian')
    })

    it('should include full path', () => {
      createTestFiles()
      const index = buildSearchIndex(testDir)

      const nested = index.find((e) => e.filename === 'vault-commander')
      expect(nested?.path).toContain('projects')
      expect(nested?.path).toContain('vault-commander.md')
    })
  })

  describe('searchVault', () => {
    it('should find files by filename match', () => {
      createTestFiles()
      const index = buildSearchIndex(testDir)
      const results = searchVault(index, 'note1')

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].filename).toBe('note1')
    })

    it('should find files by content match', () => {
      createTestFiles()
      const index = buildSearchIndex(testDir)
      const results = searchVault(index, 'TypeScript')

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].filename).toBe('note1')
    })

    it('should return fuzzy matches', () => {
      createTestFiles()
      const index = buildSearchIndex(testDir)
      const results = searchVault(index, 'javascript') // lowercase

      expect(results.length).toBeGreaterThan(0)
      const filenames = results.map((r) => r.filename)
      expect(filenames).toContain('note2')
    })

    it('should return recent files when query is empty', () => {
      createTestFiles()
      const index = buildSearchIndex(testDir)
      const results = searchVault(index, '')

      expect(results.length).toBeGreaterThan(0)
      // Should have score of 0 (no search)
      expect(results[0].score).toBe(0)
    })

    it('should limit results to 50', () => {
      // Create many files
      for (let i = 0; i < 100; i++) {
        writeFileSync(join(testDir, `note${i}.md`), `Content ${i}`, 'utf-8')
      }

      const index = buildSearchIndex(testDir)
      const results = searchVault(index, '')

      expect(results.length).toBeLessThanOrEqual(50)
    })

    it('should include preview in results', () => {
      createTestFiles()
      const index = buildSearchIndex(testDir)
      const results = searchVault(index, 'Raycast')

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].preview).toBeDefined()
      expect(results[0].preview.length).toBeLessThanOrEqual(100)
    })

    it('should include relevance score', () => {
      createTestFiles()
      const index = buildSearchIndex(testDir)
      const results = searchVault(index, 'TypeScript')

      expect(results[0].score).toBeDefined()
      expect(typeof results[0].score).toBe('number')
    })
  })

  describe('getRelativeVaultPath', () => {
    it('should return path relative to vault root', () => {
      const result = getRelativeVaultPath('/Users/test/vault', '/Users/test/vault/notes/test.md')
      expect(result).toBe('notes/test')
    })

    it('should remove .md extension', () => {
      const result = getRelativeVaultPath('/vault', '/vault/daily/2026-01-15.md')
      expect(result).toBe('daily/2026-01-15')
    })

    it('should handle root-level files', () => {
      const result = getRelativeVaultPath('/vault', '/vault/readme.md')
      expect(result).toBe('readme')
    })
  })
})
