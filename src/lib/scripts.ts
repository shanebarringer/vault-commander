/**
 * Scripts module for Vault Commander
 *
 * Runs automation scripts from a configured folder.
 * Scripts are shell scripts (.sh) that perform vault maintenance
 * or automation tasks like cleanup, backup, or weekly review prep.
 *
 * @module scripts
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, extname, join } from 'node:path'

/**
 * Metadata for a script file
 */
export interface ScriptFile {
  /** Script filename without extension */
  readonly name: string
  /** Full path to the script */
  readonly path: string
  /** Description extracted from first comment line */
  readonly description: string
  /** File modified timestamp */
  readonly timestamp: Date
  /** Whether script is executable */
  readonly executable: boolean
}

/**
 * Result of running a script
 */
export interface ScriptResult {
  /** Whether the script succeeded (exit code 0) */
  readonly success: boolean
  /** Script output (stdout) */
  readonly output: string
  /** Error output (stderr) if failed */
  readonly error?: string
  /** Execution time in milliseconds */
  readonly duration: number
}

/**
 * Extract description from script file.
 * Looks for first line starting with # (after shebang).
 */
const extractDescription = (content: string): string => {
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    // Skip empty lines and shebang
    if (!trimmed || trimmed.startsWith('#!')) continue
    // Found a comment - extract description
    if (trimmed.startsWith('#')) {
      return trimmed.slice(1).trim()
    }
    // Hit non-comment line, stop searching
    break
  }

  return 'No description'
}

/**
 * Check if file is executable
 */
const isExecutable = (filePath: string): boolean => {
  try {
    const stats = statSync(filePath)
    // Check if any execute bit is set (owner, group, or other)
    return (stats.mode & 0o111) !== 0
  } catch {
    return false
  }
}

/**
 * List all shell scripts in the scripts folder.
 *
 * @param scriptsPath - Path to scripts folder
 * @returns Array of script metadata, sorted by name
 */
export const listScripts = (scriptsPath: string): ScriptFile[] => {
  if (!existsSync(scriptsPath)) {
    return []
  }

  try {
    const files = readdirSync(scriptsPath)

    return files
      .filter((file) => {
        const ext = extname(file).toLowerCase()
        // Include .sh files, exclude hidden files
        return (ext === '.sh' || ext === '') && !file.startsWith('.')
      })
      .map((file) => {
        const filePath = join(scriptsPath, file)
        const stats = statSync(filePath)

        // Only include regular files
        if (!stats.isFile()) return null

        const content = readFileSync(filePath, 'utf-8')
        const name = basename(file, extname(file))

        return {
          name,
          path: filePath,
          description: extractDescription(content),
          timestamp: stats.mtime,
          executable: isExecutable(filePath),
        }
      })
      .filter((script): script is ScriptFile => script !== null)
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch {
    return []
  }
}

/**
 * Run a script and capture output.
 * Uses execFileSync with bash as the command to avoid shell injection.
 *
 * @param script - Script to run
 * @param timeout - Max execution time in ms (default 30s)
 * @returns Result with output and success status
 */
export const runScript = (script: ScriptFile, timeout = 30000): ScriptResult => {
  const startTime = Date.now()

  try {
    // Use execFileSync with bash as command and script path as argument
    // This avoids shell injection since path is passed as argument, not interpolated
    const output = execFileSync('bash', [script.path], {
      timeout,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 1024 * 1024, // 1MB
    })

    return {
      success: true,
      output: output.trim(),
      duration: Date.now() - startTime,
    }
  } catch (error) {
    const duration = Date.now() - startTime
    const execError = error as { stdout?: string; stderr?: string; message: string }

    return {
      success: false,
      output: execError.stdout?.trim() || '',
      error: execError.stderr?.trim() || execError.message,
      duration,
    }
  }
}

/**
 * Get count of available scripts.
 *
 * @param scriptsPath - Path to scripts folder
 * @returns Number of scripts available
 */
export const getScriptCount = (scriptsPath: string): number => {
  return listScripts(scriptsPath).length
}
