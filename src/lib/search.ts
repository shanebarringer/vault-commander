/**
 * Search utilities for Vault Commander
 *
 * Builds fuse.js index from vault markdown files.
 * Index builder exported separately for Phase 2 Claude integration.
 *
 * @module search
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, join, relative } from 'node:path'
import Fuse from 'fuse.js'
import type { IndexEntry, SearchIndex, SearchResult } from '../types'

/** Max chars to index from each file */
const CONTENT_PREVIEW_LENGTH = 500

/** fuse.js configuration for fuzzy search */
const FUSE_OPTIONS: Fuse.IFuseOptions<IndexEntry> = {
  keys: [
    { name: 'filename', weight: 2 },
    { name: 'content', weight: 1 },
  ],
  threshold: 0.3,
  includeScore: true,
  ignoreLocation: true,
}

/**
 * Recursively find all markdown files in a directory
 */
const findMarkdownFiles = (dir: string, files: string[] = []): string[] => {
  const entries = readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)

    // Skip hidden files/directories
    if (entry.name.startsWith('.')) continue

    if (entry.isDirectory()) {
      findMarkdownFiles(fullPath, files)
    } else if (entry.name.endsWith('.md')) {
      files.push(fullPath)
    }
  }

  return files
}

/**
 * Read first N chars of a file for preview
 */
const getFilePreview = (filePath: string, maxLength: number = CONTENT_PREVIEW_LENGTH): string => {
  try {
    const content = readFileSync(filePath, 'utf-8')
    return content.slice(0, maxLength)
  } catch {
    return ''
  }
}

/**
 * Build search index from vault markdown files.
 *
 * Exported for Phase 2 Claude integration - `vault ask` will use this
 * to find relevant context before sending to Claude API.
 */
export const buildSearchIndex = (vaultPath: string): SearchIndex => {
  const files = findMarkdownFiles(vaultPath)

  return files.map((filePath) => ({
    path: filePath,
    filename: basename(filePath, '.md'),
    content: getFilePreview(filePath),
  }))
}

/**
 * Search vault using fuse.js fuzzy search
 */
export const searchVault = (index: SearchIndex, query: string): SearchResult[] => {
  if (!query.trim()) {
    // Return recent files when no query (sorted by mtime)
    return index
      .map((entry) => {
        try {
          const stat = statSync(entry.path)
          return { ...entry, mtime: stat.mtimeMs }
        } catch {
          return { ...entry, mtime: 0 }
        }
      })
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 50)
      .map((entry) => ({
        path: entry.path,
        filename: entry.filename,
        preview: entry.content.slice(0, 100),
        score: 0,
      }))
  }

  const fuse = new Fuse(index, FUSE_OPTIONS)
  const results = fuse.search(query)

  return results.slice(0, 50).map((result) => ({
    path: result.item.path,
    filename: result.item.filename,
    preview: result.item.content.slice(0, 100),
    score: result.score ?? 0,
  }))
}

/**
 * Get relative path from vault root (for Obsidian URI)
 */
export const getRelativeVaultPath = (vaultPath: string, filePath: string): string => {
  const rel = relative(vaultPath, filePath)
  // Remove .md extension for Obsidian URI
  return rel.replace(/\.md$/, '')
}

// Re-export types for convenience
export type { SearchIndex, SearchResult, IndexEntry } from '../types'
