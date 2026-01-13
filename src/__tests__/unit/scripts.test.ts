/**
 * Scripts module tests
 *
 * Tests for shell script listing and execution functionality.
 */

import { chmodSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getScriptCount, listScripts, runScript } from '../../lib/scripts'

describe('scripts', () => {
  let testDir: string
  let scriptsDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `vault-commander-scripts-test-${Date.now()}`)
    scriptsDir = join(testDir, 'scripts')
    mkdirSync(scriptsDir, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('listScripts', () => {
    it('should list .sh files', () => {
      writeFileSync(
        join(scriptsDir, 'cleanup.sh'),
        '#!/bin/bash\n# Clean up temp files\necho "done"'
      )
      writeFileSync(
        join(scriptsDir, 'backup.sh'),
        '#!/bin/bash\n# Backup vault\ntar -czf backup.tar.gz vault/'
      )

      const scripts = listScripts(scriptsDir)

      expect(scripts).toHaveLength(2)
      expect(scripts.map((s) => s.name)).toContain('cleanup')
      expect(scripts.map((s) => s.name)).toContain('backup')
    })

    it('should extract description from comment', () => {
      writeFileSync(
        join(scriptsDir, 'test.sh'),
        '#!/bin/bash\n# This is the description\necho "test"'
      )

      const scripts = listScripts(scriptsDir)

      expect(scripts[0].description).toBe('This is the description')
    })

    it('should use "No description" if no comment', () => {
      writeFileSync(join(scriptsDir, 'test.sh'), '#!/bin/bash\necho "test"')

      const scripts = listScripts(scriptsDir)

      expect(scripts[0].description).toBe('No description')
    })

    it('should skip shebang and find description', () => {
      writeFileSync(
        join(scriptsDir, 'test.sh'),
        '#!/usr/bin/env bash\n# The real description\necho "test"'
      )

      const scripts = listScripts(scriptsDir)

      expect(scripts[0].description).toBe('The real description')
    })

    it('should ignore hidden files', () => {
      writeFileSync(join(scriptsDir, '.hidden.sh'), '#!/bin/bash\n# Hidden\necho "hidden"')
      writeFileSync(join(scriptsDir, 'visible.sh'), '#!/bin/bash\n# Visible\necho "visible"')

      const scripts = listScripts(scriptsDir)

      expect(scripts).toHaveLength(1)
      expect(scripts[0].name).toBe('visible')
    })

    it('should return empty array for non-existent directory', () => {
      const scripts = listScripts('/nonexistent')
      expect(scripts).toEqual([])
    })

    it('should detect executable scripts', () => {
      const scriptPath = join(scriptsDir, 'exec.sh')
      writeFileSync(scriptPath, '#!/bin/bash\necho "test"')
      chmodSync(scriptPath, 0o755)

      const scripts = listScripts(scriptsDir)

      expect(scripts[0].executable).toBe(true)
    })

    it('should detect non-executable scripts', () => {
      const scriptPath = join(scriptsDir, 'noexec.sh')
      writeFileSync(scriptPath, '#!/bin/bash\necho "test"')
      chmodSync(scriptPath, 0o644)

      const scripts = listScripts(scriptsDir)

      expect(scripts[0].executable).toBe(false)
    })

    it('should sort scripts by name', () => {
      writeFileSync(join(scriptsDir, 'zebra.sh'), '#!/bin/bash\necho "z"')
      writeFileSync(join(scriptsDir, 'alpha.sh'), '#!/bin/bash\necho "a"')
      writeFileSync(join(scriptsDir, 'beta.sh'), '#!/bin/bash\necho "b"')

      const scripts = listScripts(scriptsDir)

      expect(scripts.map((s) => s.name)).toEqual(['alpha', 'beta', 'zebra'])
    })
  })

  describe('runScript', () => {
    it('should run script and capture output', () => {
      const scriptPath = join(scriptsDir, 'hello.sh')
      writeFileSync(scriptPath, '#!/bin/bash\necho "Hello World"')
      chmodSync(scriptPath, 0o755)

      const scripts = listScripts(scriptsDir)
      const result = runScript(scripts[0])

      expect(result.success).toBe(true)
      expect(result.output).toBe('Hello World')
      expect(result.duration).toBeGreaterThan(0)
    })

    it('should capture error output on failure', () => {
      const scriptPath = join(scriptsDir, 'fail.sh')
      writeFileSync(scriptPath, '#!/bin/bash\necho "error message" >&2\nexit 1')
      chmodSync(scriptPath, 0o755)

      const scripts = listScripts(scriptsDir)
      const result = runScript(scripts[0])

      expect(result.success).toBe(false)
      expect(result.error).toContain('error message')
    })

    it('should handle script timeout', () => {
      const scriptPath = join(scriptsDir, 'slow.sh')
      writeFileSync(scriptPath, '#!/bin/bash\nsleep 10')
      chmodSync(scriptPath, 0o755)

      const scripts = listScripts(scriptsDir)
      const result = runScript(scripts[0], 100) // 100ms timeout

      expect(result.success).toBe(false)
      expect(result.error).toContain('TIMEDOUT')
    })
  })

  describe('getScriptCount', () => {
    it('should return count of scripts', () => {
      writeFileSync(join(scriptsDir, 'a.sh'), '#!/bin/bash\necho "a"')
      writeFileSync(join(scriptsDir, 'b.sh'), '#!/bin/bash\necho "b"')
      writeFileSync(join(scriptsDir, '.hidden.sh'), '#!/bin/bash\necho "hidden"')

      const count = getScriptCount(scriptsDir)
      expect(count).toBe(2)
    })

    it('should return 0 for empty directory', () => {
      const count = getScriptCount(scriptsDir)
      expect(count).toBe(0)
    })
  })
})
