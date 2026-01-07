/**
 * Shared search index hook for Vault Commander
 *
 * Provides cached search index building with loading and error states.
 * Used by ask, summarize, and reflect commands to avoid duplicated
 * index-building logic and enable index reuse across commands.
 *
 * @module hooks/useSearchIndex
 */

import { Toast, showToast } from '@raycast/api'
import { useCallback, useEffect, useRef, useState } from 'react'
import { buildSearchIndex } from '../lib/search'
import type { SearchIndex } from '../types'

/** Cache entry with index and metadata */
interface CacheEntry {
  index: SearchIndex
  vaultPath: string
  timestamp: number
}

/** Cache TTL - 5 minutes (index doesn't change that often during a session) */
const CACHE_TTL_MS = 5 * 60 * 1000

/** Module-level cache for index reuse across command instances */
let indexCache: CacheEntry | null = null

/**
 * Check if cached index is still valid
 */
const isCacheValid = (vaultPath: string): boolean => {
  if (!indexCache) return false
  if (indexCache.vaultPath !== vaultPath) return false
  if (Date.now() - indexCache.timestamp > CACHE_TTL_MS) return false
  return true
}

/**
 * Result type for useSearchIndex hook
 */
export interface UseSearchIndexResult {
  /** The search index (null while loading or on error) */
  index: SearchIndex | null
  /** Whether the index is currently being built */
  isIndexing: boolean
  /** Error message if indexing failed */
  error: string | null
  /** Force rebuild the index (invalidates cache) */
  refresh: () => Promise<void>
}

/**
 * Hook for building and caching the vault search index
 *
 * Features:
 * - In-memory cache keyed by vaultPath
 * - Automatic cache invalidation after TTL
 * - Loading toast while building (for large vaults)
 * - Error handling with toast notifications
 * - Refresh function to force rebuild
 *
 * @param vaultPath - Path to the Obsidian vault
 * @returns Search index, loading state, error, and refresh function
 *
 * @example
 * ```tsx
 * const config = getConfig()
 * const { index, isIndexing, error, refresh } = useSearchIndex(config?.vaultPath)
 *
 * if (isIndexing) return <List isLoading />
 * if (error) return <List><List.EmptyView title="Error" description={error} /></List>
 * // Use index...
 * ```
 */
export const useSearchIndex = (vaultPath: string | undefined): UseSearchIndexResult => {
  const [index, setIndex] = useState<SearchIndex | null>(null)
  const [isIndexing, setIsIndexing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const buildInProgress = useRef(false)

  const buildIndex = useCallback(async (forceFresh = false) => {
    if (!vaultPath) {
      setIsIndexing(false)
      return
    }

    // Check cache first (unless force refresh)
    if (!forceFresh && isCacheValid(vaultPath) && indexCache) {
      setIndex(indexCache.index)
      setIsIndexing(false)
      return
    }

    // Prevent duplicate builds
    if (buildInProgress.current) return
    buildInProgress.current = true

    setIsIndexing(true)
    setError(null)

    // Show loading toast for large vault indication
    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: 'Indexing vault...',
    })

    // Use setTimeout to defer heavy work and let UI render first
    await new Promise<void>((resolve) => {
      setTimeout(async () => {
        try {
          const searchIndex = buildSearchIndex(vaultPath)

          // Update cache
          indexCache = {
            index: searchIndex,
            vaultPath,
            timestamp: Date.now(),
          }

          setIndex(searchIndex)
          loadingToast.hide()
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Unknown error'
          setError(message)
          await showToast({
            style: Toast.Style.Failure,
            title: 'Failed to index vault',
            message,
          })
        } finally {
          setIsIndexing(false)
          buildInProgress.current = false
          resolve()
        }
      }, 0)
    })
  }, [vaultPath])

  // Build index on mount or when vaultPath changes
  useEffect(() => {
    buildIndex()
  }, [buildIndex])

  const refresh = useCallback(async () => {
    await buildIndex(true)
  }, [buildIndex])

  return { index, isIndexing, error, refresh }
}

/**
 * Invalidate the search index cache
 *
 * Call this when you know the vault has changed (e.g., after creating a note)
 */
export const invalidateIndexCache = (): void => {
  indexCache = null
}
